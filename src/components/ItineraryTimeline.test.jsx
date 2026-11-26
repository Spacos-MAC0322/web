import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ItineraryTimeline from './ItineraryTimeline';

function stop(key, placeId, fields = {}) {
  return {
    key,
    placeId,
    startTime: '',
    endTime: '',
    eventId: null,
    conflictWarning: null,
    ...fields,
  };
}

const PLACES = {
  museu: { name: 'Museu Afro Brasil', category: 'Museu', missing: false },
  teatro: { name: 'Teatro Oficina', category: null, missing: false },
  sumiu: { name: null, category: null, missing: true },
};

function renderTimeline(props = {}) {
  const handlers = { onMove: vi.fn(), onRemove: vi.fn(), onTimeChange: vi.fn() };
  render(
    <MemoryRouter>
      <ItineraryTimeline
        stops={[stop('k1', 'museu', { startTime: '10:00' }), stop('k2', 'teatro')]}
        places={PLACES}
        {...handlers}
        {...props}
      />
    </MemoryRouter>,
  );
  return handlers;
}

describe('ItineraryTimeline', () => {
  it('lista as paradas em ordem com número, nome, categoria e link para o lugar', () => {
    renderTimeline();
    const items = within(screen.getByRole('list', { name: 'Paradas do roteiro' })).getAllByRole(
      'listitem',
    );
    expect(items.map((item) => item.getAttribute('aria-label'))).toEqual([
      'Parada 1: Museu Afro Brasil',
      'Parada 2: Teatro Oficina',
    ]);
    expect(within(items[0]).getByText('Museu')).toBeInTheDocument();
    expect(within(items[0]).getByRole('link', { name: 'Museu Afro Brasil' })).toHaveAttribute(
      'href',
      '/lugar/museu',
    );
    expect(within(items[0]).getByLabelText('Chegada')).toHaveValue('10:00');
  });

  it('mostra um aviso quando ainda não há paradas', () => {
    renderTimeline({ stops: [] });
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText(/Nenhuma parada ainda/)).toBeInTheDocument();
  });

  it('move para cima e para baixo, sem sair das pontas da lista', async () => {
    const { onMove } = renderTimeline();
    const up1 = screen.getByRole('button', { name: 'Mover para cima a parada 1 (Museu Afro Brasil)' });
    const down2 = screen.getByRole('button', { name: 'Mover para baixo a parada 2 (Teatro Oficina)' });
    expect(up1).toBeDisabled();
    expect(down2).toBeDisabled();

    await userEvent.click(
      screen.getByRole('button', { name: 'Mover para baixo a parada 1 (Museu Afro Brasil)' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Mover para cima a parada 2 (Teatro Oficina)' }),
    );
    expect(onMove.mock.calls).toEqual([
      [0, 1],
      [1, 0],
    ]);
  });

  it('remove a parada pela chave', async () => {
    const { onRemove } = renderTimeline();
    await userEvent.click(screen.getByRole('button', { name: 'Remover a parada 2 (Teatro Oficina)' }));
    expect(onRemove).toHaveBeenCalledWith('k2');
  });

  it('avisa mudança de horário com a chave e o campo', async () => {
    const { onTimeChange } = renderTimeline();
    const [, second] = screen.getAllByRole('listitem');
    const arrival = within(second).getByLabelText('Chegada');
    await userEvent.type(arrival, '14:30');
    expect(onTimeChange).toHaveBeenCalledWith('k2', 'startTime', expect.any(String));
    await userEvent.type(within(second).getByLabelText('Saída'), '15:00');
    expect(onTimeChange).toHaveBeenCalledWith('k2', 'endTime', expect.any(String));
  });

  it('mostra o erro quando a saída não vem depois da chegada', () => {
    renderTimeline({
      stops: [stop('k1', 'museu', { startTime: '12:00', endTime: '11:00' })],
    });
    const departure = screen.getByLabelText('Saída');
    expect(screen.getByText('A saída precisa ser depois da chegada.')).toBeInTheDocument();
    expect(departure).toHaveAccessibleDescription('A saída precisa ser depois da chegada.');
  });

  it('identifica locais indisponíveis e sem nome', () => {
    renderTimeline({ stops: [stop('k1', 'sumiu'), stop('k2', 'desconhecido')] });
    expect(screen.getByRole('listitem', { name: 'Parada 1: Local indisponível' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Local indisponível' })).not.toBeInTheDocument();
    expect(screen.getByText(/Remova a parada para salvar/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Local sem nome' })).toBeInTheDocument();
  });

  it('cada parada tem uma alça de arrastar acessível pelo teclado', () => {
    renderTimeline();
    const handle = screen.getByRole('button', { name: 'Arrastar a parada 1 (Museu Afro Brasil)' });
    expect(handle).toHaveAttribute('aria-roledescription', 'parada arrastável');
    expect(handle).toHaveAttribute('tabindex', '0');
    expect(handle).toHaveAccessibleDescription(/pressione espaço ou Enter para pegar a parada/);
  });

  it('desativa tudo enquanto o roteiro é salvo', () => {
    renderTimeline({ disabled: true });
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
    for (const input of screen.getAllByLabelText(/Chegada|Saída/)) expect(input).toBeDisabled();
  });
});
