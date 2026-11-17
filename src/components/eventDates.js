// src/components/eventDates.js
// Datas da programação de um espaço (issue #33). O backend envia `starts_at`/`ends_at` como
// data ("2026-11-20") ou data e hora com fuso ("2026-11-20T19:00:00-03:00"); tudo é exibido
// no horário de São Paulo.
const TIME_ZONE = 'America/Sao_Paulo';
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const dayFormat = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  timeZone: TIME_ZONE,
});
const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
});
const dayKeyFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE });

// { date, hasTime } ou null. Datas sem hora viram meio-dia UTC, que é o mesmo dia em SP.
function parse(value) {
  if (typeof value !== 'string' || !value) return null;
  const dateOnly = DATE_ONLY.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly.map(Number);
    return { date: new Date(Date.UTC(year, month - 1, day, 12)), hasTime: false };
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : { date, hasTime: true };
}

const dayKey = (date) => dayKeyFormat.format(date);

function dayWithTime({ date, hasTime }) {
  return hasTime ? `${dayFormat.format(date)}, ${timeFormat.format(date)}` : dayFormat.format(date);
}

// Ex.: "20 de nov., 19:00 às 21:00", "1 de nov. a 16 de dez.", "Até 16 de dez.".
// Eventos que já começaram e seguem em cartaz mostram só a data final.
export function formatEventWhen(startsAt, endsAt, now = new Date()) {
  const start = parse(startsAt);
  const end = parse(endsAt);
  if (!start) return end ? `Até ${dayFormat.format(end.date)}` : null;
  if (!end) return dayWithTime(start);

  if (dayKey(start.date) === dayKey(end.date)) {
    if (!start.hasTime) return dayFormat.format(start.date);
    const until = end.hasTime ? ` às ${timeFormat.format(end.date)}` : '';
    return `${dayWithTime(start)}${until}`;
  }
  if (dayKey(start.date) < dayKey(now)) return `Até ${dayFormat.format(end.date)}`;
  return `${dayFormat.format(start.date)} a ${dayFormat.format(end.date)}`;
}

// Ordena pela data de início; eventos sem data vão para o fim.
export function sortEventsByStart(events) {
  const time = (event) => parse(event.starts_at)?.date.getTime() ?? Infinity;
  return [...events].sort((a, b) => time(a) - time(b));
}
