import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, AuthStatus } from '../hooks/useAuth';
import { FavoritesContext, useFavoritesState } from '../hooks/useFavorites';
import { ApiError, ApiErrorKind } from '../services/api';
import { addFavoritePlace, fetchFavorites, removeFavoritePlace } from '../services/favorites';
import Salvos from './Salvos';

vi.mock('../services/favorites', () => ({
  fetchFavorites: vi.fn(),
  addFavoritePlace: vi.fn(),
  removeFavoritePlace: vi.fn(),
}));

const FAVORITE_A = {
  id: 'mapas_saas:space:31',
  name: 'Casa de Cultura do Butantã',
  category: 'Casa de Cultura',
  neighborhood: null,
  summary: null,
  badges: { is_free: true },
};

const FAVORITE_B = {
  id: 'mapas_saas:space:42',
  name: 'Centro Cultural São Paulo',
  category: 'Centro Cultural',
  neighborhood: null,
  summary: null,
  badges: {},
};

function FavoritesHarness({ children }) {
  const favorites = useFavoritesState();
  return <FavoritesContext value={favorites}>{children}</FavoritesContext>;
}

function renderSalvos({
  auth = {
    user: { id: 'u1', name: 'Ana', email: 'ana@example.com' },
    status: AuthStatus.AUTHENTICATED,
    isAuthenticated: true,
  },
  initialPath = '/salvos',
} = {}) {
  return render(
    <AuthContext value={auth}>
      <FavoritesHarness>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/salvos" element={<Salvos />} />
            <Route path="/login" element={<p>Página de Login</p>} />
            <Route path="/explorar" element={<p>Página Explorar</p>} />
            <Route path="/lugar/:id" element={<p>Detalhes do Lugar</p>} />
          </Routes>
        </MemoryRouter>
      </FavoritesHarness>
    </AuthContext>,
  );
}

describe('página Salvos (Meus Favoritos)', () => {
  beforeEach(() => {
    fetchFavorites.mockReset();
    addFavoritePlace.mockReset();
    removeFavoritePlace.mockReset();
  });

  it('pede login quando o usuário não está autenticado', async () => {
    renderSalvos({
      auth: { user: null, status: AuthStatus.ANONYMOUS, isAuthenticated: false },
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Meus Favoritos' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Entre para ver seus espaços salvos' }),
    ).toBeInTheDocument();
    expect(fetchFavorites).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('link', { name: 'Entrar na conta' }));
    expect(screen.getByText('Página de Login')).toBeInTheDocument();
  });

  it('mostra estado vazio quando o usuário logado ainda não tem favoritos', async () => {
    fetchFavorites.mockResolvedValue([]);
    renderSalvos();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Você ainda não salvou nenhum espaço',
      }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Explorar espaços' }));
    expect(screen.getByText('Página Explorar')).toBeInTheDocument();
  });

  it('lista os espaços favoritos, permite abrir detalhes ou remover itens da lista', async () => {
    fetchFavorites.mockResolvedValue([FAVORITE_A, FAVORITE_B]);
    removeFavoritePlace.mockResolvedValue(undefined);
    renderSalvos();

    const list = await screen.findByRole('list', { name: 'Espaços culturais favoritos' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(
      within(list).getByRole('link', { name: 'Casa de Cultura do Butantã' }),
    ).toHaveAttribute('href', '/lugar/mapas_saas%3Aspace%3A31');

    const removeBtn = within(list).getByRole('button', {
      name: 'Remover Casa de Cultura do Butantã dos favoritos',
    });
    expect(removeBtn).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(removeBtn);
    expect(removeFavoritePlace).toHaveBeenCalledWith('mapas_saas:space:31');
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(
      within(list).queryByRole('link', { name: 'Casa de Cultura do Butantã' }),
    ).not.toBeInTheDocument();
  });

  it('mostra erro da API e permite tentar novamente', async () => {
    fetchFavorites
      .mockRejectedValueOnce(
        new ApiError('Não foi possível consultar os favoritos no momento.', {
          kind: ApiErrorKind.SERVER,
          status: 503,
        }),
      )
      .mockResolvedValueOnce([FAVORITE_A]);
    renderSalvos();

    expect(
      await screen.findByText('Não foi possível consultar os favoritos no momento.'),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(
      await screen.findByRole('link', { name: 'Casa de Cultura do Butantã' }),
    ).toBeInTheDocument();
  });
});
