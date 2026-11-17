import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import EventList from './EventList';

const EVENT = {
  title: 'Exposição Raízes',
  starts_at: '2099-11-20',
  ends_at: '2099-12-16',
  schedule_text: 'Terça a domingo, das 10h às 18h',
  price_text: 'Grátis',
  age_rating: 'Livre',
  description: { short: 'Fotografias da periferia paulistana.' },
};

const section = () => screen.getByRole('region', { name: 'Programação em cartaz' });

describe('EventList', () => {
  it('lista os eventos com data, horário, preço, classificação e resumo', () => {
    render(<EventList events={[EVENT]} />);
    const item = within(section()).getByRole('listitem');
    expect(within(item).getByRole('heading', { name: 'Exposição Raízes' })).toBeInTheDocument();
    expect(item).toHaveTextContent('20 de nov. a 16 de dez.');
    expect(item).toHaveTextContent('Terça a domingo, das 10h às 18h');
    expect(item).toHaveTextContent('Fotografias da periferia paulistana.');
    expect(item).toHaveTextContent('Grátis · Classificação: Livre');
  });

  it('mostra os eventos em ordem de início', () => {
    const later = { title: 'Show tarde', starts_at: '2099-11-25' };
    const sooner = { title: 'Oficina cedo', starts_at: '2099-11-18' };
    render(<EventList events={[later, sooner]} />);
    const titles = within(section()).getAllByRole('heading', { level: 3 });
    expect(titles.map((title) => title.textContent)).toEqual(['Oficina cedo', 'Show tarde']);
  });

  it('mostra os 6 primeiros e expande para a programação completa', async () => {
    const events = Array.from({ length: 8 }, (_, i) => ({
      title: `Evento ${i + 1}`,
      starts_at: `2099-11-1${i + 1}`,
    }));
    render(<EventList events={events} />);
    expect(within(section()).getAllByRole('listitem')).toHaveLength(6);

    const toggle = screen.getByRole('button', { name: 'Ver toda a programação (8)' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(within(section()).getAllByRole('listitem')).toHaveLength(8);
    expect(screen.getByRole('button', { name: 'Mostrar menos' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('não oferece expandir quando cabem todos os eventos', () => {
    render(<EventList events={[EVENT]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('mostra um estado vazio que avisa que a agenda pode estar incompleta', () => {
    render(<EventList events={[]} />);
    expect(section()).toHaveTextContent('Nenhuma programação encontrada para os próximos 30 dias');
    expect(section()).toHaveTextContent('pode estar incompleta');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('avisa de forma amigável quando a programação não pôde ser consultada', () => {
    render(<EventList events={null} />);
    expect(section()).toHaveTextContent('Não foi possível consultar a programação agora.');
  });
});
