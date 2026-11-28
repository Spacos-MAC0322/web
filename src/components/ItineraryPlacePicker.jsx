// src/components/ItineraryPlacePicker.jsx
// Adicionar paradas ao roteiro (issue #87): busca de espaços por nome, bairro ou região em
// toda a cidade e atalho para os favoritos do usuário. A busca só devolve espaços
// publicados, os mesmos que o backend aceita salvar no roteiro.
import { useCallback, useEffect, useId, useState } from 'react';
import useApiRequest, { RequestStatus } from '../hooks/useApiRequest';
import { useFavorites } from '../hooks/useFavorites';
import { fetchPlacesByText } from '../services/places';
import RequestError from './RequestError';
import SearchBar from './SearchBar';
import styles from './ItineraryPlacePicker.module.css';

export const SEARCH_DEBOUNCE_MS = 300;
export const MIN_QUERY_LENGTH = 2;
export const MAX_RESULTS = 8;
const MAX_QUERY_LENGTH = 100;
const SEARCH_ERROR = 'Não foi possível buscar espaços. Tente novamente.';

// Espera o usuário parar de digitar antes de consultar; Enter consulta na hora.
function useDebouncedQuery() {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const next = text.trim();
    if (next === query) return undefined;
    const timer = setTimeout(() => setQuery(next), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, query]);

  const submit = useCallback(() => setQuery(text.trim()), [text]);
  return { text, setText, query, submit };
}

function PlaceOption({ place, onAdd, disabled }) {
  return (
    <li className={styles.option}>
      <div className={styles.optionText}>
        <span className={styles.optionName}>{place.name}</span>
        {(place.neighborhood || place.category) && (
          <span className={styles.optionMeta}>
            {[place.neighborhood, place.category].filter(Boolean).join(' · ')}
          </span>
        )}
      </div>
      <button
        type="button"
        className={styles.addButton}
        onClick={() => onAdd(place)}
        disabled={disabled}
        aria-label={`Adicionar ${place.name} ao roteiro`}
      >
        Adicionar
      </button>
    </li>
  );
}

function SearchResults({ query, onAdd, disabled }) {
  const search = useCallback(
    (signal) =>
      query.length < MIN_QUERY_LENGTH ? Promise.resolve(null) : fetchPlacesByText(query, { signal }),
    [query],
  );
  const { data, status, error, retry } = useApiRequest(search);

  if (query.length < MIN_QUERY_LENGTH) return null;
  if (status === RequestStatus.ERROR) {
    return <RequestError error={error} onRetry={retry} fallbackMessage={SEARCH_ERROR} />;
  }
  if (status !== RequestStatus.SUCCESS) {
    return <p className={styles.note}>Buscando…</p>;
  }
  if (data.length === 0) {
    return <p className={styles.note}>Nenhum espaço encontrado para “{query}”.</p>;
  }
  const shown = data.slice(0, MAX_RESULTS);
  return (
    <>
      <ul className={styles.options} aria-label={`Resultados para ${query}`}>
        {shown.map((place) => (
          <PlaceOption key={place.id} place={place} onAdd={onAdd} disabled={disabled} />
        ))}
      </ul>
      {data.length > shown.length && (
        <p className={styles.note}>
          Mostrando {shown.length} de {data.length}. Refine a busca para encontrar outros.
        </p>
      )}
    </>
  );
}

function FavoriteOptions({ onAdd, disabled, headingId }) {
  const { favorites, status } = useFavorites();
  if (status !== RequestStatus.SUCCESS) return null;
  return (
    <div className={styles.group}>
      <h3 id={headingId} className={styles.groupTitle}>
        Seus favoritos
      </h3>
      {favorites.length === 0 ? (
        <p className={styles.note}>
          Favorite espaços na página de cada lugar para adicioná-los aqui com um toque.
        </p>
      ) : (
        <ul className={styles.options} aria-labelledby={headingId}>
          {favorites.map((place) => (
            <PlaceOption key={place.id} place={place} onAdd={onAdd} disabled={disabled} />
          ))}
        </ul>
      )}
    </div>
  );
}

// onAdd(place): place tem id, name e category; isFull: o roteiro chegou ao limite.
export default function ItineraryPlacePicker({ onAdd, disabled = false, isFull = false }) {
  const headingId = useId();
  const { text, setText, query, submit } = useDebouncedQuery();
  const [announcement, setAnnouncement] = useState('');
  const blocked = disabled || isFull;

  const add = useCallback(
    (place) => {
      onAdd(place);
      setAnnouncement(`${place.name} adicionado ao roteiro.`);
    },
    [onAdd],
  );

  return (
    <section className={styles.picker} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.title}>
        Adicionar paradas
      </h2>
      {isFull && (
        <p className={styles.note}>O roteiro chegou ao limite de paradas.</p>
      )}

      <SearchBar
        label="Buscar espaços para adicionar ao roteiro"
        placeholder="Busque por nome, bairro ou região"
        autoComplete="off"
        maxLength={MAX_QUERY_LENGTH}
        value={text}
        onChange={setText}
        onSubmit={submit}
      />
      <SearchResults query={query} onAdd={add} disabled={blocked} />

      <FavoriteOptions onAdd={add} disabled={blocked} headingId={`${headingId}-favoritos`} />

      {/* Só aria-live: o editor já tem um role="status" para o estado de salvamento. */}
      <p className="visually-hidden" aria-live="polite" data-testid="picker-announcement">
        {announcement}
      </p>
    </section>
  );
}
