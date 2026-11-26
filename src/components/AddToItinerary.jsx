// src/components/AddToItinerary.jsx
// "Adicionar ao roteiro" na página de um espaço (user story #11): abre um painel com os
// roteiros do usuário para acrescentar o espaço como última parada, ou cria um roteiro novo
// já com ele. Sem sessão, leva ao login e volta para o espaço, como o botão Favoritar.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useApiRequest, { RequestStatus } from '../hooks/useApiRequest';
import { useAuth } from '../hooks/useAuth';
import { itineraryPath, NEW_ITINERARY_PATH, stopCountText } from '../pages/itineraryFormat';
import { addPlaceToItinerary, listItineraries } from '../services/itineraries';
import RequestError from './RequestError';
import styles from './AddToItinerary.module.css';

const LIST_ERROR = 'Não foi possível carregar seus roteiros. Tente novamente.';
const ADD_ERROR = 'Não foi possível adicionar o espaço ao roteiro. Tente novamente.';

function ItineraryChoices({ place, onAdded }) {
  const load = useCallback((signal) => listItineraries({ signal }), []);
  const { data, status, error, retry } = useApiRequest(load);
  const [adding, setAdding] = useState(null);
  const [addError, setAddError] = useState(null);

  const add = async (itinerary) => {
    setAdding(itinerary.id);
    setAddError(null);
    try {
      await addPlaceToItinerary(itinerary.id, place.id);
      onAdded(itinerary);
    } catch (failure) {
      setAddError(failure);
    } finally {
      setAdding(null);
    }
  };

  if (status === RequestStatus.ERROR) {
    return <RequestError error={error} onRetry={retry} fallbackMessage={LIST_ERROR} />;
  }
  if (status !== RequestStatus.SUCCESS) {
    return <p className={styles.note}>Carregando seus roteiros…</p>;
  }
  if (data.length === 0) {
    return <p className={styles.note}>Você ainda não tem roteiros salvos.</p>;
  }
  return (
    <>
      <ul className={styles.choices} aria-label="Seus roteiros">
        {data.map((itinerary) => (
          <li key={itinerary.id}>
            <button
              type="button"
              className={styles.choice}
              onClick={() => add(itinerary)}
              disabled={adding !== null}
              aria-label={`Adicionar a ${itinerary.title}`}
            >
              <span className={styles.choiceTitle}>{itinerary.title}</span>
              <span className={styles.choiceMeta}>
                {adding === itinerary.id ? 'Adicionando…' : stopCountText(itinerary.stopCount)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {addError && <RequestError error={addError} fallbackMessage={ADD_ERROR} />}
    </>
  );
}

// place: o espaço da página de detalhes (GET /api/places/{id}).
export default function AddToItinerary({ place }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const panelId = useId();
  const toggleRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(null);

  // Esc fecha o painel e devolve o foco ao botão que o abriu.
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);

  const toggle = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    setAdded(null);
    setOpen((current) => !current);
  };

  const startNew = () => {
    const category = place.primary_category ?? place.categories?.[0] ?? null;
    navigate(NEW_ITINERARY_PATH, {
      state: {
        itinerary: { title: '', date: null, stops: [{ placeId: place.id }] },
        places: { [place.id]: { name: place.name, category } },
      },
    });
  };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        ref={toggleRef}
        className={styles.toggle}
        onClick={toggle}
        aria-expanded={isAuthenticated ? open : undefined}
        aria-controls={isAuthenticated ? panelId : undefined}
      >
        <span aria-hidden="true">＋</span> Adicionar ao roteiro
      </button>

      {open && (
        <div id={panelId} className={styles.panel} role="group" aria-label={`Adicionar ${place.name} a um roteiro`}>
          {added ? (
            <p className={styles.success} role="status">
              {place.name} foi adicionado a <strong>{added.title}</strong>.{' '}
              <Link to={itineraryPath(added.id)} className={styles.link}>
                Ver roteiro
              </Link>
            </p>
          ) : (
            <>
              <button type="button" className={styles.newButton} onClick={startNew}>
                Novo roteiro com este lugar
              </button>
              <ItineraryChoices place={place} onAdded={setAdded} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
