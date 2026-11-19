import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchFilterOptions } from '../services/places';
import { EMPTY_FILTERS } from '../services/searchFilters';
import FilterPanel from './FilterPanel';

vi.mock('../services/places', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchFilterOptions: vi.fn(),
}));

const GROUPS = [
  { id: 'arte', label: 'Arte e Cultura', count: 12 },
  { id: 'musica', label: 'Música', count: 1 },
  { id: 'cinema', label: 'Cinema', count: 0 },
  { id: 'gastronomia', label: 'Gastronomia', count: 0 },
];

// Aplica o updater como a página faz, para conferir os próximos filtros.
function renderPanel(filters = EMPTY_FILTERS) {
  const onChange = vi.fn();
  render(<FilterPanel filters={filters} onChange={onChange} />);
  const next = () => onChange.mock.calls.at(-1)[0](filters);
  return { onChange, next };
}

describe('FilterPanel', () => {
  beforeEach(() => {
    fetchFilterOptions.mockReset();
    fetchFilterOptions.mockResolvedValue({ groups: GROUPS, pricedPlaces: 40 });
  });

  it('lista os grupos com espaços e a quantidade de cada um', async () => {
    renderPanel({ ...EMPTY_FILTERS, categories: ['cinema'] });
    const group = screen.getByRole('group', { name: 'O que você quer ver?' });
    expect(within(group).getByText('Carregando…')).toBeInTheDocument();
    expect(
      await within(group).findByRole('checkbox', { name: 'Arte e Cultura, 12 espaços' }),
    ).not.toBeChecked();
    expect(within(group).getByRole('checkbox', { name: 'Música, 1 espaço' })).toBeInTheDocument();
    // Vazio, mas marcado (ex.: veio de um link): continua visível para poder desmarcar.
    expect(within(group).getByRole('checkbox', { name: 'Cinema, 0 espaços' })).toBeChecked();
    expect(within(group).queryByRole('checkbox', { name: /Gastronomia/ })).not.toBeInTheDocument();
  });

  it('marca e desmarca grupos, gratuidade, preço e zonas', async () => {
    const { next } = renderPanel({ ...EMPTY_FILTERS, categories: ['musica'] });
    await userEvent.click(await screen.findByRole('checkbox', { name: /Arte e Cultura/ }));
    expect(next().categories).toEqual(['musica', 'arte']);

    await userEvent.click(screen.getByRole('checkbox', { name: /Música/ }));
    expect(next().categories).toEqual([]);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Entrada gratuita' }));
    expect(next().free).toBe(true);

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Preço máximo' }), 'Até R$ 20');
    expect(next().maxPrice).toBe(20);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Preço máximo' }), 'Sem limite');
    expect(next().maxPrice).toBeNull();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Zona Leste' }));
    expect(next().regions).toEqual(['Leste']);
    expect(screen.getByRole('checkbox', { name: 'Centro' })).toBeInTheDocument();
  });

  it('mostra um ícone em cada grupo', async () => {
    const { container } = render(<FilterPanel filters={EMPTY_FILTERS} onChange={vi.fn()} />);
    await screen.findByRole('checkbox', { name: /Arte e Cultura/ });
    const rows = [...container.querySelectorAll('label')].filter((label) =>
      /Arte e Cultura|Música/.test(label.textContent),
    );
    expect(rows).toHaveLength(2);
    rows.forEach((row) => expect(row.querySelector('img')).not.toBeNull());
  });

  it('esconde "Para o seu passeio" enquanto nenhum espaço tem preço conhecido', async () => {
    fetchFilterOptions.mockResolvedValue({ groups: GROUPS, pricedPlaces: 0 });
    renderPanel();
    await screen.findByRole('checkbox', { name: /Arte e Cultura/ });
    expect(screen.queryByRole('group', { name: 'Para o seu passeio' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Preço máximo' })).not.toBeInTheDocument();
  });

  it('mantém os filtros de preço já ativos, para poder desfazê-los', async () => {
    fetchFilterOptions.mockResolvedValue({ groups: GROUPS, pricedPlaces: 0 });
    renderPanel({ ...EMPTY_FILTERS, free: true });
    expect(
      await screen.findByRole('checkbox', { name: 'Entrada gratuita' }),
    ).toBeChecked();
  });

  it('o botão "Filtros" mostra quantos estão ativos e abre o painel no celular', async () => {
    renderPanel({ ...EMPTY_FILTERS, q: 'museu', regions: ['Sul'], free: true });
    const toggle = screen.getByRole('button', { name: 'Filtros (2)' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(toggle.getAttribute('aria-controls'))).toBeInTheDocument();
  });

  it('mostra o erro das categorias e tenta de novo', async () => {
    fetchFilterOptions.mockRejectedValueOnce(new Error('falhou'));
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('checkbox', { name: /Arte e Cultura/ })).toBeInTheDocument();
    expect(fetchFilterOptions).toHaveBeenCalledTimes(2);
  });

  it('avisa quando ainda não há categorias com espaços', async () => {
    fetchFilterOptions.mockResolvedValue({
      groups: [{ id: 'cinema', label: 'Cinema', count: 0 }],
      pricedPlaces: 0,
    });
    renderPanel();
    expect(await screen.findByText('Ainda não há categorias.')).toBeInTheDocument();
  });
});
