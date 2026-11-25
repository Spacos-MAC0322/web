// src/components/ItineraryTimeline.jsx
// Paradas do roteiro em ordem de visita (issue #87): nome do local, horários de chegada e
// saída e os botões para subir, descer e remover. Os botões ↑/↓ atendem quem usa teclado,
// leitor de tela ou celular, além de quem arrasta a parada.
import { Link } from 'react-router-dom';
import { stopTimeError } from '../pages/itineraryDraft';
import { placePath } from '../services/places';
import styles from './ItineraryTimeline.module.css';

const UNKNOWN_NAME = 'Local sem nome';
const MISSING_NAME = 'Local indisponível';

function stopName(place) {
  if (place?.missing) return MISSING_NAME;
  return place?.name ?? UNKNOWN_NAME;
}

function TimeField({ label, value, onChange, disabled, describedBy }) {
  return (
    <label className={styles.timeField}>
      <span className={styles.timeLabel}>{label}</span>
      <input
        type="time"
        className={styles.timeInput}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-describedby={describedBy}
      />
    </label>
  );
}

function StopItem({ stop, index, total, place, disabled, onMove, onRemove, onTimeChange }) {
  const number = index + 1;
  const name = stopName(place);
  const timeError = stopTimeError(stop);
  const errorId = `${stop.key}-time-error`;
  const describe = (action) => `${action} a parada ${number} (${name})`;

  return (
    <li className={styles.stop} aria-label={`Parada ${number}: ${name}`}>
      <span className={styles.number} aria-hidden="true">
        {number}
      </span>

      <div className={styles.body}>
        <h3 className={styles.name}>
          {place?.missing ? (
            name
          ) : (
            <Link to={placePath(stop.placeId)} className={styles.nameLink}>
              {name}
            </Link>
          )}
        </h3>
        {place?.category && <p className={styles.category}>{place.category}</p>}
        {place?.missing && (
          <p className={styles.missing}>
            Este espaço não está mais disponível. Remova a parada para salvar o roteiro.
          </p>
        )}

        <div className={styles.times}>
          <TimeField
            label="Chegada"
            value={stop.startTime}
            onChange={(value) => onTimeChange(stop.key, 'startTime', value)}
            disabled={disabled}
          />
          <TimeField
            label="Saída"
            value={stop.endTime}
            onChange={(value) => onTimeChange(stop.key, 'endTime', value)}
            disabled={disabled}
            describedBy={timeError ? errorId : undefined}
          />
        </div>
        {timeError && (
          <p id={errorId} className={styles.timeError}>
            {timeError}
          </p>
        )}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => onMove(index, index - 1)}
          disabled={disabled || index === 0}
          aria-label={describe('Mover para cima')}
        >
          <span aria-hidden="true">↑</span>
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => onMove(index, index + 1)}
          disabled={disabled || index === total - 1}
          aria-label={describe('Mover para baixo')}
        >
          <span aria-hidden="true">↓</span>
        </button>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.remove}`}
          onClick={() => onRemove(stop.key)}
          disabled={disabled}
          aria-label={describe('Remover')}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </li>
  );
}

// stops: paradas do rascunho (pages/itineraryDraft.js); places: nome e categoria por id.
export default function ItineraryTimeline({
  stops,
  places = {},
  disabled = false,
  onMove,
  onRemove,
  onTimeChange,
}) {
  if (stops.length === 0) {
    return (
      <p className={styles.empty}>
        Nenhuma parada ainda. Adicione espaços culturais para montar o roteiro.
      </p>
    );
  }

  return (
    <ol className={styles.list} aria-label="Paradas do roteiro">
      {stops.map((stop, index) => (
        <StopItem
          key={stop.key}
          stop={stop}
          index={index}
          total={stops.length}
          place={places[stop.placeId]}
          disabled={disabled}
          onMove={onMove}
          onRemove={onRemove}
          onTimeChange={onTimeChange}
        />
      ))}
    </ol>
  );
}
