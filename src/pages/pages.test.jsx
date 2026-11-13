import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Layout from '../components/Layout';
import { fetchPlacesInBounds } from '../services/places';
import Descobrir from './Descobrir';
import Explorar from './Explorar';

vi.mock('../services/places', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchPlacesInBounds: vi.fn(),
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
});
