import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, AuthStatus } from '../hooks/useAuth';
import { ApiError, ApiErrorKind } from '../services/api';
import { addPlaceToItinerary, listItineraries } from '../services/itineraries';
import AddToItinerary from './AddToItinerary';

vi.mock('../services/itineraries', () => ({
  addPlaceToItinerary: vi.fn(),
  listItineraries: vi.fn(),
}));

const PLACE = { id: 'museu', name: 'Museu Afro Brasil', primary_category: 'Museu' };
const LOGGED_IN = { user: { id: 'u1' }, status: AuthStatus.AUTHENTICATED, isAuthenticated: true };
const ANONYMOUS = { user: null, status: AuthStatus.ANONYMOUS, isAuthenticated: false };
const ITINERARIES = [
  { id: 'abc', title: 'Sábado no centro', date: '2026-11-28', stopCount: 2 },
  { id: 'def', title: 'Domingo', date: null, stopCount: 1 },
];

function Destination() {
  const location = useLocation();
  return (
    <>
      <p>Destino {location.pathname}</p>
      <div data-testid="state">{JSON.stringify(location.state)}</div>
    </>
  );
}

function renderButton(auth = LOGGED_IN) {
  return render(
    <AuthContext value={auth}>
      <MemoryRouter initialEntries={['/lugar/museu?aba=1']}>
        <Routes>
          <Route path="/lugar/:id" element={<AddToItinerary place={PLACE} />} />
          <Route path="*" element={<Destination />} />
        </Routes>
      </MemoryRouter>
    </AuthContext>,
  );
}

function toggle() {
  return screen.getByRole('button', { name: /Adicionar ao roteiro/ });
}

describe('AddToItinerary', () => {
  it('leva ao login e guarda o espaço como volta, sem sessão', async () => {
    renderButton(ANONYMOUS);
    expect(toggle()).not.toHaveAttribute('aria-expanded');
    await userEvent.click(toggle());
    expect(screen.getByText('Destino /login')).toBeInTheDocument();
    expect(screen.getByTestId('state')).toHaveTextContent('{"from":"/lugar/museu?aba=1"}');
    expect(listItineraries).not.toHaveBeenCalled();
  });

  it('abre o painel com os roteiros e fecha com Esc devolvendo o foco', async () => {
    listItineraries.mockResolvedValue(ITINERARIES);
    renderButton();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    const panel = screen.getByRole('group', { name: 'Adicionar Museu Afro Brasil a um roteiro' });
    const choices = await within(panel).findByRole('list', { name: 'Seus roteiros' });
    expect(within(choices).getByRole('button', { name: 'Adicionar a Sábado no centro' })).toHaveTextContent(
      '2 paradas',
    );

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(toggle()).toHaveFocus();
  });

  it('acrescenta o espaço ao roteiro escolhido e oferece o link para ele', async () => {
    listItineraries.mockResolvedValue(ITINERARIES);
    addPlaceToItinerary.mockResolvedValue({});
    renderButton();
    await userEvent.click(toggle());
    await userEvent.click(await screen.findByRole('button', { name: 'Adicionar a Domingo' }));

    expect(addPlaceToItinerary).toHaveBeenCalledWith('def', 'museu');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Museu Afro Brasil foi adicionado a Domingo.',
    );
    await userEvent.click(screen.getByRole('link', { name: 'Ver roteiro' }));
    expect(screen.getByText('Destino /rotas/def')).toBeInTheDocument();
  });

  it('mostra o motivo quando não consegue adicionar', async () => {
    listItineraries.mockResolvedValue(ITINERARIES);
    addPlaceToItinerary.mockRejectedValue(
      new ApiError('Este roteiro já tem 50 paradas, o limite.', { kind: ApiErrorKind.CLIENT }),
    );
    renderButton();
    await userEvent.click(toggle());
    await userEvent.click(await screen.findByRole('button', { name: 'Adicionar a Sábado no centro' }));
    expect(await screen.findByText('Este roteiro já tem 50 paradas, o limite.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar a Sábado no centro' })).toBeEnabled();
  });

  it('cria um roteiro novo já com o espaço', async () => {
    listItineraries.mockResolvedValue([]);
    renderButton();
    await userEvent.click(toggle());
    expect(await screen.findByText('Você ainda não tem roteiros salvos.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Novo roteiro com este lugar' }));
    expect(screen.getByText('Destino /rotas/novo')).toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId('state').textContent)).toEqual({
      itinerary: { title: '', date: null, stops: [{ placeId: 'museu' }] },
      places: { museu: { name: 'Museu Afro Brasil', category: 'Museu' } },
    });
  });

  it('mostra o erro da lista e tenta de novo', async () => {
    listItineraries
      .mockRejectedValueOnce(new ApiError('Fora do ar.', { kind: ApiErrorKind.SERVER, status: 503 }))
      .mockResolvedValueOnce(ITINERARIES);
    renderButton();
    await userEvent.click(toggle());
    expect(await screen.findByText('Fora do ar.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('button', { name: 'Adicionar a Domingo' })).toBeInTheDocument();
  });
});
