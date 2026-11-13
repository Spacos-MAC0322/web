import { act, renderHook } from '@testing-library/react';
import { LatLngBounds } from 'leaflet';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPlacesInBounds } from '../services/places';
import usePlacesInBounds, { PlacesStatus } from './usePlacesInBounds';

// Mantém toBoundsParams real; só a chamada ao backend é simulada.
vi.mock('../services/places', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchPlacesInBounds: vi.fn(),
}));

const CENTER = new LatLngBounds([-23.6, -46.7], [-23.5, -46.6]);
const EAST = new LatLngBounds([-23.6, -46.6], [-23.5, -46.5]);
const PIN = { id: 'a', name: 'Museu', category: 'Museu', position: [-23.55, -46.65], badges: {} };

// Avança o debounce e deixa as promessas pendentes resolverem.
const flush = () => act(() => vi.advanceTimersByTimeAsync(300));

describe('usePlacesInBounds', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchPlacesInBounds.mockReset();
    fetchPlacesInBounds.mockResolvedValue([PIN]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('começa ocioso, sem pinos', () => {
    const { result } = renderHook(() => usePlacesInBounds());
    expect(result.current.status).toBe(PlacesStatus.IDLE);
    expect(result.current.places).toEqual([]);
  });

  it('faz uma única consulta após o debounce, com os últimos limites', async () => {
    const { result } = renderHook(() => usePlacesInBounds());
    act(() => {
      result.current.updateBounds(CENTER);
      result.current.updateBounds(EAST);
    });
    expect(fetchPlacesInBounds).not.toHaveBeenCalled();
    await flush();
    expect(fetchPlacesInBounds).toHaveBeenCalledOnce();
    expect(fetchPlacesInBounds.mock.calls[0][0]).toEqual({
      sw_lat: -23.6,
      sw_lng: -46.6,
      ne_lat: -23.5,
      ne_lng: -46.5,
    });
    expect(result.current.status).toBe(PlacesStatus.SUCCESS);
    expect(result.current.places).toEqual([PIN]);
  });

  it('não repete a consulta para os mesmos limites', async () => {
    const { result } = renderHook(() => usePlacesInBounds());
    act(() => result.current.updateBounds(CENTER));
    await flush();
    act(() => result.current.updateBounds(new LatLngBounds([-23.6, -46.7], [-23.5, -46.6])));
    await flush();
    expect(fetchPlacesInBounds).toHaveBeenCalledOnce();
  });

  it('não consulta áreas inválidas (vazias)', async () => {
    const { result } = renderHook(() => usePlacesInBounds());
    act(() => result.current.updateBounds(new LatLngBounds([-23.5, -46.6], [-23.5, -46.6])));
    await flush();
    expect(fetchPlacesInBounds).not.toHaveBeenCalled();
  });

  it('cancela a consulta anterior e ignora a resposta dela', async () => {
    let resolveFirst;
    fetchPlacesInBounds
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce([PIN]);
    const { result } = renderHook(() => usePlacesInBounds());
    act(() => result.current.updateBounds(CENTER));
    await flush();
    act(() => result.current.updateBounds(EAST));
    await flush();
    const firstSignal = fetchPlacesInBounds.mock.calls[0][1].signal;
    expect(firstSignal.aborted).toBe(true);
    await act(async () => resolveFirst([{ ...PIN, id: 'antigo' }]));
    expect(result.current.places).toEqual([PIN]);
  });

  it('expõe o erro e permite tentar de novo com os mesmos limites', async () => {
    const failure = new Error('O Spaços está temporariamente indisponível.');
    fetchPlacesInBounds.mockRejectedValueOnce(failure);
    const { result } = renderHook(() => usePlacesInBounds());
    act(() => result.current.updateBounds(CENTER));
    await flush();
    expect(result.current.status).toBe(PlacesStatus.ERROR);
    expect(result.current.error).toBe(failure);

    await act(async () => result.current.retry());
    expect(fetchPlacesInBounds).toHaveBeenCalledTimes(2);
    expect(fetchPlacesInBounds.mock.calls[1][0]).toEqual(fetchPlacesInBounds.mock.calls[0][0]);
    expect(result.current.status).toBe(PlacesStatus.SUCCESS);
    expect(result.current.error).toBeNull();
  });

  it('cancela a consulta em andamento ao desmontar', async () => {
    fetchPlacesInBounds.mockReturnValue(new Promise(() => {}));
    const { result, unmount } = renderHook(() => usePlacesInBounds());
    act(() => result.current.updateBounds(CENTER));
    await flush();
    unmount();
    expect(fetchPlacesInBounds.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
