import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchNearbyPlaces } from '../services/places';
import { EMPTY_FILTERS } from '../services/searchFilters';
import { RequestStatus } from './useApiRequest';
import useProximitySearch, {
  CURRENT_LOCATION_LABEL,
  DEFAULT_RADIUS_KM,
  RADIUS_DEBOUNCE_MS,
} from './useProximitySearch';

vi.mock('../services/places', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchNearbyPlaces: vi.fn(),
}));

const MASP = { label: 'MASP', position: [-23.5614, -46.6559] };
const FAR = { id: 'longe', name: 'Longe', position: [-23.58, -46.66], badges: {} };
const NEAR = { id: 'perto', name: 'Perto', position: [-23.562, -46.656], badges: {} };

const flush = (ms = RADIUS_DEBOUNCE_MS) => act(() => vi.advanceTimersByTimeAsync(ms));

describe('useProximitySearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchNearbyPlaces.mockReset();
    fetchNearbyPlaces.mockResolvedValue([FAR, NEAR]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('fica ocioso, sem consultar, até haver um ponto de referência', () => {
    const { result } = renderHook(() => useProximitySearch());
    expect(result.current.origin).toBeNull();
    expect(result.current.radiusKm).toBe(DEFAULT_RADIUS_KM);
    expect(result.current.nearby.status).toBe(RequestStatus.IDLE);
    expect(fetchNearbyPlaces).not.toHaveBeenCalled();
  });

  it('consulta em volta do endereço escolhido e ordena pela distância', async () => {
    const { result } = renderHook(() => useProximitySearch());
    act(() => result.current.setOrigin(MASP));
    expect(result.current.nearby.status).toBe(RequestStatus.LOADING);
    await flush(0);

    expect(fetchNearbyPlaces.mock.calls[0][0]).toEqual({
      lat: -23.5614,
      lng: -46.6559,
      radiusKm: DEFAULT_RADIUS_KM,
    });
    expect(result.current.origin).toEqual({ ...MASP, source: 'address' });
    expect(result.current.nearby.status).toBe(RequestStatus.SUCCESS);
    expect(result.current.nearby.places.map((place) => place.id)).toEqual(['perto', 'longe']);
    expect(result.current.nearby.places[0].distanceKm).toBeLessThan(0.1);
  });

  it('espera o usuário parar de mexer no raio antes de consultar de novo', async () => {
    const { result } = renderHook(() => useProximitySearch());
    act(() => result.current.setOrigin(MASP));
    await flush(0);
    act(() => result.current.setRadiusKm(3));
    act(() => result.current.setRadiusKm(5));
    await flush(RADIUS_DEBOUNCE_MS - 1);
    expect(fetchNearbyPlaces).toHaveBeenCalledOnce();

    await flush(1);
    expect(fetchNearbyPlaces).toHaveBeenCalledTimes(2);
    expect(fetchNearbyPlaces.mock.calls[1][0].radiusKm).toBe(5);
    expect(result.current.searchedRadiusKm).toBe(5);
  });

  it('mantém os espaços na tela enquanto a nova consulta carrega', async () => {
    const { result } = renderHook(() => useProximitySearch());
    act(() => result.current.setOrigin(MASP));
    await flush(0);
    fetchNearbyPlaces.mockReturnValueOnce(new Promise(() => {}));
    act(() => result.current.setOrigin({ label: 'Sé', position: [-23.55, -46.63] }));

    expect(result.current.nearby.status).toBe(RequestStatus.LOADING);
    expect(result.current.nearby.places).toHaveLength(2);
  });

  it('cancela a consulta anterior e ignora a resposta atrasada', async () => {
    let resolveFirst;
    fetchNearbyPlaces
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce([NEAR]);
    const { result } = renderHook(() => useProximitySearch());
    act(() => result.current.setOrigin(MASP));
    act(() => result.current.setOrigin({ label: 'Sé', position: [-23.55, -46.63] }));
    await flush(0);
    await act(async () => resolveFirst([FAR, NEAR]));

    expect(fetchNearbyPlaces.mock.calls[0][1].signal.aborted).toBe(true);
    expect(result.current.nearby.places.map((place) => place.id)).toEqual(['perto']);
  });

  it('expõe o erro e consulta de novo com retry', async () => {
    fetchNearbyPlaces.mockRejectedValueOnce(new Error('falhou'));
    const { result } = renderHook(() => useProximitySearch());
    act(() => result.current.setOrigin(MASP));
    await flush(0);
    expect(result.current.nearby.status).toBe(RequestStatus.ERROR);

    act(() => result.current.nearby.retry());
    await flush(0);
    expect(result.current.nearby.status).toBe(RequestStatus.SUCCESS);
    expect(fetchNearbyPlaces).toHaveBeenCalledTimes(2);
  });

  it('usa a localização do navegador como ponto de referência', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        watchPosition: (success) => {
          success({ coords: { latitude: -23.55, longitude: -46.63, accuracy: 15 } });
          return 1;
        },
        clearWatch: () => {},
      },
    });
    const { result } = renderHook(() => useProximitySearch());
    await act(() => result.current.locate());

    expect(result.current.origin).toEqual({
      label: CURRENT_LOCATION_LABEL,
      position: [-23.55, -46.63],
      source: 'location',
    });
  });

  it('envia os filtros e consulta de novo quando eles mudam', async () => {
    const free = { ...EMPTY_FILTERS, free: true };
    const { result, rerender } = renderHook(({ filters }) => useProximitySearch(filters), {
      initialProps: { filters: EMPTY_FILTERS },
    });
    act(() => result.current.setOrigin(MASP));
    await flush(0);
    expect(fetchNearbyPlaces.mock.calls[0][1].filters).toBe(EMPTY_FILTERS);

    rerender({ filters: free });
    expect(result.current.nearby.status).toBe(RequestStatus.LOADING);
    await flush(0);
    expect(fetchNearbyPlaces).toHaveBeenCalledTimes(2);
    expect(fetchNearbyPlaces.mock.calls[1][1].filters).toBe(free);
    expect(result.current.nearby.status).toBe(RequestStatus.SUCCESS);
  });

  it('"Limpar" remove o ponto e volta ao raio padrão', async () => {
    const { result } = renderHook(() => useProximitySearch());
    act(() => {
      result.current.setOrigin(MASP);
      result.current.setRadiusKm(7);
    });
    act(() => result.current.clear());

    expect(result.current.origin).toBeNull();
    expect(result.current.radiusKm).toBe(DEFAULT_RADIUS_KM);
    expect(result.current.nearby.status).toBe(RequestStatus.IDLE);
  });
});
