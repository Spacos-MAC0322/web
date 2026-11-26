import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, ApiErrorKind } from '../services/api';
import {
  createItinerary,
  deleteItinerary,
  fetchItinerary,
  replaceItinerary,
  validateItinerary,
} from '../services/itineraries';
import { fetchPlaceDetail } from '../services/places';
import useItineraryEditor, { EditorStatus, Mutation } from './useItineraryEditor';

vi.mock('../services/itineraries', () => ({
  createItinerary: vi.fn(),
  deleteItinerary: vi.fn(),
  fetchItinerary: vi.fn(),
  replaceItinerary: vi.fn(),
  validateItinerary: vi.fn(),
}));
vi.mock('../services/places', () => ({ fetchPlaceDetail: vi.fn() }));

const CLOSED = 'O local estará fechado no horário planejado.';
const MUSEU = { id: 'museu', name: 'Museu Afro Brasil', category: 'Museu' };

function stop(placeId, fields = {}) {
  return {
    placeId,
    order: 1,
    startTime: null,
    endTime: null,
    eventId: null,
    conflictWarning: null,
    ...fields,
  };
}

const SAVED = {
  id: 'abc',
  title: 'Sábado',
  date: '2026-11-17',
  stops: [stop('museu', { startTime: '12:00', conflictWarning: CLOSED }), stop('teatro')],
};

function notFound() {
  return new ApiError('Roteiro não encontrado.', { kind: ApiErrorKind.CLIENT, status: 404 });
}

function deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  validateItinerary.mockResolvedValue([]);
  fetchPlaceDetail.mockImplementation(async (id) =>
    id === 'museu'
      ? { id, name: 'Museu Afro Brasil', primary_category: 'Museu' }
      : { id, name: 'Teatro Oficina', categories: ['Teatro'] },
  );
});

describe('useItineraryEditor: roteiro novo', () => {
  it('começa pronto, vazio, sem consultar o backend', () => {
    const { result } = renderHook(() => useItineraryEditor());
    expect(result.current.status).toBe(EditorStatus.READY);
    expect(result.current.isNew).toBe(true);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.canSave).toBe(false);
    expect(result.current.draft.stops).toEqual([]);
    expect(fetchItinerary).not.toHaveBeenCalled();
  });

  it('edita, cria com POST e passa a editar o roteiro salvo', async () => {
    createItinerary.mockResolvedValue({
      ...SAVED,
      stops: [stop('museu', { startTime: '12:00', conflictWarning: CLOSED })],
    });
    const { result } = renderHook(() => useItineraryEditor());

    act(() => {
      result.current.setTitle(' Sábado ');
      result.current.setDate('2026-11-17');
      result.current.addStop(MUSEU);
    });
    act(() => result.current.setTime(result.current.draft.stops[0].key, 'startTime', '12:00'));
    expect(result.current.isDirty).toBe(true);
    expect(result.current.canSave).toBe(true);

    let saved;
    await act(async () => {
      saved = await result.current.save();
    });

    expect(createItinerary).toHaveBeenCalledWith({
      title: 'Sábado',
      date: '2026-11-17',
      stops: [{ placeId: 'museu', startTime: '12:00', endTime: null, eventId: null }],
    });
    expect(saved.id).toBe('abc');
    expect(result.current.savedId).toBe('abc');
    expect(result.current.isNew).toBe(false);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.draft.stops[0].conflictWarning).toBe(CLOSED);
    expect(result.current.draft.places.museu.name).toBe('Museu Afro Brasil');

    replaceItinerary.mockResolvedValue({ ...SAVED, title: 'Domingo', stops: [stop('museu')] });
    act(() => result.current.setTitle('Domingo'));
    await act(async () => {
      await result.current.save();
    });
    expect(replaceItinerary).toHaveBeenCalledWith('abc', expect.objectContaining({ title: 'Domingo' }));
    expect(createItinerary).toHaveBeenCalledTimes(1);
  });

  it('pode começar com paradas, como alterações ainda não salvas', () => {
    const { result } = renderHook(() =>
      useItineraryEditor(null, {
        initial: { itinerary: { title: '', date: null, stops: [stop('museu')] }, places: { museu: MUSEU } },
      }),
    );
    expect(result.current.status).toBe(EditorStatus.READY);
    expect(result.current.isNew).toBe(true);
    expect(result.current.isDirty).toBe(true);
    expect(result.current.draft.stops.map((item) => item.placeId)).toEqual(['museu']);
    expect(result.current.draft.places.museu.name).toBe('Museu Afro Brasil');
    expect(fetchItinerary).not.toHaveBeenCalled();
  });

  it('não salva sem título', async () => {
    const { result } = renderHook(() => useItineraryEditor());
    await act(async () => {
      expect(await result.current.save()).toBeNull();
    });
    expect(createItinerary).not.toHaveBeenCalled();
  });

  it('não exclui um roteiro que ainda não foi salvo', async () => {
    const { result } = renderHook(() => useItineraryEditor());
    await act(async () => {
      expect(await result.current.remove()).toBe(false);
    });
    expect(deleteItinerary).not.toHaveBeenCalled();
  });
});

describe('useItineraryEditor: roteiro salvo', () => {
  it('carrega o roteiro com os nomes dos locais e sem alterações pendentes', async () => {
    fetchItinerary.mockResolvedValue(SAVED);
    const { result } = renderHook(() => useItineraryEditor('abc'));
    expect(result.current.status).toBe(EditorStatus.LOADING);
    expect(result.current.canSave).toBe(false);

    await waitFor(() => expect(result.current.status).toBe(EditorStatus.READY));
    expect(fetchItinerary).toHaveBeenCalledWith('abc', { signal: expect.any(AbortSignal) });
    expect(fetchPlaceDetail).toHaveBeenCalledTimes(2);
    const { draft } = result.current;
    expect(draft.title).toBe('Sábado');
    expect(draft.stops.map((item) => item.placeId)).toEqual(['museu', 'teatro']);
    expect(draft.stops[0]).toMatchObject({ startTime: '12:00', conflictWarning: CLOSED });
    expect(draft.places.museu).toEqual({ name: 'Museu Afro Brasil', category: 'Museu', missing: false });
    expect(draft.places.teatro.category).toBe('Teatro');
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isNew).toBe(false);
  });

  it('marca locais apagados como indisponíveis e tolera outras falhas', async () => {
    fetchItinerary.mockResolvedValue(SAVED);
    fetchPlaceDetail.mockImplementation(async (id) => {
      if (id === 'museu') throw notFound();
      throw new ApiError('Erro', { kind: ApiErrorKind.SERVER, status: 503 });
    });
    const { result } = renderHook(() => useItineraryEditor('abc'));

    await waitFor(() => expect(result.current.status).toBe(EditorStatus.READY));
    expect(result.current.draft.places.museu).toEqual({ name: null, category: null, missing: true });
    expect(result.current.draft.places.teatro).toEqual({ name: null, category: null, missing: false });
  });

  it('informa roteiro inexistente', async () => {
    fetchItinerary.mockRejectedValue(notFound());
    const { result } = renderHook(() => useItineraryEditor('sumiu'));
    await waitFor(() => expect(result.current.status).toBe(EditorStatus.NOT_FOUND));
    expect(result.current.loadError).toBeNull();
  });

  it('expõe outras falhas e tenta de novo com retry', async () => {
    const failure = new ApiError('Fora do ar', { kind: ApiErrorKind.SERVER, status: 503 });
    fetchItinerary.mockRejectedValueOnce(failure).mockResolvedValueOnce(SAVED);
    const { result } = renderHook(() => useItineraryEditor('abc'));

    await waitFor(() => expect(result.current.status).toBe(EditorStatus.ERROR));
    expect(result.current.loadError).toBe(failure);

    act(() => result.current.retry());
    expect(result.current.status).toBe(EditorStatus.LOADING);
    await waitFor(() => expect(result.current.status).toBe(EditorStatus.READY));
    expect(fetchItinerary).toHaveBeenCalledTimes(2);
  });

  it('cancela a consulta ao desmontar', async () => {
    const pending = deferred();
    fetchItinerary.mockReturnValue(pending.promise);
    const { unmount } = renderHook(() => useItineraryEditor('abc'));
    const { signal } = fetchItinerary.mock.calls[0][1];
    unmount();
    expect(signal.aborted).toBe(true);
    pending.resolve(SAVED);
  });

  it('começa com o roteiro recém-criado, sem consultar o backend', () => {
    const { result } = renderHook(() =>
      useItineraryEditor('abc', { initial: { itinerary: SAVED, places: { museu: MUSEU } } }),
    );
    expect(result.current.status).toBe(EditorStatus.READY);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.draft.places.museu.name).toBe('Museu Afro Brasil');
    expect(fetchItinerary).not.toHaveBeenCalled();
  });

  it('não recarrega o roteiro quando `initial` some depois de montar', () => {
    const { result, rerender } = renderHook(
      ({ initial }) => useItineraryEditor('abc', { initial }),
      { initialProps: { initial: { itinerary: SAVED, places: {} } } },
    );
    act(() => result.current.setTitle('Editado'));
    rerender({ initial: null });
    expect(fetchItinerary).not.toHaveBeenCalled();
    expect(result.current.draft.title).toBe('Editado');
  });

  it('ignora `initial` de outro roteiro', async () => {
    fetchItinerary.mockResolvedValue(SAVED);
    const { result } = renderHook(() =>
      useItineraryEditor('abc', { initial: { itinerary: { ...SAVED, id: 'outro' } } }),
    );
    expect(result.current.status).toBe(EditorStatus.LOADING);
    await waitFor(() => expect(result.current.status).toBe(EditorStatus.READY));
    expect(fetchItinerary).toHaveBeenCalledWith('abc', expect.anything());
  });

  it('reordena e salva com PUT; edições feitas durante o envio não são sobrescritas', async () => {
    fetchItinerary.mockResolvedValue(SAVED);
    const pending = deferred();
    replaceItinerary.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useItineraryEditor('abc'));
    await waitFor(() => expect(result.current.status).toBe(EditorStatus.READY));

    act(() => result.current.moveStop(1, 0));
    expect(result.current.isDirty).toBe(true);

    let saving;
    act(() => {
      saving = result.current.save();
    });
    expect(result.current.mutation).toBe(Mutation.SAVING);
    expect(result.current.canSave).toBe(false);
    expect(replaceItinerary.mock.calls[0][1].stops.map((item) => item.placeId)).toEqual([
      'teatro',
      'museu',
    ]);

    // Segundo clique antes da resposta: não envia de novo.
    await act(async () => {
      expect(await result.current.save()).toBeNull();
    });
    // Edição de horário durante o envio: a resposta (antiga) não pode desfazê-la.
    act(() =>
      result.current.setTime(result.current.draft.stops[1].key, 'endTime', '13:00'),
    );

    // Avisos da resposta diferem dos atuais: se fossem aplicados, o teste perceberia.
    await act(async () => {
      pending.resolve({
        ...SAVED,
        stops: [stop('teatro', { conflictWarning: 'outro aviso' }), stop('museu')],
      });
      await saving;
    });

    expect(replaceItinerary).toHaveBeenCalledTimes(1);
    expect(result.current.mutation).toBe(Mutation.IDLE);
    expect(result.current.draft.stops[1].endTime).toBe('13:00');
    expect(result.current.isDirty).toBe(true);
    // Mover não muda a chegada: o museu segue com o aviso carregado do backend.
    expect(result.current.draft.stops.map((item) => item.conflictWarning)).toEqual([null, CLOSED]);
  });

  it('mantém o rascunho e expõe o erro quando salvar falha', async () => {
    fetchItinerary.mockResolvedValue(SAVED);
    const failure = new ApiError('Espaço não encontrado: teatro.', {
      kind: ApiErrorKind.CLIENT,
      status: 422,
    });
    replaceItinerary.mockRejectedValue(failure);
    const { result } = renderHook(() => useItineraryEditor('abc'));
    await waitFor(() => expect(result.current.status).toBe(EditorStatus.READY));

    act(() => result.current.setTitle('Novo'));
    await act(async () => {
      expect(await result.current.save()).toBeNull();
    });
    expect(result.current.error).toBe(failure);
    expect(result.current.isDirty).toBe(true);
    expect(result.current.draft.title).toBe('Novo');
    expect(result.current.canSave).toBe(true);
  });

  it('exclui o roteiro e expõe falhas ao excluir', async () => {
    fetchItinerary.mockResolvedValue(SAVED);
    const failure = new ApiError('Fora do ar', { kind: ApiErrorKind.SERVER, status: 503 });
    deleteItinerary.mockRejectedValueOnce(failure).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useItineraryEditor('abc'));
    await waitFor(() => expect(result.current.status).toBe(EditorStatus.READY));

    await act(async () => {
      expect(await result.current.remove()).toBe(false);
    });
    expect(result.current.error).toBe(failure);

    await act(async () => {
      expect(await result.current.remove()).toBe(true);
    });
    expect(deleteItinerary).toHaveBeenLastCalledWith('abc');
    expect(result.current.error).toBeNull();
  });
});
