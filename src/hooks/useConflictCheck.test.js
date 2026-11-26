import { act, renderHook } from '@testing-library/react';
import { useReducer } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closureCheckKey, createDraft, DraftAction, draftReducer } from '../pages/itineraryDraft';
import { ApiError, ApiErrorKind } from '../services/api';
import { validateItinerary } from '../services/itineraries';
import useConflictCheck, { CHECK_DEBOUNCE_MS, CheckStatus } from './useConflictCheck';

vi.mock('../services/itineraries', () => ({ validateItinerary: vi.fn() }));

const CLOSED = 'O local estará fechado no horário planejado.';

function initialDraft() {
  return [
    { type: DraftAction.SET_DATE, date: '2026-11-17' },
    { type: DraftAction.ADD_STOP, place: { id: 'museu', name: 'Museu' } },
    { type: DraftAction.ADD_STOP, place: { id: 'teatro', name: 'Teatro' } },
    { type: DraftAction.SET_TIME, key: 'stop-1', field: 'startTime', value: '12:00' },
  ].reduce(draftReducer, createDraft());
}

function renderCheck(options = {}) {
  return renderHook(
    ({ enabled }) => {
      const [draft, dispatch] = useReducer(draftReducer, undefined, initialDraft);
      const check = useConflictCheck(draft, dispatch, { enabled, ...options });
      return { draft, dispatch, check };
    },
    { initialProps: { enabled: true } },
  );
}

async function wait(ms = CHECK_DEBOUNCE_MS) {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

beforeEach(() => {
  vi.useFakeTimers();
  validateItinerary.mockResolvedValue([
    { placeId: 'museu', conflictWarning: CLOSED },
    { placeId: 'teatro', conflictWarning: null },
  ]);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useConflictCheck', () => {
  it('confere os horários depois de uma pausa e aplica os avisos de fechamento', async () => {
    const { result } = renderCheck();
    expect(result.current.check.status).toBe(CheckStatus.CHECKING);
    expect(validateItinerary).not.toHaveBeenCalled();

    await wait();

    expect(validateItinerary).toHaveBeenCalledTimes(1);
    expect(validateItinerary).toHaveBeenCalledWith(
      {
        date: '2026-11-17',
        stops: [
          { placeId: 'museu', startTime: '12:00', endTime: null, eventId: null },
          { placeId: 'teatro', startTime: null, endTime: null, eventId: null },
        ],
      },
      { signal: expect.any(AbortSignal) },
    );
    expect(result.current.check.status).toBe(CheckStatus.IDLE);
    expect(result.current.draft.stops.map((stop) => stop.conflictWarning)).toEqual([CLOSED, null]);
  });

  it('espera parar de mudar e consulta só a versão final', async () => {
    const { result } = renderCheck();
    await wait(CHECK_DEBOUNCE_MS - 100);
    act(() =>
      result.current.dispatch({
        type: DraftAction.SET_TIME,
        key: 'stop-1',
        field: 'startTime',
        value: '13:00',
      }),
    );
    await wait(CHECK_DEBOUNCE_MS - 100);
    expect(validateItinerary).not.toHaveBeenCalled();

    await wait(100);
    expect(validateItinerary).toHaveBeenCalledTimes(1);
    expect(validateItinerary.mock.calls[0][0].stops[0].startTime).toBe('13:00');
  });

  it('não consulta de novo por mudanças que não afetam o fechamento', async () => {
    const { result } = renderCheck();
    await wait();
    act(() => {
      result.current.dispatch({ type: DraftAction.SET_TITLE, title: 'Outro nome' });
      result.current.dispatch({
        type: DraftAction.SET_TIME,
        key: 'stop-1',
        field: 'endTime',
        value: '14:00',
      });
    });
    await wait();
    expect(validateItinerary).toHaveBeenCalledTimes(1);
    expect(result.current.check.status).toBe(CheckStatus.IDLE);
  });

  it('descarta a resposta de uma versão antiga e cancela a consulta', async () => {
    let resolveFirst;
    validateItinerary.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const { result } = renderCheck();
    await wait();
    const { signal } = validateItinerary.mock.calls[0][1];

    act(() => result.current.dispatch({ type: DraftAction.SET_DATE, date: '2026-11-18' }));
    expect(signal.aborted).toBe(true);
    await act(async () => resolveFirst([{ conflictWarning: CLOSED }, { conflictWarning: null }]));
    expect(result.current.draft.stops[0].conflictWarning).toBeNull();
  });

  it('não consulta sem data, sem chegadas ou antes de o roteiro carregar', async () => {
    const { result, rerender } = renderCheck();
    rerender({ enabled: false });
    await wait();
    expect(validateItinerary).not.toHaveBeenCalled();
    expect(result.current.check.status).toBe(CheckStatus.IDLE);

    rerender({ enabled: true });
    act(() => result.current.dispatch({ type: DraftAction.SET_DATE, date: '' }));
    await wait();
    expect(validateItinerary).not.toHaveBeenCalled();
  });

  it('não consulta o que já veio conferido do backend', async () => {
    const { result } = renderCheck({ initialCheckedKey: closureCheckKey(initialDraft()) });
    expect(result.current.check.status).toBe(CheckStatus.IDLE);
    await wait();
    expect(validateItinerary).not.toHaveBeenCalled();

    act(() => result.current.check.markChecked('outra'));
    await wait();
    expect(validateItinerary).toHaveBeenCalledTimes(1);
  });

  it('expõe a falha e tenta de novo', async () => {
    const failure = new ApiError('Fora do ar.', { kind: ApiErrorKind.SERVER, status: 503 });
    validateItinerary.mockRejectedValueOnce(failure);
    const { result } = renderCheck();
    await wait();
    expect(result.current.check.status).toBe(CheckStatus.ERROR);
    expect(result.current.check.error).toBe(failure);

    act(() => result.current.check.retry());
    expect(result.current.check.status).toBe(CheckStatus.CHECKING);
    await wait();
    expect(validateItinerary).toHaveBeenCalledTimes(2);
    expect(result.current.check.status).toBe(CheckStatus.IDLE);
    expect(result.current.draft.stops[0].conflictWarning).toBe(CLOSED);
  });
});
