import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RequestStatus } from '../hooks/useApiRequest';
import PlaceResults, { INITIAL_COUNT } from './PlaceResults';

const ORIGIN = { label: 'MASP', position: [-23.5614, -46.6559] };

function place(id, distanceKm, extra = {}) {
  return {
    id: `demo:${id}`,
    name: `Espaço ${id}`,
    category: 'Teatro',
    neighborhood: 'Bela Vista',
    position: [-23.56, -46.65],
    badges: {},
    distanceKm,
    ...extra,
  };
}

function renderList(results, { origin = ORIGIN, radiusKm = 2, filtered = false } = {}) {
  const full = { places: [], status: RequestStatus.SUCCESS, error: null, retry: vi.fn(), ...results };
  render(
    <MemoryRouter>
      <PlaceResults origin={origin} results={full} radiusKm={radiusKm} filtered={filtered} />
    </MemoryRouter>,
  );
  return full;
}

describe('PlaceResults', () => {
  it('sem ponto de referência, lista os espaços da área do mapa com bairro e gratuidade', () => {
    renderList(
      { places: [place('a', undefined, { badges: { is_free: true } }), place('b')] },
      { origin: null },
    );
    expect(screen.getByRole('heading', { name: '2 lugares no mapa' })).toBeInTheDocument();
    expect(screen.getByText('Bela Vista · gratuito')).toBeInTheDocument();
    expect(screen.getByText('Bela Vista')).toBeInTheDocument();
  });

  it('sugere remover filtros quando a área filtrada fica vazia', () => {
    renderList({ places: [] }, { origin: null, filtered: true });
    expect(screen.getByRole('heading', { name: '0 lugares no mapa' })).toBeInTheDocument();
    expect(screen.getByText(/Remova algum filtro ou mova o mapa/)).toBeInTheDocument();
  });

  it('sem filtros, sugere mover o mapa', () => {
    renderList({ places: [] }, { origin: null });
    expect(screen.getByText(/Mova o mapa ou afaste o zoom/)).toBeInTheDocument();
  });

  it('conta os lugares do raio e mostra bairro, distância e gratuidade', () => {
    renderList({ places: [place('a', 0.34, { badges: { is_free: true } }), place('b', 1.26)] });
    expect(
      screen.getByRole('heading', { name: '2 lugares em até 2 km de MASP' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Bela Vista · a 340 m · gratuito')).toBeInTheDocument();
    expect(screen.getByText('Bela Vista · a 1,3 km')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Espaço a' })).toHaveAttribute(
      'href',
      '/lugar/demo%3Aa',
    );
  });

  it('começa resumida e mostra todos com "Ver todos"', async () => {
    const places = Array.from({ length: INITIAL_COUNT + 2 }, (_, i) => place(i, i / 10));
    renderList({ places });
    expect(screen.getAllByRole('listitem')).toHaveLength(INITIAL_COUNT);

    await userEvent.click(screen.getByRole('button', { name: `Ver todos (${places.length})` }));
    expect(screen.getAllByRole('listitem')).toHaveLength(places.length);
  });

  it('sugere aumentar o raio quando não há espaços', () => {
    renderList({ places: [] }, { radiusKm: 0.5 });
    expect(screen.getByRole('heading', { name: '0 lugares em até 0,5 km de MASP' })).toBeVisible();
    expect(screen.getByText(/Aumente o raio ou escolha outro ponto/)).toBeInTheDocument();
  });

  it('com filtros, também sugere remover algum quando o raio fica vazio', () => {
    renderList({ places: [] }, { filtered: true });
    expect(screen.getByText(/Aumente o raio, remova algum filtro/)).toBeInTheDocument();
  });

  it('mostra o carregamento e o erro da consulta', async () => {
    const { unmount } = render(
      <PlaceResults
        origin={ORIGIN}
        results={{ places: [], status: RequestStatus.LOADING }}
        radiusKm={2}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Lugares por perto' })).toBeInTheDocument();
    expect(screen.getByText('Procurando espaços…')).toBeInTheDocument();
    unmount();

    const nearby = renderList({ status: RequestStatus.ERROR, error: new Error('x') });
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(nearby.retry).toHaveBeenCalledOnce();
  });
});
