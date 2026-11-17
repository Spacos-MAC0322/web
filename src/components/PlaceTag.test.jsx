import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PlaceTag from './PlaceTag';

const TAG_VARIANTS = ['category', 'accessible', 'free', 'hidden', 'neutral'];

describe('PlaceTag', () => {
  it('mostra o texto e mantém o ícone fora da árvore de acessibilidade', () => {
    const { container } = render(<PlaceTag variant="accessible">Acessível</PlaceTag>);
    expect(screen.getByText('Acessível')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('só usa ícone nas variantes que têm ícone no protótipo', () => {
    const withIcon = TAG_VARIANTS.filter((variant) => {
      const { container, unmount } = render(<PlaceTag variant={variant}>Tag</PlaceTag>);
      const hasIcon = container.querySelector('img') !== null;
      unmount();
      return hasIcon;
    });
    expect(withIcon).toEqual(['accessible', 'free', 'hidden']);
  });

  it('aceita um ícone próprio (ex.: o da categoria)', () => {
    const icon = { src: '/arte.svg', width: 16, height: 16 };
    const { container } = render(
      <PlaceTag variant="category" icon={icon}>
        Museu
      </PlaceTag>,
    );
    expect(container.querySelector('img')).toHaveAttribute('src', '/arte.svg');
  });

  it('pode ser um link, repassando os atributos', () => {
    render(
      <PlaceTag as="a" variant="hidden" href="#fora-do-obvio">
        Fora do óbvio
      </PlaceTag>,
    );
    expect(screen.getByRole('link', { name: 'Fora do óbvio' })).toHaveAttribute(
      'href',
      '#fora-do-obvio',
    );
  });
});
