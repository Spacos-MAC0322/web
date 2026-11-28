// src/components/ItineraryTimeline.jsx
// Paradas do roteiro em ordem de visita (issue #87): nome do local, horários de chegada e
// saída e os controles de ordem. A alça ⠿ arrasta a parada (mouse, toque ou teclado, via
// @dnd-kit); os botões ↑/↓ fazem o mesmo em um passo, para quem prefere não arrastar.
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import { dragMove, stopTimeError } from '../pages/itineraryDraft';
import { placePath } from '../services/places';
import styles from './ItineraryTimeline.module.css';

const UNKNOWN_NAME = 'Local sem nome';
const MISSING_NAME = 'Local indisponível';

// Pequeno movimento antes de começar a arrastar: um toque ou clique na alça não vira arrasto.
const POINTER_ACTIVATION = { activationConstraint: { distance: 5 } };

const SCREEN_READER_INSTRUCTIONS = {
  draggable:
    'Para mudar a ordem, pressione espaço ou Enter para pegar a parada, use as setas para ' +
    'cima e para baixo e pressione espaço ou Enter de novo para soltar. Esc cancela.',
};

function stopName(place) {
  if (place?.missing) return MISSING_NAME;
  return place?.name ?? UNKNOWN_NAME;
}

// Anúncios do @dnd-kit em português, com o nome e a posição de cada parada.
function announcementsFor(stops, places) {
  const describe = (id) => {
    const index = stops.findIndex((stop) => stop.key === id);
    if (index < 0) return 'parada';
    return `${stopName(places[stops[index].placeId])}, parada ${index + 1}`;
  };
  const position = (id) => stops.findIndex((stop) => stop.key === id) + 1;
  return {
    onDragStart: ({ active }) => `Você pegou ${describe(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${describe(active.id)} está na posição ${position(over.id)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `${describe(active.id)} foi solta na posição ${position(over.id)}.`
        : `${describe(active.id)} foi solta fora da lista.`,
    onDragCancel: ({ active }) => `Movimento cancelado. ${describe(active.id)} voltou ao lugar.`,
  };
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
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: stop.key,
      disabled,
      attributes: { roleDescription: 'parada arrastável' },
    });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${styles.stop} ${isDragging ? styles.dragging : ''}`.trim()}
      aria-label={`Parada ${number}: ${name}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className={styles.handle}
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label={describe('Arrastar')}
      >
        <span aria-hidden="true">⠿</span>
      </button>

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
  const sensors = useSensors(
    useSensor(PointerSensor, POINTER_ACTIVATION),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (stops.length === 0) {
    return (
      <p className={styles.empty}>
        Nenhuma parada ainda. Adicione espaços culturais para montar o roteiro.
      </p>
    );
  }

  const handleDragEnd = ({ active, over }) => {
    const move = dragMove(stops, active.id, over?.id);
    if (move) onMove(move.from, move.to);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements: announcementsFor(stops, places),
        screenReaderInstructions: SCREEN_READER_INSTRUCTIONS,
      }}
    >
      <SortableContext items={stops.map((stop) => stop.key)} strategy={verticalListSortingStrategy}>
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
      </SortableContext>
    </DndContext>
  );
}
