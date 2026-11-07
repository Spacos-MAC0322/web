// src/pages/loginValidation.js
// Validação do formulário de login/cadastro. Espelha as regras do backend
// (app/schemas/user.py) para avisar o usuário antes de enviar a requisição.

export const AuthMode = Object.freeze({ LOGIN: 'login', REGISTER: 'register' });

export const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72; // limite do bcrypt
const NAME_MAX_LENGTH = 100;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value) {
  const email = value.trim();
  if (!email) return 'Informe seu e-mail.';
  if (!EMAIL_PATTERN.test(email)) return 'Informe um e-mail válido, como nome@exemplo.com.';
  return null;
}

function validateNewPassword(value) {
  if (!value) return 'Crie uma senha.';
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES) {
    return 'A senha é longa demais. Use até 72 caracteres.';
  }
  return null;
}

function validateName(value) {
  const name = value.trim();
  if (!name) return 'Informe seu nome.';
  if (name.length > NAME_MAX_LENGTH) {
    return `O nome deve ter no máximo ${NAME_MAX_LENGTH} caracteres.`;
  }
  return null;
}

// Devolve { campo: mensagem } apenas para os campos inválidos.
export function validate(mode, values) {
  const errors = {
    email: validateEmail(values.email),
  };
  if (mode === AuthMode.REGISTER) {
    errors.name = validateName(values.name);
    errors.password = validateNewPassword(values.password);
    if (!errors.password && values.confirmPassword !== values.password) {
      errors.confirmPassword = 'As senhas não conferem.';
    }
  } else if (!values.password) {
    errors.password = 'Informe sua senha.';
  }
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}
