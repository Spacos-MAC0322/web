import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RequestStatus } from '../hooks/useApiRequest';
import NearbyList, { INITIAL_COUNT } from './NearbyList';

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

function renderList(nearby, { origin = ORIGIN, radiusKm = 2 } = {}) {
  const full = { places: [], status: RequestStatus.SUCCESS, error: null, retry: vi.fn(), ...nearby };
  render(
    <MemoryRouter>
      <NearbyList origin={origin} nearby={full} radiusKm={radiusKm} />
    </MemoryRouter>,
  );
  return full;
}

describe('NearbyList', () => {
  it('não aparece sem ponto de referência', () => {
    const { container } = render(
      <NearbyList origin={null} nearby={{ places: [], status: RequestStatus.IDLE }} radiusKm={2} />,
    );
    expect(container).toBeEmptyDOMElement();
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
    expect(screen.getByText(/Aumente o raio/)).toBeInTheDocument();
  });

  it('mostra o carregamento e o erro da consulta', async () => {
    const { unmount } = render(
      <NearbyList origin={ORIGIN} nearby={{ places: [], status: RequestStatus.LOADING }} radiusKm={2} />,
    );
    expect(screen.getByText('Procurando espaços por perto…')).toBeInTheDocument();
    unmount();

    const nearby = renderList({ status: RequestStatus.ERROR, error: new Error('x') });
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(nearby.retry).toHaveBeenCalledOnce();
  });
});
