// src/components/EventList.jsx
// Programação vigente do espaço (issue #33): exposições e eventos de hoje até os próximos
// 30 dias, vindos do Mapas Culturais junto com os detalhes do lugar (GET /api/places/{id}).
// O backend devolve [] quando a agenda está vazia ou indisponível, por isso o estado vazio
// também avisa que a informação pode estar incompleta; `events` ausente indica falha.
import { useId, useState } from 'react';
import { formatEventWhen, sortEventsByStart } from './eventDates';
import styles from './EventList.module.css';

const INITIAL_COUNT = 6;

function EventItem({ event }) {
  const when = formatEventWhen(event.starts_at, event.ends_at);
  const details = [event.price_text, event.age_rating && `Classificação: ${event.age_rating}`];
  return (
    <li className={styles.event}>
      <h3 className={styles.title}>{event.title}</h3>
      {when && <p className={styles.when}>{when}</p>}
      {event.schedule_text && <p className={styles.schedule}>{event.schedule_text}</p>}
      {event.description?.short && <p>{event.description.short}</p>}
      {details.some(Boolean) && (
        <p className={styles.details}>{details.filter(Boolean).join(' · ')}</p>
      )}
    </li>
  );
}

function Notice({ children }) {
  return <p className={styles.notice}>{children}</p>;
}

function EventItems({ events }) {
  const [showAll, setShowAll] = useState(false);
  const sorted = sortEventsByStart(events);
  const visible = showAll ? sorted : sorted.slice(0, INITIAL_COUNT);
  return (
    <>
      <ul className={styles.list}>
        {visible.map((event, index) => (
          <EventItem key={`${index}-${event.title}`} event={event} />
        ))}
      </ul>
      {sorted.length > INITIAL_COUNT && (
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={showAll}
          onClick={() => setShowAll((current) => !current)}
        >
          {showAll ? 'Mostrar menos' : `Ver toda a programação (${sorted.length})`}
        </button>
      )}
    </>
  );
}

// events: lista `events` de PlaceDetailSchema; null/undefined quando a agenda falhou.
export default function EventList({ events }) {
  const titleId = useId();
  let content;
  if (!Array.isArray(events)) {
    content = (
      <Notice>
        Não foi possível consultar a programação agora. As demais informações do espaço
        continuam disponíveis; tente de novo mais tarde.
      </Notice>
    );
  } else if (events.length === 0) {
    content = (
      <Notice>
        Nenhuma programação encontrada para os próximos 30 dias. A agenda vem do Mapas
        Culturais e pode estar incompleta: confira também os canais do espaço.
      </Notice>
    );
  } else {
    content = <EventItems events={events} />;
  }
  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.heading}>
        Programação em cartaz
      </h2>
      {content}
    </section>
  );
}
