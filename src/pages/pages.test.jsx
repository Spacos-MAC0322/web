import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Layout from '../components/Layout';
import { fetchDiscoverPlaces, fetchPlacesInBounds } from '../services/places';
import Descobrir from './Descobrir';
import Explorar from './Explorar';

vi.mock('../services/places', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchPlacesInBounds: vi.fn(),
  fetchDiscoverPlaces: vi.fn(),
}));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Descobrir />} />
          <Route path="explorar" element={<Explorar />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const MAP_REGION = { name: /mapa de espaços culturais/i };

describe('páginas com mapa', () => {
  beforeEach(() => {
    fetchPlacesInBounds.mockReset();
    fetchPlacesInBounds.mockResolvedValue([]);
    fetchDiscoverPlaces.mockReset();
    fetchDiscoverPlaces.mockResolvedValue([
      { id: 'a', name: 'Casa de Cultura do Butantã', category: 'Casa de Cultura' },
    ]);
  });

  it('Explorar mostra o título e o mapa dentro do layout padrão', () => {
    renderAt('/explorar');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Encontre o seu próximo passeio' }),
    ).toBeVisible();
    expect(screen.getByRole('region', MAP_REGION)).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
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
