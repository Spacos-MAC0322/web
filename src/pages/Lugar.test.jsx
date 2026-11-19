import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, ApiErrorKind } from '../services/api';
import { fetchPlaceDetail } from '../services/places';
import Lugar from './Lugar';

vi.mock('../services/places', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchPlaceDetail: vi.fn(),
}));

const PLACE = {
  id: 'mapas_saas:space:31',
  name: 'Casa de Cultura do Butantã',
  primary_category: 'Casa de Cultura',
  badges: { hidden_gem: true, pet_friendly: false },
  description: { short: 'Resumo', long: 'Oficinas, shows e exposições.' },
  address: { full: 'Av. Junta Mizumoto, 13 - Butantã', neighborhood: 'Butantã' },
  opening_hours: { text: 'Ter a sex: 9h às 21h; Sáb: 10h às 18h', verified: false },
  admission: { is_free: null, price_text: 'Entrada gratuita' },
  contacts: { website: 'https://casa.example', phone: '(11) 3333-4444' },
  sources: [{ provider: 'mapas_saas', external_id: '31', record_url: 'https://mapas.example/31' }],
  events: [],
};

function renderAt(path = '/lugar/mapas_saas%3Aspace%3A31') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lugar/:id" element={<Lugar />} />
        <Route path="/explorar" element={<p>Página Explorar</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const serverError = () =>
  new ApiError('O Spaços está temporariamente indisponível.', {
    kind: ApiErrorKind.SERVER,
    status: 503,
  });

describe('página Lugar', () => {
  beforeEach(() => {
    fetchPlaceDetail.mockReset();
    fetchPlaceDetail.mockResolvedValue(PLACE);
  });

  it('consulta o espaço pelo id decodificado da URL e mostra o carregamento', async () => {
    renderAt();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando espaço…');
    expect(fetchPlaceDetail).toHaveBeenCalledWith('mapas_saas:space:31', expect.anything());
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(PLACE.name);
  });

  it('mostra nome, bairro · categoria, etiquetas, descrição e a fonte dos dados', async () => {
    renderAt();
    const article = await screen.findByRole('article', { name: PLACE.name });
    expect(within(article).getByText('Butantã · Casa de Cultura')).toBeInTheDocument();
    expect(within(article).getByText('Oficinas, shows e exposições.')).toBeInTheDocument();
    const tags = within(article).getByRole('list', { name: 'Etiquetas do espaço' });
    expect(within(tags).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Grátis',
      'Fora do óbvio',
    ]);
    expect(within(article).getByRole('link', { name: /Mapas Culturais/ })).toHaveAttribute(
      'href',
      'https://mapas.example/31',
    );
  });

  it('repete o nome só visualmente, sem duplicar o título para leitores de tela', async () => {
    renderAt();
    const titles = await screen.findAllByText(PLACE.name);
    expect(titles).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(PLACE.name);
    expect(titles.find((title) => title.tagName === 'P')).toHaveAttribute('aria-hidden', 'true');
  });

  it('volta para Explorar pelo link acima do conteúdo', async () => {
    renderAt();
    await userEvent.click(await screen.findByRole('link', { name: 'Voltar para Explorar' }));
    expect(screen.getByText('Página Explorar')).toBeInTheDocument();
  });

  it('exibe o botão de favoritar com estrela na página de detalhes', async () => {
    renderAt();
    const favButton = await screen.findByRole('button', {
      name: `Favoritar ${PLACE.name}`,
    });
    expect(favButton).toBeInTheDocument();
    expect(favButton).toHaveTextContent('Favoritar');
    expect(favButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('mostra horário, entrada, acessibilidade, endereço e contato no card', async () => {
    renderAt();
    const card = await screen.findByRole('region', { name: 'Planeje sua visita' });
    expect(within(card).getByText('Av. Junta Mizumoto, 13 - Butantã')).toBeInTheDocument();
    expect(within(card).getByText('Ter a sex: 9h às 21h')).toBeInTheDocument();
    expect(within(card).getByText('Sáb: 10h às 18h')).toBeInTheDocument();
    expect(within(card).getByText(/não confirmado/)).toBeInTheDocument();
    expect(within(card).getByText('Entrada gratuita')).toBeInTheDocument();
    expect(within(card).getByText('Não informado')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: /Site oficial/ })).toHaveAttribute(
      'href',
      'https://casa.example',
    );
    expect(screen.getByRole('link', { name: '(11) 3333-4444' })).toHaveAttribute(
      'href',
      'tel:1133334444',
    );
  });

  it('indica o que a fonte não informa', async () => {
    fetchPlaceDetail.mockResolvedValue({ id: 'x', name: 'Lugar mínimo', badges: {} });
    renderAt('/lugar/x');
    await screen.findByRole('article');
    expect(screen.getByText('Este espaço ainda não tem descrição.')).toBeInTheDocument();
    expect(screen.getByText('Endereço não informado')).toBeInTheDocument();
    expect(screen.getByText('Horário não informado')).toBeInTheDocument();
    expect(screen.getByText('Valor não informado')).toBeInTheDocument();
    expect(screen.queryByText('Contato')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Etiquetas do espaço' })).not.toBeInTheDocument();
  });

  it('mostra a programação do espaço junto com os detalhes', async () => {
    fetchPlaceDetail.mockResolvedValue({
      ...PLACE,
      events: [{ title: 'Sarau da Quebrada', starts_at: '2099-11-20' }],
    });
    renderAt();
    const events = await screen.findByRole('region', { name: 'Programação em cartaz' });
    expect(within(events).getByRole('heading', { name: 'Sarau da Quebrada' })).toBeVisible();
  });

  it('mostra "Espaço não encontrado" para 404, com link de volta ao mapa', async () => {
    fetchPlaceDetail.mockRejectedValue(
      new ApiError('Espaço não encontrado.', { kind: ApiErrorKind.CLIENT, status: 404 }),
    );
    renderAt('/lugar/nao-existe');
    expect(await screen.findByRole('heading', { name: 'Espaço não encontrado' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Voltar ao mapa' }));
    expect(screen.getByText('Página Explorar')).toBeInTheDocument();
  });

  it('mostra o erro do backend e carrega de novo com "Tentar de novo"', async () => {
    fetchPlaceDetail.mockRejectedValueOnce(serverError());
    renderAt();
    expect(await screen.findByText('O Spaços está temporariamente indisponível.')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(PLACE.name);
    expect(fetchPlaceDetail).toHaveBeenCalledTimes(2);
  });
});
