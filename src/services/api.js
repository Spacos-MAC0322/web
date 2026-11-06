// src/services/api.js
// Único ponto de acesso do frontend ao backend do Spaços (definição arquitetural, seção 5.3).
// O frontend nunca chama as APIs de dados abertos diretamente: quando uma delas falha,
// o backend responde 502/504 com o campo `service` indicando qual (DA05).
import axios from 'axios';

const DEFAULT_API_URL = 'http://localhost:8000';
const REQUEST_TIMEOUT_MS = 15000;
const TOKEN_STORAGE_KEY = 'spacos.token';

// Mesma regra do axios: "https://..." e "//host" saem do baseURL.
const ABSOLUTE_URL = /^([a-z][a-z\d+.-]*:)?\/\//i;
const TIMEOUT_CODES = new Set(['ECONNABORTED', 'ETIMEDOUT']);

export const ApiErrorKind = Object.freeze({
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  SERVER: 'server',
  EXTERNAL_SERVICE: 'external_service',
  CLIENT: 'client',
});

const RETRYABLE_KINDS = new Set([
  ApiErrorKind.NETWORK,
  ApiErrorKind.TIMEOUT,
  ApiErrorKind.SERVER,
  ApiErrorKind.EXTERNAL_SERVICE,
]);

// Nomes exibidos para os identificadores `service` enviados pelo backend.
const SERVICE_NAMES = {
  mapas_culturais: 'Mapas Culturais',
  geosampa: 'GeoSampa',
  sptrans: 'de transporte público (SPTrans)',
  open_meteo: 'de previsão do tempo',
};

const MESSAGES = {
  network: 'Não foi possível conectar ao Spaços. Verifique sua conexão e tente novamente.',
  timeout: 'O servidor demorou para responder. Tente novamente em instantes.',
  unavailable: 'O Spaços está temporariamente indisponível. Tente novamente em alguns minutos.',
  server: 'Ocorreu um erro inesperado no servidor. Tente novamente mais tarde.',
  client: 'Não foi possível concluir a requisição.',
};

// Erro único rejeitado pela instância: `message` já pode ser exibida ao usuário.
export class ApiError extends Error {
  constructor(message, { kind, status = null, service = null, detail = null, cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.service = service;
    this.detail = detail;
  }

  get isRetryable() {
    return RETRYABLE_KINDS.has(this.kind);
  }
}

// localStorage pode lançar exceção (modo privado, armazenamento bloqueado).
// Nesse caso o token fica só em memória, válido enquanto a aba estiver aberta.
let memoryToken = null;

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) ?? memoryToken;
  } catch {
    return memoryToken;
  }
}

export function setAuthToken(token) {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    memoryToken = null;
  } catch {
    memoryToken = token;
  }
}

export function clearAuthToken() {
  memoryToken = null;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Sem armazenamento disponível: não há token persistido para remover.
  }
}

// O token só acompanha caminhos relativos ao baseURL, nunca outro host.
function attachAuthToken(config) {
  const token = getAuthToken();
  if (token && !ABSOLUTE_URL.test(config.url ?? '')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

function fromMissingResponse(error) {
  const kind = TIMEOUT_CODES.has(error.code) ? ApiErrorKind.TIMEOUT : ApiErrorKind.NETWORK;
  return new ApiError(MESSAGES[kind], { kind, cause: error });
}

function fromServerStatus(status, options) {
  if (options.service) {
    const name = SERVICE_NAMES[options.service] ?? 'externo';
    const message = `O serviço ${name} está temporariamente indisponível. Algumas informações podem não aparecer.`;
    return new ApiError(message, { ...options, kind: ApiErrorKind.EXTERNAL_SERVICE });
  }
  if (status === 504) {
    return new ApiError(MESSAGES.timeout, { ...options, kind: ApiErrorKind.TIMEOUT });
  }
  const message = status === 502 || status === 503 ? MESSAGES.unavailable : MESSAGES.server;
  return new ApiError(message, { ...options, kind: ApiErrorKind.SERVER });
}

function fromResponse(error) {
  const { status, data } = error.response;
  const detail = data?.detail ?? null;
  const service = typeof data?.service === 'string' ? data.service : null;
  const options = { status, service, detail, cause: error };
  if (status >= 500) {
    return fromServerStatus(status, options);
  }
  const message = typeof detail === 'string' ? detail : MESSAGES.client;
  return new ApiError(message, { ...options, kind: ApiErrorKind.CLIENT });
}

// Cancelamentos (AbortController) e erros que não vieram do axios seguem inalterados.
function toApiError(error) {
  if (axios.isCancel(error) || !axios.isAxiosError(error)) {
    return error;
  }
  return error.response ? fromResponse(error) : fromMissingResponse(error);
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? DEFAULT_API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use(attachAuthToken);
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toApiError(error)),
);

export default api;
