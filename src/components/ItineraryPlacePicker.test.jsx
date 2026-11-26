import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestStatus } from '../hooks/useApiRequest';
import { FavoritesContext } from '../hooks/useFavorites';
import { ApiError, ApiErrorKind } from '../services/api';
import { fetchPlacesByText } from '../services/places';
import ItineraryPlacePicker, { MAX_RESULTS, SEARCH_DEBOUNCE_MS } from './ItineraryPlacePicker';

vi.mock('../services/places', () => ({ fetchPlacesByText: vi.fn() }));

const MUSEU = { id: 'museu', name: 'Museu Afro Brasil', category: 'Museu', neighborhood: 'Moema' };
const TEATRO = { id: 'teatro', name: 'Teatro Oficina', category: 'Teatro', neighborhood: null };

function favoritesValue(overrides = {}) {
  return { favorites: [], status: RequestStatus.SUCCESS, ...overrides };
}

function renderPicker({ favorites, ...props } = {}) {
  const onAdd = vi.fn();
  const picker = <ItineraryPlacePicker onAdd={onAdd} {...props} />;
  render(
    favorites ? <FavoritesContext value={favoritesValue(favorites)}>{picker}</FavoritesContext> : picker,
  );
  return { onAdd };
}

function searchBox() {
  return screen.getByRole('searchbox', { name: 'Buscar espaços para adicionar ao roteiro' });
}

describe('ItineraryPlacePicker: busca', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function typeAndWait(text) {
    await userEvent.type(searchBox(), text);
    await act(() => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS));
  }

  it('busca depois de uma pausa na digitação e adiciona o espaço escolhido', async () => {
    fetchPlacesByText.mockResolvedValue([MUSEU, TEATRO]);
    const { onAdd } = renderPicker();

    await typeAndWait('museu');
    expect(fetchPlacesByText).toHaveBeenCalledTimes(1);
    expect(fetchPlacesByText).toHaveBeenCalledWith('museu', { signal: expect.any(AbortSignal) });

    const results = await screen.findByRole('list', { name: 'Resultados para museu' });
    expect(within(results).getByText('Moema · Museu')).toBeInTheDocument();
    await userEvent.click(
      within(results).getByRole('button', { name: 'Adicionar Museu Afro Brasil ao roteiro' }),
    );
    expect(onAdd).toHaveBeenCalledWith(MUSEU);
    expect(screen.getByTestId('picker-announcement')).toHaveTextContent(
      'Museu Afro Brasil adicionado ao roteiro.',
    );
  });

  it('não consulta com menos de 2 letras', async () => {
    renderPicker();
    await typeAndWait('m');
    expect(fetchPlacesByText).not.toHaveBeenCalled();
    expect(screen.queryByText('Buscando…')).not.toBeInTheDocument();
  });

  it('Enter busca sem esperar a pausa', async () => {
    fetchPlacesByText.mockResolvedValue([]);
    renderPicker();
    await userEvent.type(searchBox(), 'teatro{Enter}');
    expect(fetchPlacesByText).toHaveBeenCalledWith('teatro', expect.anything());
    expect(await screen.findByText('Nenhum espaço encontrado para “teatro”.')).toBeInTheDocument();
  });

  it(`mostra no máximo ${MAX_RESULTS} resultados e avisa que há mais`, async () => {
    fetchPlacesByText.mockResolvedValue(
      Array.from({ length: MAX_RESULTS + 2 }, (_, i) => ({ id: `p${i}`, name: `Espaço ${i}` })),
    );
    renderPicker();
    await typeAndWait('espaço');
    const results = await screen.findByRole('list', { name: 'Resultados para espaço' });
    expect(within(results).getAllByRole('listitem')).toHaveLength(MAX_RESULTS);
    expect(screen.getByText(`Mostrando ${MAX_RESULTS} de ${MAX_RESULTS + 2}. Refine a busca para encontrar outros.`)).toBeInTheDocument();
  });

  it('mostra o erro da busca e tenta de novo', async () => {
    fetchPlacesByText
      .mockRejectedValueOnce(new ApiError('Fora do ar.', { kind: ApiErrorKind.SERVER, status: 503 }))
      .mockResolvedValueOnce([TEATRO]);
    renderPicker();
    await typeAndWait('teatro');
    expect(await screen.findByText('Fora do ar.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('button', { name: 'Adicionar Teatro Oficina ao roteiro' })).toBeInTheDocument();
  });

  it('desativa os botões quando o roteiro está cheio', async () => {
    fetchPlacesByText.mockResolvedValue([MUSEU]);
    renderPicker({ isFull: true });
    expect(screen.getByText('O roteiro chegou ao limite de paradas.')).toBeInTheDocument();
    await typeAndWait('museu');
    expect(await screen.findByRole('button', { name: 'Adicionar Museu Afro Brasil ao roteiro' })).toBeDisabled();
  });
});

describe('ItineraryPlacePicker: favoritos', () => {
  it('lista os favoritos para adicionar com um toque', async () => {
    const { onAdd } = renderPicker({ favorites: { favorites: [TEATRO] } });
    const list = screen.getByRole('list', { name: 'Seus favoritos' });
    await userEvent.click(within(list).getByRole('button', { name: 'Adicionar Teatro Oficina ao roteiro' }));
    expect(onAdd).toHaveBeenCalledWith(TEATRO);
  });

  it('explica como ter favoritos quando ainda não há nenhum', () => {
    renderPicker({ favorites: {} });
    expect(screen.getByText(/Favorite espaços na página de cada lugar/)).toBeInTheDocument();
  });

  it('esconde os favoritos enquanto carregam ou sem sessão', () => {
    renderPicker({ favorites: { status: RequestStatus.LOADING } });
    expect(screen.queryByRole('heading', { name: 'Seus favoritos' })).not.toBeInTheDocument();
  });

  it('desativa os favoritos enquanto o roteiro é salvo', () => {
    renderPicker({ favorites: { favorites: [TEATRO] }, disabled: true });
    expect(screen.getByRole('button', { name: 'Adicionar Teatro Oficina ao roteiro' })).toBeDisabled();
  });
});
