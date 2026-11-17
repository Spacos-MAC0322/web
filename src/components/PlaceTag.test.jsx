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
});
