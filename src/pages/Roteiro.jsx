// src/pages/Roteiro.jsx
// Editor de roteiro (/rotas/novo e /rotas/:id, issue #87): nome, data e paradas em ordem,
// com horário de chegada e saída. Salvar cria (POST) ou substitui (PUT) o roteiro inteiro.
import { useEffect, useId } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import ItineraryPlacePicker from '../components/ItineraryPlacePicker';
import ItineraryTimeline from '../components/ItineraryTimeline';
import RequestError from '../components/RequestError';
import { AuthStatus, useAuth } from '../hooks/useAuth';
import useItineraryEditor, { EditorStatus, Mutation } from '../hooks/useItineraryEditor';
import { MAX_STOPS, MAX_TITLE_LENGTH } from './itineraryDraft';
import { itineraryPath, NEW_ITINERARY_PATH } from './itineraryFormat';
import { RoutesLoginPrompt } from './Rotas';
import styles from './Roteiro.module.css';

const LOAD_ERROR = 'Não foi possível carregar este roteiro. Tente novamente.';
const SAVE_ERROR = 'Não foi possível salvar o roteiro. Tente novamente.';
const DELETE_CONFIRMATION = 'Excluir este roteiro? Essa ação não pode ser desfeita.';

function BackLink() {
  return (
    <Link to="/rotas" className={styles.backLink}>
      ← Meus roteiros
    </Link>
  );
}

function NotFound() {
  return (
    <div className={styles.state}>
      <h1 className={styles.stateTitle}>Roteiro não encontrado</h1>
      <p>O endereço pode estar incorreto ou o roteiro foi excluído.</p>
      <BackLink />
    </div>
  );
}

// Fechar ou recarregar a aba com alterações pendentes pede confirmação do navegador.
function useWarnBeforeUnload(active) {
  useEffect(() => {
    if (!active) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [active]);
}

function SaveStatus({ editor }) {
  if (editor.mutation === Mutation.SAVING) return 'Salvando…';
  if (editor.mutation === Mutation.DELETING) return 'Excluindo…';
  if (editor.isDirty) return 'Alterações não salvas';
  return editor.isNew ? '' : 'Todas as alterações foram salvas';
}

function ItineraryEditor({ id, initial }) {
  const navigate = useNavigate();
  const editor = useItineraryEditor(id, { initial });
  const { draft, status } = editor;
  const titleId = useId();
  const dateId = useId();
  const busy = editor.mutation !== Mutation.IDLE;

  useWarnBeforeUnload(editor.isDirty);

  if (status === EditorStatus.NOT_FOUND) return <NotFound />;
  if (status === EditorStatus.ERROR) {
    return (
      <div className={styles.state}>
        <h1 className={styles.stateTitle}>Não foi possível abrir este roteiro</h1>
        <RequestError error={editor.loadError} onRetry={editor.retry} fallbackMessage={LOAD_ERROR} />
        <BackLink />
      </div>
    );
  }
  if (status === EditorStatus.LOADING) {
    return (
      <p className={styles.loading} role="status">
        Carregando roteiro…
      </p>
    );
  }

  const handleSave = async () => {
    const wasNew = editor.isNew;
    const saved = await editor.save();
    // O roteiro novo ganha endereço próprio; o editor de lá começa com o que já se sabe.
    if (saved && wasNew) {
      navigate(itineraryPath(saved.id), {
        replace: true,
        state: { itinerary: saved, places: draft.places },
      });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(DELETE_CONFIRMATION)) return;
    if (await editor.remove()) navigate('/rotas', { replace: true });
  };

  const hasMissingPlace = draft.stops.some((stop) => draft.places[stop.placeId]?.missing);

  // <div>, não <form>: a busca de locais é um formulário próprio, e HTML não permite um
  // formulário dentro de outro. Salvar acontece só pelo botão.
  return (
    <div className={styles.page}>
      <BackLink />
      <header className={styles.header}>
        <h1 className={styles.title}>{draft.title.trim() || (editor.isNew ? 'Novo roteiro' : 'Roteiro')}</h1>
      </header>

      <section className={styles.details} aria-label="Dados do passeio">
        <div className={styles.field}>
          <label htmlFor={titleId} className={styles.label}>
            Nome do passeio
          </label>
          <input
            id={titleId}
            type="text"
            className={styles.input}
            value={draft.title}
            onChange={(event) => editor.setTitle(event.target.value)}
            maxLength={MAX_TITLE_LENGTH}
            placeholder="Ex.: Sábado no centro"
            required
            disabled={busy}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={dateId} className={styles.label}>
            Data
          </label>
          <input
            id={dateId}
            type="date"
            className={styles.input}
            value={draft.date}
            onChange={(event) => editor.setDate(event.target.value)}
            disabled={busy}
          />
        </div>
      </section>

      <section className={styles.stops} aria-labelledby={`${titleId}-paradas`}>
        <div className={styles.sectionHeader}>
          <h2 id={`${titleId}-paradas`} className={styles.sectionTitle}>
            Paradas
          </h2>
          <p className={styles.count}>
            {draft.stops.length} de {MAX_STOPS}
          </p>
        </div>
        <ItineraryTimeline
          stops={draft.stops}
          places={draft.places}
          disabled={busy}
          onMove={editor.moveStop}
          onRemove={editor.removeStop}
          onTimeChange={editor.setTime}
        />
      </section>

      <ItineraryPlacePicker
        onAdd={editor.addStop}
        disabled={busy}
        isFull={draft.stops.length >= MAX_STOPS}
      />

      {editor.error && (
        <RequestError error={editor.error} fallbackMessage={SAVE_ERROR} />
      )}
      {hasMissingPlace && (
        <p className={styles.hint}>Remova as paradas indisponíveis para salvar o roteiro.</p>
      )}
      {!draft.title.trim() && (
        <p className={styles.hint}>Dê um nome ao passeio para salvar.</p>
      )}

      <div className={styles.footer}>
        <p className={styles.saveStatus} role="status">
          <SaveStatus editor={editor} />
        </p>
        <div className={styles.footerActions}>
          {!editor.isNew && (
            <button
              type="button"
              className={styles.dangerButton}
              onClick={handleDelete}
              disabled={busy}
            >
              Excluir roteiro
            </button>
          )}
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleSave}
            disabled={!editor.canSave || !editor.isDirty || hasMissingPlace}
          >
            {editor.isNew ? 'Criar roteiro' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Roteiro() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { status, isAuthenticated } = useAuth();
  const itineraryId = id ?? null;
  const from = itineraryId ? itineraryPath(itineraryId) : NEW_ITINERARY_PATH;
  const seed = location.state?.itinerary ? location.state : null;

  // O navegador guarda o state no histórico, inclusive ao recarregar: depois de usado ele é
  // apagado, para que recarregar a página busque o roteiro atual no backend.
  useEffect(() => {
    if (seed) navigate(location.pathname, { replace: true, state: null });
  }, [seed, navigate, location.pathname]);

  if (status === AuthStatus.LOADING) {
    return (
      <p className={styles.loading} role="status">
        Carregando sua conta…
      </p>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className={styles.page}>
        <BackLink />
        <h1 className={styles.title}>Roteiro</h1>
        <RoutesLoginPrompt from={from} />
      </div>
    );
  }
  // Um editor por roteiro: trocar de endereço recomeça o estado do zero.
  return (
    <ItineraryEditor
      key={itineraryId ?? 'novo'}
      id={itineraryId}
      initial={seed}
    />
  );
}
