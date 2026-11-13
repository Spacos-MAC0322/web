# web
Frontend do projeto Spaços

## Configuração

O frontend acessa o backend apenas por `src/services/api.js`. A URL da API vem da
variável `VITE_API_URL` (padrão: `http://localhost:8000`). Para alterá-la, copie
`.env.example` para `.env` e ajuste o valor.

## Testes e lint

- `npm test`: Vitest em modo observação, para o desenvolvimento.
- `npm run test:ci`: execução única e headless (jsdom), com relatório de cobertura em
  `coverage/` (texto no terminal, HTML e lcov). É o comando usado na CI.
- `npm run lint`: ESLint em todo o projeto.

Os testes ficam ao lado do código (`*.test.js` / `*.test.jsx` em `src/`) e usam
Vitest com Testing Library (`@testing-library/react`, `@testing-library/user-event` e
os matchers do `@testing-library/jest-dom`). O `src/setupTests.js` roda antes de cada
arquivo de teste: registra os matchers, desmonta os componentes após cada teste e
simula o `ResizeObserver`, ausente no jsdom e usado pelo componente `Map`.

A CI (`.github/workflows/ci.yml`) roda lint, testes com cobertura e build a cada push
e pull request.
