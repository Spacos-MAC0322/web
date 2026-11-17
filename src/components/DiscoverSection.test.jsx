import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, ApiErrorKind } from '../services/api';
import { fetchDiscoverPlaces } from '../services/places';
import DiscoverSection from './DiscoverSection';

vi.mock('../services/places', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchDiscoverPlaces: vi.fn(),
}));

const places = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Espaço ${i + 1}`,
    category: 'Casa de Cultura',
    neighborhood: 'Butantã',
    summary: 'Oficinas.',
  }));

function renderSection() {
  render(
    <MemoryRouter>
      <DiscoverSection />
    </MemoryRouter>,
  );
  return screen.getByRole('region', { name: 'Fora do óbvio' });
}

describe('DiscoverSection', () => {
  beforeEach(() => {
    fetchDiscoverPlaces.mockReset();
  });

  it('mostra título, nota e o carregamento enquanto consulta a seleção', () => {
    fetchDiscoverPlaces.mockReturnValue(new Promise(() => {}));
    const section = renderSection();
    expect(section).toHaveAttribute('id', 'fora-do-obvio');
    expect(section).toHaveTextContent('Espaços que ajudam você a conhecer outras partes');
    expect(within(section).getByRole('status')).toHaveTextContent('Carregando a seleção…');
    expect(fetchDiscoverPlaces.mock.calls[0][0].signal).toBeInstanceOf(AbortSignal);
  });

  it('mostra os 4 primeiros cards e expande para a seleção completa', async () => {
    fetchDiscoverPlaces.mockResolvedValue(places(6));
    const section = renderSection();
    const list = await within(section).findByRole('list');
    expect(within(list).getAllByRole('heading').map((h) => h.textContent)).toEqual([
      'Espaço 1',
      'Espaço 2',
      'Espaço 3',
      'Espaço 4',
    ]);

    await userEvent.click(within(section).getByRole('button', { name: 'Ver todos (6)' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(6);
    expect(within(section).getByRole('button', { name: 'Mostrar menos' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('não oferece "Ver todos" quando a seleção cabe nos 4 cards', async () => {
    fetchDiscoverPlaces.mockResolvedValue(places(3));
    const section = renderSection();
    expect(await within(section).findAllByRole('listitem')).toHaveLength(3);
    expect(within(section).queryByRole('button')).not.toBeInTheDocument();
  });

  it('avisa quando a seleção está vazia', async () => {
    fetchDiscoverPlaces.mockResolvedValue([]);
    const section = renderSection();
    expect(
      await within(section).findByText('Ainda não há espaços na seleção Fora do óbvio.'),
    ).toBeVisible();
  });

  it('mostra o erro do backend e consulta de novo com "Tentar de novo"', async () => {
    fetchDiscoverPlaces
      .mockRejectedValueOnce(
        new ApiError('Não foi possível consultar a seleção de espaços no momento.', {
          kind: ApiErrorKind.SERVER,
          status: 503,
        }),
      )
      .mockResolvedValueOnce(places(1));
    const section = renderSection();
    expect(
      await within(section).findByText(
        'Não foi possível consultar a seleção de espaços no momento.',
      ),
    ).toBeVisible();
    await userEvent.click(within(section).getByRole('button', { name: 'Tentar de novo' }));
    expect(await within(section).findByRole('heading', { name: 'Espaço 1' })).toBeVisible();
  });
});
