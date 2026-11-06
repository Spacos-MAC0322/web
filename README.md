# web
Frontend do projeto Spaços

## Configuração

O frontend acessa o backend apenas por `src/services/api.js`. A URL da API vem da
variável `VITE_API_URL` (padrão: `http://localhost:8000`). Para alterá-la, copie
`.env.example` para `.env` e ajuste o valor.
