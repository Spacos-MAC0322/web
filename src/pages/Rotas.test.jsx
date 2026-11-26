import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, AuthStatus } from '../hooks/useAuth';
import { ApiError, ApiErrorKind } from '../services/api';
import {
  createItinerary,
  deleteItinerary,
  fetchItinerary,
  listItineraries,
  replaceItinerary,
} from '../services/itineraries';
import { fetchPlaceDetail, fetchPlacesByText } from '../services/places';
import { formatItineraryDate, itineraryPath, stopCountText } from './itineraryFormat';
import Roteiro from './Roteiro';
import Rotas from './Rotas';

vi.mock('../services/itineraries', () => ({
  createItinerary: vi.fn(),
  deleteItinerary: vi.fn(),
  fetchItinerary: vi.fn(),
  listItineraries: vi.fn(),
  replaceItinerary: vi.fn(),
}));
vi.mock('../services/places', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchPlaceDetail: vi.fn(),
  fetchPlacesByText: vi.fn(),
}));

const LOGGED_IN = {
  user: { id: 'u1', name: 'Ana', email: 'ana@example.com' },
  status: AuthStatus.AUTHENTICATED,
  isAuthenticated: true,
};
const ANONYMOUS = { user: null, status: AuthStatus.ANONYMOUS, isAuthenticated: false };

function stop(placeId, fields = {}) {
  return {
    placeId,
    order: 1,
    startTime: null,
    endTime: null,
    eventId: null,
    conflictWarning: null,
    ...fields,
  };
}

const SAVED = {
  id: 'abc',
  title: 'Sábado no centro',
  date: '2026-11-28',
  stops: [stop('museu', { startTime: '10:00' }), stop('teatro')],
};

function CurrentPath() {
  const location = useLocation();
  // <div>, não <output>: <output> tem papel "status" e confundiria getByRole('status').
  return <div data-testid="path">{location.pathname}</div>;
}

function renderAt(path, auth = LOGGED_IN) {
  return render(
    <AuthContext value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/rotas" element={<Rotas />} />
          <Route path="/rotas/novo" element={<Roteiro />} />
          <Route path="/rotas/:id" element={<Roteiro />} />
          <Route path="/login" element={<p>Página de Login</p>} />
        </Routes>
        <CurrentPath />
      </MemoryRouter>
    </AuthContext>,
  );
}

beforeEach(() => {
  fetchPlaceDetail.mockImplementation(async (id) => ({
    id,
    name: id === 'museu' ? 'Museu Afro Brasil' : 'Teatro Oficina',
    primary_category: id === 'museu' ? 'Museu' : 'Teatro',
  }));
});

describe('itineraryFormat', () => {
  it('formata datas, contagem de paradas e caminhos', () => {
    expect(formatItineraryDate('2026-11-28')).toBe('sábado, 28 de novembro de 2026');
    expect(formatItineraryDate(null)).toBe('Sem data definida');
    expect(formatItineraryDate('data-ruim')).toBe('data-ruim');
    expect(stopCountText(1)).toBe('1 parada');
    expect(stopCountText(0)).toBe('0 paradas');
    expect(itineraryPath('a/b')).toBe('/rotas/a%2Fb');
  });
});

describe('página Rotas (Meus roteiros)', () => {
  it('pede login e volta para /rotas depois', async () => {
    renderAt('/rotas', ANONYMOUS);
    expect(screen.getByRole('heading', { name: 'Entre para criar seus roteiros' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Novo roteiro' })).not.toBeInTheDocument();
    expect(listItineraries).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('link', { name: 'Entrar na conta' }));
    expect(screen.getByText('Página de Login')).toBeInTheDocument();
  });

  it('espera a sessão carregar', () => {
    renderAt('/rotas', { user: null, status: AuthStatus.LOADING, isAuthenticated: false });
    expect(screen.getByRole('status')).toHaveTextContent('Carregando sua conta…');
  });

  it('lista os roteiros com data e número de paradas', async () => {
    listItineraries.mockResolvedValue([
      { id: 'abc', title: 'Sábado no centro', date: '2026-11-28', stopCount: 2 },
      { id: 'def', title: 'Ideias', date: null, stopCount: 1 },
    ]);
    renderAt('/rotas');
    expect(screen.getByRole('status')).toHaveTextContent('Carregando seus roteiros…');

    const list = await screen.findByRole('list', { name: 'Seus roteiros' });
    const links = within(list).getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/rotas/abc');
    expect(links[0]).toHaveTextContent('Sábado no centro');
    expect(links[0]).toHaveTextContent('sábado, 28 de novembro de 2026');
    expect(links[0]).toHaveTextContent('2 paradas');
    expect(links[1]).toHaveTextContent('Sem data definida');
    expect(links[1]).toHaveTextContent('1 parada');
  });

  it('convida a criar o primeiro roteiro', async () => {
    listItineraries.mockResolvedValue([]);
    renderAt('/rotas');
    expect(await screen.findByRole('heading', { name: 'Você ainda não criou nenhum roteiro' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Criar roteiro' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/rotas/novo');
  });

  it('mostra o erro e tenta de novo', async () => {
    listItineraries
      .mockRejectedValueOnce(new ApiError('Fora do ar.', { kind: ApiErrorKind.SERVER, status: 503 }))
      .mockResolvedValueOnce([]);
    renderAt('/rotas');
    expect(await screen.findByText('Fora do ar.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Você ainda não criou nenhum roteiro')).toBeInTheDocument();
  });
});

describe('editor de roteiro', () => {
  it('pede login e volta para o mesmo roteiro depois', () => {
    renderAt('/rotas/abc', ANONYMOUS);
    expect(screen.getByRole('heading', { name: 'Entre para criar seus roteiros' })).toBeInTheDocument();
    expect(fetchItinerary).not.toHaveBeenCalled();
  });

  it('cria um roteiro novo e passa a usar o endereço dele, sem buscá-lo de novo', async () => {
    createItinerary.mockResolvedValue({ ...SAVED, title: 'Domingo', stops: [] });
    renderAt('/rotas/novo');

    expect(screen.getByRole('heading', { level: 1, name: 'Novo roteiro' })).toBeInTheDocument();
    const create = screen.getByRole('button', { name: 'Criar roteiro' });
    expect(create).toBeDisabled();
    expect(screen.getByText('Dê um nome ao passeio para salvar.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Nome do passeio'), 'Domingo');
    expect(screen.getByRole('heading', { level: 1, name: 'Domingo' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Alterações não salvas');
    await userEvent.click(create);

    expect(createItinerary).toHaveBeenCalledWith({ title: 'Domingo', date: null, stops: [] });
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/rotas/abc'));
    expect(await screen.findByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Todas as alterações foram salvas');
    expect(fetchItinerary).not.toHaveBeenCalled();
  });

  it('busca um espaço, adiciona como parada com horário e cria o roteiro', async () => {
    fetchPlacesByText.mockResolvedValue([
      { id: 'museu', name: 'Museu Afro Brasil', category: 'Museu', neighborhood: 'Moema' },
    ]);
    createItinerary.mockResolvedValue({ ...SAVED, stops: [stop('museu', { startTime: '10:00' })] });
    renderAt('/rotas/novo');

    await userEvent.type(screen.getByLabelText('Nome do passeio'), 'Sábado no centro');
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Buscar espaços para adicionar ao roteiro' }),
      'museu{Enter}',
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Adicionar Museu Afro Brasil ao roteiro' }),
    );

    const added = screen.getByRole('listitem', { name: 'Parada 1: Museu Afro Brasil' });
    expect(screen.getByText('1 de 50')).toBeInTheDocument();
    await userEvent.type(within(added).getByLabelText('Chegada'), '10:00');
    await userEvent.click(screen.getByRole('button', { name: 'Criar roteiro' }));

    expect(createItinerary).toHaveBeenCalledWith({
      title: 'Sábado no centro',
      date: null,
      stops: [{ placeId: 'museu', startTime: '10:00', endTime: null, eventId: null }],
    });
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/rotas/abc'));
    expect(
      await screen.findByRole('listitem', { name: 'Parada 1: Museu Afro Brasil' }),
    ).toBeInTheDocument();
    expect(fetchPlaceDetail).not.toHaveBeenCalled();
  });

  it('abre um roteiro salvo, reordena e salva', async () => {
    fetchItinerary.mockResolvedValue(SAVED);
    replaceItinerary.mockResolvedValue({ ...SAVED, stops: [SAVED.stops[1], SAVED.stops[0]] });
    renderAt('/rotas/abc');

    expect(screen.getByRole('status')).toHaveTextContent('Carregando roteiro…');
    expect(await screen.findByRole('heading', { level: 1, name: 'Sábado no centro' })).toBeInTheDocument();
    expect(screen.getByLabelText('Data')).toHaveValue('2026-11-28');
    expect(screen.getByText('2 de 50')).toBeInTheDocument();
    const save = screen.getByRole('button', { name: 'Salvar alterações' });
    expect(save).toBeDisabled();

    await userEvent.click(
      screen.getByRole('button', { name: 'Mover para cima a parada 2 (Teatro Oficina)' }),
    );
    expect(
      screen.getAllByRole('listitem').map((item) => item.getAttribute('aria-label')),
    ).toEqual(['Parada 1: Teatro Oficina', 'Parada 2: Museu Afro Brasil']);
    expect(save).toBeEnabled();

    await userEvent.click(save);
    expect(replaceItinerary).toHaveBeenCalledWith('abc', {
      title: 'Sábado no centro',
      date: '2026-11-28',
      stops: [
        { placeId: 'teatro', startTime: null, endTime: null, eventId: null },
        { placeId: 'museu', startTime: '10:00', endTime: null, eventId: null },
      ],
    });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Todas as alterações foram salvas'),
    );
  });

  it('mostra o motivo quando salvar falha e mantém as edições', async () => {
    fetchItinerary.mockResolvedValue(SAVED);
    replaceItinerary.mockRejectedValue(
      new ApiError('Espaço não encontrado: teatro.', { kind: ApiErrorKind.CLIENT, status: 422 }),
    );
    renderAt('/rotas/abc');
    const title = await screen.findByLabelText('Nome do passeio');

    await userEvent.clear(title);
    await userEvent.type(title, 'Outro nome');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Espaço não encontrado: teatro.')).toBeInTheDocument();
    expect(title).toHaveValue('Outro nome');
    expect(screen.getByRole('status')).toHaveTextContent('Alterações não salvas');
  });

  it('não deixa salvar com parada indisponível', async () => {
    fetchItinerary.mockResolvedValue(SAVED);
    fetchPlaceDetail.mockImplementation(async (id) => {
      if (id === 'teatro') {
        throw new ApiError('Espaço não encontrado.', { kind: ApiErrorKind.CLIENT, status: 404 });
      }
      return { id, name: 'Museu Afro Brasil' };
    });
    renderAt('/rotas/abc');
    await screen.findByRole('listitem', { name: 'Parada 2: Local indisponível' });

    await userEvent.type(screen.getByLabelText('Nome do passeio'), '!');
    expect(screen.getByText('Remova as paradas indisponíveis para salvar o roteiro.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Remover a parada 2 (Local indisponível)' }));
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled();
  });

  it('exclui depois de confirmar e volta para a lista', async () => {
    fetchItinerary.mockResolvedValue(SAVED);
    deleteItinerary.mockResolvedValue(undefined);
    listItineraries.mockResolvedValue([]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderAt('/rotas/abc');
    const remove = await screen.findByRole('button', { name: 'Excluir roteiro' });

    await userEvent.click(remove);
    expect(deleteItinerary).not.toHaveBeenCalled();

    await userEvent.click(remove);
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(deleteItinerary).toHaveBeenCalledWith('abc');
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(/^\/rotas$/));
  });

  it('informa roteiro inexistente', async () => {
    fetchItinerary.mockRejectedValue(
      new ApiError('Roteiro não encontrado.', { kind: ApiErrorKind.CLIENT, status: 404 }),
    );
    renderAt('/rotas/sumiu');
    expect(await screen.findByRole('heading', { name: 'Roteiro não encontrado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Meus roteiros' })).toHaveAttribute('href', '/rotas');
  });

  it('mostra falha ao carregar e tenta de novo', async () => {
    fetchItinerary
      .mockRejectedValueOnce(new ApiError('Fora do ar.', { kind: ApiErrorKind.SERVER, status: 503 }))
      .mockResolvedValueOnce(SAVED);
    renderAt('/rotas/abc');
    expect(await screen.findByText('Fora do ar.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Sábado no centro' })).toBeInTheDocument();
  });

  it('pede confirmação ao fechar a aba com alterações não salvas', async () => {
    renderAt('/rotas/novo');
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);

    await userEvent.type(screen.getByLabelText('Nome do passeio'), 'Passeio');
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });
});
