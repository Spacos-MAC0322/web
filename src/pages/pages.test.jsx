import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Layout from '../components/Layout';
import { geocodeAddress } from '../services/geocoding';
import {
  fetchDiscoverPlaces,
  fetchFilterOptions,
  fetchNearbyPlaces,
  fetchPlacesInBounds,
} from '../services/places';
import Descobrir from './Descobrir';
import Explorar from './Explorar';

vi.mock('../services/places', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchPlacesInBounds: vi.fn(),
  fetchDiscoverPlaces: vi.fn(),
  fetchNearbyPlaces: vi.fn(),
  fetchFilterOptions: vi.fn(),
}));
vi.mock('../services/geocoding', () => ({ geocodeAddress: vi.fn() }));

function CurrentSearch() {
  return <output data-testid="url">{useLocation().search}</output>;
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Descobrir />} />
          <Route path="explorar" element={<Explorar />} />
        </Route>
      </Routes>
      <CurrentSearch />
    </MemoryRouter>,
  );
}

const GROUPS = [
  { id: 'arte', label: 'Arte e Cultura', count: 3 },
  { id: 'teatro', label: 'Teatro e dança', count: 1 },
  { id: 'gastronomia', label: 'Gastronomia', count: 0 },
];
const MUSEU = {
  id: 'museu',
  name: 'Museu do Bairro',
  category: 'Museu',
  position: [-23.5505, -46.6333],
  neighborhood: 'Sé',
  badges: { is_free: true },
};

// O jsdom não calcula layout; com tamanho, o mapa informa a área visível e consulta.
function giveTheMapASize() {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
}

const MAP_REGION = { name: /mapa de espaços culturais/i };

describe('páginas com mapa', () => {
  beforeEach(() => {
    fetchPlacesInBounds.mockReset();
    fetchPlacesInBounds.mockResolvedValue([]);
    fetchFilterOptions.mockReset();
    fetchFilterOptions.mockResolvedValue({ groups: GROUPS, pricedPlaces: 25 });
    fetchDiscoverPlaces.mockReset();
    fetchDiscoverPlaces.mockResolvedValue([
      { id: 'a', name: 'Casa de Cultura do Butantã', category: 'Casa de Cultura' },
    ]);
  });

  it('Explorar mostra o título, o painel de filtros e o mapa dentro do layout padrão', () => {
    renderAt('/explorar');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Encontre o seu próximo passeio' }),
    ).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Filtrar lugares' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Perto de você' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar' })).toBeDisabled();
    expect(screen.getByRole('region', MAP_REGION)).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('Explorar busca um endereço, lista os espaços por perto e "Limpar" desfaz', async () => {
    geocodeAddress.mockResolvedValue([
      { label: 'MASP', neighborhood: 'Bela Vista', position: [-23.5614, -46.6559] },
    ]);
    fetchNearbyPlaces.mockResolvedValue([
      {
        id: 'perto',
        name: 'Teatro Perto',
        category: 'Teatro',
        position: [-23.562, -46.656],
        neighborhood: 'Bela Vista',
        badges: { is_free: true },
      },
    ]);
    renderAt('/explorar');

    await userEvent.type(screen.getByRole('searchbox', { name: /endereço/i }), 'MASP');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    const heading = await screen.findByRole('heading', { name: '1 lugar em até 2 km de MASP' });
    expect(heading).toHaveFocus();
    expect(screen.getByText(/^Bela Vista · a \d+ m · gratuito$/)).toBeInTheDocument();
    expect(fetchNearbyPlaces.mock.calls[0][0]).toEqual({
      lat: -23.5614,
      lng: -46.6559,
      radiusKm: 2,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(screen.queryByRole('heading', { name: /lugar em até/ })).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: /endereço/i })).toHaveValue('');
  });

  it('Explorar aplica os filtros do endereço ao mapa e à lista', async () => {
    giveTheMapASize();
    fetchPlacesInBounds.mockResolvedValue([MUSEU]);
    renderAt('/explorar?categoria=arte&gratis=1&zona=sul');

    expect(await screen.findByRole('heading', { name: '1 lugar no mapa' })).toBeInTheDocument();
    expect(screen.getByText('Sé · gratuito')).toBeInTheDocument();
    expect(fetchPlacesInBounds.mock.calls.at(-1)[1].filters).toEqual({
      q: '',
      categories: ['arte'],
      regions: ['Sul'],
      free: true,
      maxPrice: null,
    });
    expect(await screen.findByRole('checkbox', { name: /Arte e Cultura/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Entrada gratuita' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Zona Sul' })).toBeChecked();
    // Grupos sem espaços não aparecem.
    expect(screen.queryByRole('checkbox', { name: /Gastronomia/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filtros (3)' })).toBeInTheDocument();
  });

  it('Explorar consulta de novo ao marcar filtros e digitar, e "Limpar" desfaz tudo', async () => {
    giveTheMapASize();
    renderAt('/explorar');
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Teatro e dança, 1 espaço' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Preço máximo' }), 'Até R$ 40');
    await userEvent.type(
      screen.getByRole('searchbox', { name: /nome, bairro ou região/ }),
      'centro',
    );

    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('q=centro'));
    expect(screen.getByTestId('url')).toHaveTextContent('?q=centro&categoria=teatro&ate=40');
    await waitFor(() =>
      expect(fetchPlacesInBounds.mock.calls.at(-1)[1].filters).toEqual({
        q: 'centro',
        categories: ['teatro'],
        regions: [],
        free: false,
        maxPrice: 40,
      }),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(screen.getByTestId('url')).toBeEmptyDOMElement();
    expect(screen.getByRole('checkbox', { name: /Teatro e dança/ })).not.toBeChecked();
    expect(screen.getByRole('searchbox', { name: /nome, bairro ou região/ })).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Limpar' })).toBeDisabled();
  });

  it('Descobrir chama para o mapa com um link para Explorar, sem embutir o mapa', () => {
    renderAt('/');
    expect(
      screen.getByRole('heading', { level: 1, name: 'O que você quer descobrir na cidade hoje?' }),
    ).toBeInTheDocument();
    const section = screen.getByRole('region', { name: 'Explore o mapa da cidade de São Paulo' });
    expect(section).toHaveTextContent('Escolha seus interesses e explore os lugares no mapa.');
    // Um único link acessível; a ilustração clicável fica fora da ordem de tabulação.
    expect(screen.getAllByRole('link', { name: /mapa/i })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Abrir o mapa' })).toHaveAttribute('href', '/explorar');
    const image = section.querySelector('img');
    expect(image).toHaveAttribute('alt', '');
    expect(image.closest('a')).toHaveAttribute('href', '/explorar');
    expect(image.closest('a')).toHaveAttribute('tabindex', '-1');
    expect(screen.queryByRole('region', MAP_REGION)).not.toBeInTheDocument();
    expect(fetchPlacesInBounds).not.toHaveBeenCalled();
  });

  it('Descobrir mostra a seção "Fora do óbvio" com a seleção do backend', async () => {
    renderAt('/');
    const section = screen.getByRole('region', { name: 'Fora do óbvio' });
    expect(
      await within(section).findByRole('link', { name: 'Casa de Cultura do Butantã' }),
    ).toHaveAttribute('href', '/lugar/a');
  });

  it('o filtro rápido "Fora do óbvio" leva o foco até a seção', async () => {
    renderAt('/');
    const interests = screen.getByRole('region', { name: 'Explore por interesse' });
    const pill = within(interests).getByRole('link', { name: 'Fora do óbvio' });
    expect(pill).toHaveAttribute('href', '#fora-do-obvio');
    await userEvent.click(pill);
    expect(screen.getByRole('heading', { level: 2, name: 'Fora do óbvio' })).toHaveFocus();
  });
});
