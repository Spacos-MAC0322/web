// src/components/LocationSearchControl.jsx
// Seção "Perto de você" do painel da página Explorar (issues #3 e #47): endereço de
// referência, "Usar minha localização" e raio ajustável. O protótipo não desenha esta
// seção; ela segue o estilo do painel "Filtrar lugares" (título em sálvia, barra de busca).
import { useId, useState } from 'react';
import searchIcon from '../assets/icons/buscar.svg';
import locateIcon from '../assets/icons/localizar.svg';
import { RequestStatus } from '../hooks/useApiRequest';
import useAddressSearch, { MIN_QUERY_LENGTH } from '../hooks/useAddressSearch';
import { formatRadius } from '../services/geo';
import RequestError from './RequestError';
import styles from './LocationSearchControl.module.css';

export const RADIUS_MIN_KM = 0.5;
export const RADIUS_MAX_KM = 10;
const RADIUS_STEP_KM = 0.5;
const FALLBACK_ERROR = 'Não foi possível buscar o endereço. Tente novamente.';

const samePosition = (a, b) => Boolean(a && b) && a[0] === b[0] && a[1] === b[1];
const radiusText = (km) => `${String(km).replace('.', ',')} quilômetros`;

function MatchChoices({ matches, origin, onSelect }) {
  return (
    <ul className={styles.choiceList} aria-label="Lugares encontrados">
        {matches.map((match) => (
          <li key={match.position.join(',')}>
            <button
              type="button"
              className={styles.choice}
              aria-pressed={samePosition(match.position, origin?.position)}
              onClick={() => onSelect(match)}
            >
              <span className={styles.choiceLabel}>{match.label}</span>
              {match.neighborhood && (
                <span className={styles.choiceArea}>{match.neighborhood}</span>
              )}
            </button>
          </li>
        ))}
    </ul>
  );
}

// Mensagens curtas, anunciadas pela região de status; a lista de opções fica fora dela.
function SearchFeedback({ search }) {
  const { status, matches, error, retry } = search;
  if (status === RequestStatus.LOADING) return <p className={styles.hint}>Buscando endereço…</p>;
  if (status === RequestStatus.ERROR && error === 'too-short') {
    return <p className={styles.hint}>Digite pelo menos {MIN_QUERY_LENGTH} letras.</p>;
  }
  if (status === RequestStatus.ERROR) {
    return <RequestError error={error} onRetry={retry} fallbackMessage={FALLBACK_ERROR} />;
  }
  if (status === RequestStatus.SUCCESS && matches.length === 0) {
    return (
      <p className={styles.hint}>
        Não encontramos esse endereço em São Paulo. Tente o nome da rua com o bairro ou um
        lugar conhecido.
      </p>
    );
  }
  if (matches.length > 1) {
    return <p className={styles.hint}>Encontramos mais de um lugar. Qual deles?</p>;
  }
  return null;
}

function AddressForm({ search }) {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const submit = (event) => {
    event.preventDefault();
    search.search(query);
  };
  return (
    <form role="search" className={styles.form} onSubmit={submit}>
      <label htmlFor={inputId} className="visually-hidden">
        Endereço, bairro ou lugar de referência
      </label>
      <div className={styles.searchBar}>
        <img src={searchIcon} alt="" width="20" height="20" className={styles.searchIcon} />
        <input
          id={inputId}
          type="search"
          className={styles.input}
          placeholder="Endereço, bairro ou lugar"
          autoComplete="street-address"
          maxLength={200}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit" className={styles.submit}>
          Buscar
        </button>
      </div>
    </form>
  );
}

function RadiusSlider({ radiusKm, onChange }) {
  const sliderId = useId();
  return (
    <div className={styles.radius}>
      <label htmlFor={sliderId} className={styles.radiusLabel}>
        Raio da busca
      </label>
      {/* O leitor de tela já ouve o valor pelo aria-valuetext do controle. */}
      <span className={styles.radiusValue} aria-hidden="true">
        {formatRadius(radiusKm)}
      </span>
      <input
        id={sliderId}
        type="range"
        className={styles.slider}
        min={RADIUS_MIN_KM}
        max={RADIUS_MAX_KM}
        step={RADIUS_STEP_KM}
        value={radiusKm}
        aria-valuetext={radiusText(radiusKm)}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

// origin: ponto atual ({ label, position }) ou null; onSelect(match) define um endereço;
// onLocate pede a localização do navegador; locating/locateError vêm de useGeolocation.
export default function LocationSearchControl({
  origin,
  radiusKm,
  onRadiusChange,
  onSelect,
  onLocate,
  locating = false,
  locateError = null,
}) {
  const titleId = useId();
  const search = useAddressSearch(onSelect);
  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.eyebrow}>
        Perto de você
      </h2>
      <AddressForm search={search} />
      <div role="status" className={styles.feedback}>
        <SearchFeedback search={search} />
      </div>
      {search.matches.length > 1 && (
        <MatchChoices matches={search.matches} origin={origin} onSelect={onSelect} />
      )}
      <button
        type="button"
        className={styles.locate}
        onClick={onLocate}
        disabled={locating}
        aria-busy={locating}
      >
        <img src={locateIcon} alt="" width="21" height="21" />
        {locating ? 'Localizando…' : 'Usar minha localização'}
      </button>
      {locateError && (
        <p role="alert" className={styles.error}>
          {locateError}
        </p>
      )}
      <RadiusSlider radiusKm={radiusKm} onChange={onRadiusChange} />
    </section>
  );
}
