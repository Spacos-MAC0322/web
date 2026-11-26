import { describe, expect, it } from 'vitest';
import {
  canSaveDraft,
  closureCheckKey,
  closureCheckRequest,
  createDraft,
  DraftAction,
  draftReducer,
  dragMove,
  MAX_STOPS,
  MAX_TITLE_LENGTH,
  needsClosureCheck,
  scheduleConflicts,
  shortTime,
  stopTimeError,
  toItineraryInput,
  unnamedPlaceIds,
} from './itineraryDraft';

const MUSEU = { id: 'museu', name: 'Museu Afro Brasil', category: 'Museu' };
const TEATRO = { id: 'teatro', name: 'Teatro Oficina', category: 'Teatro' };
const CLOSED = 'O local estará fechado no horário planejado.';

function apply(...actions) {
  return actions.reduce(draftReducer, createDraft());
}

function add(place) {
  return { type: DraftAction.ADD_STOP, place };
}

describe('draftReducer', () => {
  it('começa vazio', () => {
    expect(createDraft()).toEqual({ title: '', date: '', stops: [], places: {}, nextKey: 1 });
  });

  it('adiciona paradas no fim, com chaves únicas mesmo para o mesmo local', () => {
    const state = apply(add(MUSEU), add(TEATRO), add(MUSEU));
    expect(state.stops.map((stop) => stop.placeId)).toEqual(['museu', 'teatro', 'museu']);
    expect(new Set(state.stops.map((stop) => stop.key)).size).toBe(3);
    expect(state.stops[0]).toEqual({
      key: 'stop-1',
      placeId: 'museu',
      startTime: '',
      endTime: '',
      eventId: null,
      conflictWarning: null,
    });
    expect(state.places.museu).toEqual({ name: 'Museu Afro Brasil', category: 'Museu', missing: false });
  });

  it(`não passa de ${MAX_STOPS} paradas nem aceita local sem id`, () => {
    const full = apply(...Array.from({ length: MAX_STOPS }, () => add(MUSEU)));
    expect(full.stops).toHaveLength(MAX_STOPS);
    expect(draftReducer(full, add(TEATRO))).toBe(full);
    expect(draftReducer(createDraft(), add({ name: 'Sem id' }))).toEqual(createDraft());
  });

  it('remove a parada pela chave', () => {
    const state = apply(add(MUSEU), add(TEATRO));
    const next = draftReducer(state, { type: DraftAction.REMOVE_STOP, key: state.stops[0].key });
    expect(next.stops.map((stop) => stop.placeId)).toEqual(['teatro']);
  });

  it('move paradas para cima, para baixo e arrastando para longe', () => {
    const state = apply(add(MUSEU), add(TEATRO), add({ id: 'sesc', name: 'Sesc' }));
    const ids = (s) => s.stops.map((stop) => stop.placeId);
    expect(ids(draftReducer(state, { type: DraftAction.MOVE_STOP, from: 1, to: 0 }))).toEqual([
      'teatro',
      'museu',
      'sesc',
    ]);
    expect(ids(draftReducer(state, { type: DraftAction.MOVE_STOP, from: 0, to: 2 }))).toEqual([
      'teatro',
      'sesc',
      'museu',
    ]);
  });

  it.each([
    [0, 0],
    [0, -1],
    [2, 3],
    [-1, 0],
  ])('ignora movimento inválido de %i para %i', (from, to) => {
    const state = apply(add(MUSEU), add(TEATRO), add(MUSEU));
    expect(draftReducer(state, { type: DraftAction.MOVE_STOP, from, to })).toBe(state);
  });

  it('muda horários e descarta o aviso quando a chegada muda', () => {
    const loaded = draftReducer(createDraft(), {
      type: DraftAction.LOAD,
      itinerary: {
        title: 'Passeio',
        date: '2026-11-17',
        stops: [{ placeId: 'museu', startTime: '12:00', conflictWarning: CLOSED }],
      },
    });
    const key = loaded.stops[0].key;

    const withEnd = draftReducer(loaded, {
      type: DraftAction.SET_TIME,
      key,
      field: 'endTime',
      value: '13:00',
    });
    expect(withEnd.stops[0]).toMatchObject({ endTime: '13:00', conflictWarning: CLOSED });

    const withStart = draftReducer(withEnd, {
      type: DraftAction.SET_TIME,
      key,
      field: 'startTime',
      value: '11:30',
    });
    expect(withStart.stops[0]).toMatchObject({ startTime: '11:30', conflictWarning: null });

    const cleared = draftReducer(withStart, {
      type: DraftAction.SET_TIME,
      key,
      field: 'startTime',
      value: null,
    });
    expect(cleared.stops[0].startTime).toBe('');
  });

  it('ignora campo de horário desconhecido', () => {
    const state = apply(add(MUSEU));
    const action = { type: DraftAction.SET_TIME, key: state.stops[0].key, field: 'placeId', value: 'x' };
    expect(draftReducer(state, action)).toBe(state);
  });

  it('muda a data e descarta todos os avisos de fechamento', () => {
    const loaded = draftReducer(createDraft(), {
      type: DraftAction.LOAD,
      itinerary: {
        title: 'Passeio',
        date: '2026-11-17',
        stops: [
          { placeId: 'museu', conflictWarning: CLOSED },
          { placeId: 'teatro', conflictWarning: CLOSED },
        ],
      },
    });
    const next = draftReducer(loaded, { type: DraftAction.SET_DATE, date: '2026-11-18' });
    expect(next.date).toBe('2026-11-18');
    expect(next.stops.map((stop) => stop.conflictWarning)).toEqual([null, null]);
  });

  it(`limita o título a ${MAX_TITLE_LENGTH} caracteres`, () => {
    const state = apply({ type: DraftAction.SET_TITLE, title: 'x'.repeat(MAX_TITLE_LENGTH + 10) });
    expect(state.title).toHaveLength(MAX_TITLE_LENGTH);
    expect(apply({ type: DraftAction.SET_TITLE, title: null }).title).toBe('');
  });

  it('carrega um roteiro salvo mantendo nomes já conhecidos e sem reaproveitar chaves', () => {
    const before = apply(add(MUSEU));
    const loaded = draftReducer(before, {
      type: DraftAction.LOAD,
      itinerary: {
        title: 'Sábado',
        date: null,
        stops: [
          { placeId: 'museu', startTime: '10:00', endTime: null, eventId: 'expo' },
          { placeId: 'teatro', startTime: null },
        ],
      },
      places: { teatro: TEATRO },
    });

    expect(loaded.title).toBe('Sábado');
    expect(loaded.date).toBe('');
    expect(loaded.stops.map((stop) => stop.key)).toEqual(['stop-2', 'stop-3']);
    expect(loaded.stops[0]).toMatchObject({ startTime: '10:00', endTime: '', eventId: 'expo' });
    expect(loaded.places.museu.name).toBe('Museu Afro Brasil');
    expect(loaded.places.teatro.name).toBe('Teatro Oficina');
  });

  it('registra locais buscados depois, inclusive os indisponíveis', () => {
    const state = apply({
      type: DraftAction.SET_PLACES,
      places: { museu: MUSEU, sumiu: { missing: true } },
    });
    expect(state.places).toEqual({
      museu: { name: 'Museu Afro Brasil', category: 'Museu', missing: false },
      sumiu: { name: null, category: null, missing: true },
    });
  });

  it('aplica avisos do servidor mantendo as chaves, se o rascunho não mudou', () => {
    const state = apply({ type: DraftAction.SET_TITLE, title: 'x' }, add(MUSEU), add(TEATRO));
    const input = toItineraryInput(state);
    const next = draftReducer(state, {
      type: DraftAction.APPLY_WARNINGS,
      input,
      warnings: [CLOSED, null],
    });
    expect(next.stops.map((stop) => stop.conflictWarning)).toEqual([CLOSED, null]);
    expect(next.stops.map((stop) => stop.key)).toEqual(state.stops.map((stop) => stop.key));
  });

  it('aplica os avisos mesmo se só o título mudou desde o envio', () => {
    const sent = apply({ type: DraftAction.SET_TITLE, title: 'x' }, add(MUSEU));
    const input = toItineraryInput(sent);
    const renamed = draftReducer(sent, { type: DraftAction.SET_TITLE, title: 'Outro nome' });
    const next = draftReducer(renamed, { type: DraftAction.APPLY_WARNINGS, input, warnings: [CLOSED] });
    expect(next.stops[0].conflictWarning).toBe(CLOSED);
  });

  it('descarta avisos de um envio antigo ou com outra quantidade de paradas', () => {
    const sent = apply({ type: DraftAction.SET_TITLE, title: 'x' }, add(MUSEU));
    const input = toItineraryInput(sent);
    const edited = draftReducer(sent, {
      type: DraftAction.SET_TIME,
      key: sent.stops[0].key,
      field: 'startTime',
      value: '10:00',
    });
    const stale = { type: DraftAction.APPLY_WARNINGS, input, warnings: [CLOSED] };
    expect(draftReducer(edited, stale)).toBe(edited);
    expect(
      draftReducer(sent, { type: DraftAction.APPLY_WARNINGS, input, warnings: [CLOSED, null] }),
    ).toBe(sent);
  });

  it('ignora ações desconhecidas', () => {
    const state = createDraft();
    expect(draftReducer(state, { type: 'outra' })).toBe(state);
  });
});

describe('toItineraryInput', () => {
  it('monta o envio na ordem atual, com título aparado e campos vazios como null', () => {
    const state = apply(
      { type: DraftAction.SET_TITLE, title: '  Sábado  ' },
      add(MUSEU),
      add(TEATRO),
      { type: DraftAction.MOVE_STOP, from: 1, to: 0 },
    );
    const withTime = draftReducer(state, {
      type: DraftAction.SET_TIME,
      key: state.stops[1].key,
      field: 'startTime',
      value: '10:00',
    });

    expect(toItineraryInput(withTime)).toEqual({
      title: 'Sábado',
      date: null,
      stops: [
        { placeId: 'teatro', startTime: null, endTime: null, eventId: null },
        { placeId: 'museu', startTime: '10:00', endTime: null, eventId: null },
      ],
    });
  });
});

describe('stopTimeError e canSaveDraft', () => {
  it.each([
    ['10:00', '11:00', null],
    ['10:00', '10:00:01', null],
    ['10:00', '', null],
    ['', '10:00', null],
    ['10:00', '10:00', 'A saída precisa ser depois da chegada.'],
    ['11:00', '10:00', 'A saída precisa ser depois da chegada.'],
    ['10:00:30', '10:00', 'A saída precisa ser depois da chegada.'],
  ])('chegada %s e saída %s', (startTime, endTime, expected) => {
    expect(stopTimeError({ startTime, endTime })).toBe(expected);
  });

  it('exige título e horários coerentes para salvar', () => {
    expect(canSaveDraft(createDraft())).toBe(false);
    const titled = apply({ type: DraftAction.SET_TITLE, title: 'Passeio' }, add(MUSEU));
    expect(canSaveDraft(titled)).toBe(true);

    const key = titled.stops[0].key;
    const inverted = [
      { type: DraftAction.SET_TIME, key, field: 'startTime', value: '12:00' },
      { type: DraftAction.SET_TIME, key, field: 'endTime', value: '11:00' },
    ].reduce(draftReducer, titled);
    expect(canSaveDraft(inverted)).toBe(false);
    expect(canSaveDraft(apply({ type: DraftAction.SET_TITLE, title: '   ' }))).toBe(false);
  });
});

describe('scheduleConflicts', () => {
  const timed = (key, startTime = '', endTime = '') => ({ key, startTime, endTime });

  it('não avisa quando as paradas seguem em ordem', () => {
    expect(
      scheduleConflicts([
        timed('a', '10:00', '12:00'),
        timed('b', '12:00', '13:00'),
        timed('c', '15:30:00'),
      ]),
    ).toEqual({});
  });

  it('avisa quando uma parada começa antes da anterior', () => {
    expect(scheduleConflicts([timed('a', '14:00'), timed('b', '10:00')])).toEqual({
      b: 'Começa antes da parada 1, que é às 14:00.',
    });
  });

  it('avisa quando começa antes de sair da anterior', () => {
    expect(scheduleConflicts([timed('a', '10:00', '12:00'), timed('b', '11:30')])).toEqual({
      b: 'Começa antes de você sair da parada 1, às 12:00.',
    });
  });

  it('avisa quando começa no mesmo horário da anterior', () => {
    expect(scheduleConflicts([timed('a', '10:00'), timed('b', '10:00:00')])).toEqual({
      b: 'Começa no mesmo horário da parada 1 (10:00).',
    });
  });

  it('compara com a última parada que tem horário, pulando as sem horário', () => {
    expect(
      scheduleConflicts([timed('a', '10:00', '12:00'), timed('b'), timed('c', '11:00')]),
    ).toEqual({ c: 'Começa antes de você sair da parada 1, às 12:00.' });
  });

  it('usa só a saída da anterior quando ela não tem chegada', () => {
    expect(scheduleConflicts([timed('a', '', '12:00'), timed('b', '11:00')])).toEqual({
      b: 'Começa antes de você sair da parada 1, às 12:00.',
    });
    expect(scheduleConflicts([timed('a', '', '12:00'), timed('b', '12:30')])).toEqual({});
  });

  it('trata passar da meia-noite como conflito, pois o roteiro tem uma só data', () => {
    expect(scheduleConflicts([timed('a', '23:00'), timed('b', '01:00')])).toEqual({
      b: 'Começa antes da parada 1, que é às 23:00.',
    });
  });

  it('compara cada parada com a imediatamente anterior, mesmo depois de um conflito', () => {
    expect(
      scheduleConflicts([timed('a', '14:00'), timed('b', '10:00'), timed('c', '11:00')]),
    ).toEqual({ b: 'Começa antes da parada 1, que é às 14:00.' });
  });
});

describe('verificação de fechamento', () => {
  it('a chave depende só da data e das chegadas', () => {
    const state = apply(
      { type: DraftAction.SET_DATE, date: '2026-11-18' },
      add(MUSEU),
      add(TEATRO),
    );
    const key = closureCheckKey(state);
    const renamed = draftReducer(state, { type: DraftAction.SET_TITLE, title: 'Outro' });
    const withEnd = draftReducer(state, {
      type: DraftAction.SET_TIME,
      key: state.stops[0].key,
      field: 'endTime',
      value: '18:00',
    });
    const withStart = draftReducer(state, {
      type: DraftAction.SET_TIME,
      key: state.stops[0].key,
      field: 'startTime',
      value: '10:00',
    });
    expect(closureCheckKey(renamed)).toBe(key);
    expect(closureCheckKey(withEnd)).toBe(key);
    expect(closureCheckKey(withStart)).not.toBe(key);
    expect(closureCheckKey(toItineraryInput(state))).toBe(key);
  });

  it('closureCheckRequest monta o envio do /validate a partir da chave', () => {
    const state = draftReducer(apply({ type: DraftAction.SET_DATE, date: '2026-11-18' }, add(MUSEU)), {
      type: DraftAction.SET_TIME,
      key: 'stop-1',
      field: 'startTime',
      value: '10:00',
    });
    expect(closureCheckRequest(closureCheckKey(state))).toEqual({
      date: '2026-11-18',
      stops: [{ placeId: 'museu', startTime: '10:00', endTime: null, eventId: null }],
    });
  });

  it('só há o que conferir com data e alguma chegada', () => {
    const dated = apply({ type: DraftAction.SET_DATE, date: '2026-11-18' }, add(MUSEU));
    expect(needsClosureCheck(dated)).toBe(false);
    const timed = draftReducer(dated, {
      type: DraftAction.SET_TIME,
      key: dated.stops[0].key,
      field: 'startTime',
      value: '10:00',
    });
    expect(needsClosureCheck(timed)).toBe(true);
    expect(needsClosureCheck({ ...timed, date: '' })).toBe(false);
  });

  it('APPLY_CLOSURES aplica o resultado só se a chave ainda for a atual', () => {
    const state = apply({ type: DraftAction.SET_DATE, date: '2026-11-17' }, add(MUSEU));
    const key = closureCheckKey(state);
    const applied = draftReducer(state, {
      type: DraftAction.APPLY_CLOSURES,
      key,
      warnings: [CLOSED],
    });
    expect(applied.stops[0].conflictWarning).toBe(CLOSED);

    const moved = draftReducer(state, { type: DraftAction.SET_DATE, date: '2026-11-18' });
    expect(
      draftReducer(moved, { type: DraftAction.APPLY_CLOSURES, key, warnings: [CLOSED] }),
    ).toBe(moved);
    expect(
      draftReducer(state, { type: DraftAction.APPLY_CLOSURES, key, warnings: [] }),
    ).toBe(state);
  });

  it('shortTime corta os segundos', () => {
    expect(shortTime('14:00:00')).toBe('14:00');
    expect(shortTime('09:30')).toBe('09:30');
    expect(shortTime(null)).toBe('');
  });
});

describe('dragMove', () => {
  const stops = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];

  it.each([
    ['a', 'c', { from: 0, to: 2 }],
    ['c', 'a', { from: 2, to: 0 }],
    ['b', 'c', { from: 1, to: 2 }],
  ])('soltar %s sobre %s move para a posição dele', (active, over, expected) => {
    expect(dragMove(stops, active, over)).toEqual(expected);
  });

  it.each([
    ['a', null],
    ['a', 'a'],
    ['a', 'sumiu'],
    ['sumiu', 'a'],
  ])('ignora %s solto sobre %s', (active, over) => {
    expect(dragMove(stops, active, over)).toBeNull();
  });
});

describe('unnamedPlaceIds', () => {
  it('lista uma vez cada local das paradas ainda sem nome', () => {
    const state = draftReducer(apply(add(MUSEU)), {
      type: DraftAction.LOAD,
      itinerary: {
        title: 'x',
        stops: [{ placeId: 'museu' }, { placeId: 'teatro' }, { placeId: 'teatro' }],
      },
    });
    expect(unnamedPlaceIds(state)).toEqual(['teatro']);
  });
});
