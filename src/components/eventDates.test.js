import { describe, expect, it } from 'vitest';
import { formatEventWhen, sortEventsByStart } from './eventDates';

const NOW = new Date('2026-11-17T12:00:00-03:00');

describe('formatEventWhen', () => {
  it('mostra dia e horário de início e fim no mesmo dia', () => {
    expect(
      formatEventWhen('2026-11-20T19:00:00-03:00', '2026-11-20T21:00:00-03:00', NOW),
    ).toBe('20 de nov., 19:00 às 21:00');
  });

  it('usa o horário de São Paulo, qualquer que seja o fuso enviado', () => {
    expect(formatEventWhen('2026-11-20T22:00:00Z', null, NOW)).toBe('20 de nov., 19:00');
  });

  it('mostra só o dia para datas sem hora, sem deslocar o dia pelo fuso', () => {
    expect(formatEventWhen('2026-11-20', null, NOW)).toBe('20 de nov.');
    expect(formatEventWhen('2026-11-20', '2026-11-20', NOW)).toBe('20 de nov.');
  });

  it('mostra o período de eventos de vários dias', () => {
    expect(formatEventWhen('2026-11-20', '2026-12-16', NOW)).toBe('20 de nov. a 16 de dez.');
  });

  it('mostra só a data final de eventos que já estão em cartaz', () => {
    expect(formatEventWhen('2026-10-01', '2026-12-16', NOW)).toBe('Até 16 de dez.');
    expect(formatEventWhen(null, '2026-12-16', NOW)).toBe('Até 16 de dez.');
  });

  it('devolve null sem datas válidas', () => {
    expect(formatEventWhen(null, null, NOW)).toBeNull();
    expect(formatEventWhen('em breve', null, NOW)).toBeNull();
  });
});

describe('sortEventsByStart', () => {
  it('ordena pela data de início, com eventos sem data no fim, sem alterar a lista', () => {
    const events = [
      { title: 'Sem data', starts_at: null },
      { title: 'Depois', starts_at: '2026-11-25' },
      { title: 'Antes', starts_at: '2026-11-18T10:00:00-03:00' },
    ];
    expect(sortEventsByStart(events).map((event) => event.title)).toEqual([
      'Antes',
      'Depois',
      'Sem data',
    ]);
    expect(events[0].title).toBe('Sem data');
  });
});
