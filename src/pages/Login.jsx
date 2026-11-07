// src/pages/Login.jsx
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthStatus, useAuth } from '../hooks/useAuth';
import { AuthMode, PASSWORD_MIN_LENGTH, validate } from './loginValidation';
import styles from './Login.module.css';

const EMPTY_VALUES = { name: '', email: '', password: '', confirmPassword: '' };

const EMAIL_FIELD = {
  id: 'email',
  label: 'E-mail',
  type: 'email',
  inputMode: 'email',
  autoComplete: 'email',
};

// Textos e campos de cada modo; o formulário é montado a partir desta configuração.
const MODES = {
  [AuthMode.LOGIN]: {
    title: 'Entrar no Spaços',
    subtitle: 'Acesse seus roteiros e lugares salvos na web e no celular.',
    submit: 'Entrar',
    submitting: 'Entrando…',
    fields: [
      EMAIL_FIELD,
      { id: 'password', label: 'Senha', type: 'password', autoComplete: 'current-password' },
    ],
  },
  [AuthMode.REGISTER]: {
    title: 'Criar conta',
    subtitle: 'Salve roteiros e listas e encontre tudo em qualquer dispositivo.',
    submit: 'Criar conta',
    submitting: 'Criando conta…',
    fields: [
      { id: 'name', label: 'Nome', autoComplete: 'name' },
      EMAIL_FIELD,
      {
        id: 'password',
        label: 'Senha',
        type: 'password',
        autoComplete: 'new-password',
        hint: `Pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
      },
      {
        id: 'confirmPassword',
        label: 'Confirme a senha',
        type: 'password',
        autoComplete: 'new-password',
      },
    ],
  },
};

function submitCredentials(mode, values, { login, register }) {
  const email = values.email.trim();
  if (mode === AuthMode.REGISTER) {
    return register({ name: values.name.trim(), email, password: values.password });
  }
  return login(email, values.password);
}

// Estado do formulário: valores, erros por campo, erro do servidor e envio.
function useAuthForm(onSuccess) {
  const auth = useAuth();
  const [mode, setMode] = useState(AuthMode.LOGIN);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next) {
    setMode(next);
    setErrors({});
    setServerError('');
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const found = validate(mode, values);
    setErrors(found);
    setServerError('');
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      event.currentTarget.elements[firstInvalid]?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await submitCredentials(mode, values, auth);
      onSuccess();
    } catch (error) {
      setServerError(error.message || 'Não foi possível concluir. Tente novamente.');
      setSubmitting(false);
    }
  }

  return { mode, values, errors, serverError, submitting, switchMode, handleChange, handleSubmit };
}

function Field({ id, label, error, hint, ...inputProps }) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ');
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        className={styles.input}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  );
}

function ModeToggle({ mode, onChange }) {
  return (
    <div className={styles.toggle} role="group" aria-label="Entrar ou criar conta">
      {[AuthMode.LOGIN, AuthMode.REGISTER].map((option) => (
        <button
          key={option}
          type="button"
          className={styles.toggleButton}
          aria-pressed={mode === option}
          onClick={() => onChange(option)}
        >
          {MODES[option].submit}
        </button>
      ))}
    </div>
  );
}

function AuthForm({ form }) {
  const config = MODES[form.mode];
  return (
    <form className={styles.form} onSubmit={form.handleSubmit} noValidate>
      {config.fields.map((field) => (
        <Field
          key={field.id}
          {...field}
          value={form.values[field.id]}
          onChange={form.handleChange}
          error={form.errors[field.id]}
        />
      ))}
      <button type="submit" className={styles.primaryButton} disabled={form.submitting}>
        {form.submitting ? config.submitting : config.submit}
      </button>
    </form>
  );
}

function SignedIn({ user, onLogout }) {
  return (
    <section className={styles.card} aria-labelledby="signed-in-title">
      <h1 id="signed-in-title" className={styles.title}>
        Olá, {user.name || user.email}!
      </h1>
      <p className={styles.subtitle}>
        Você entrou como <strong>{user.email}</strong>. Seus roteiros e listas ficam salvos na
        sua conta.
      </p>
      <button type="button" className={styles.secondaryButton} onClick={onLogout}>
        Sair
      </button>
    </section>
  );
}

export default function Login() {
  const { user, status, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Volta para a página que pediu login (state.from) ou para o início.
  const form = useAuthForm(() => navigate(location.state?.from ?? '/', { replace: true }));

  if (status === AuthStatus.LOADING) {
    return (
      <p className={styles.loading} role="status">
        Carregando sua conta…
      </p>
    );
  }

  const config = MODES[form.mode];
  return (
    <div className={styles.page}>
      {status === AuthStatus.AUTHENTICATED ? (
        <SignedIn user={user} onLogout={logout} />
      ) : (
        <section className={styles.card} aria-labelledby="auth-title">
          <ModeToggle mode={form.mode} onChange={form.switchMode} />
          <h1 id="auth-title" className={styles.title}>
            {config.title}
          </h1>
          <p className={styles.subtitle}>{config.subtitle}</p>
          {form.serverError && (
            <p className={styles.alert} role="alert">
              {form.serverError}
            </p>
          )}
          <AuthForm form={form} />
        </section>
      )}
    </div>
  );
}
