import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { categoryIcon } from './categoryIcons';
import PlaceCard from './PlaceCard';

const PLACE = {
  id: 'mapas_saas:space:7',
  name: 'Casa de Cultura do Butantã',
  category: 'Casa de Cultura',
  neighborhood: 'Butantã',
  summary: 'Oficinas, saraus e exposições.',
};

function PlaceIdPage() {
  return <p>Lugar {useParams().id}</p>;
}

function renderCard(place = PLACE, props = {}) {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<PlaceCard place={place} {...props} />} />
        <Route path="/lugar/:id" element={<PlaceIdPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PlaceCard', () => {
  it('mostra nome, bairro · resumo e a categoria', () => {
    renderCard();
    expect(screen.getByRole('heading', { level: 3, name: PLACE.name })).toBeInTheDocument();
    expect(screen.getByText('Butantã · Oficinas, saraus e exposições.')).toBeInTheDocument();
    expect(screen.getByText('Casa de Cultura')).toBeInTheDocument();
  });

  it('tem um único link, nomeado só pelo nome do espaço, para a página do lugar', async () => {
    renderCard();
    const link = screen.getByRole('link');
    expect(link).toHaveAccessibleName(PLACE.name);
    expect(link).toHaveAttribute('href', '/lugar/mapas_saas%3Aspace%3A7');
    await userEvent.click(link);
    expect(screen.getByText('Lugar mapas_saas:space:7')).toBeInTheDocument();
  });

  it('deixa a arte e a seta fora da árvore de acessibilidade', () => {
    const { container } = renderCard();
    const hidden = container.querySelectorAll('div[aria-hidden="true"], span[aria-hidden="true"]');
    expect(hidden).toHaveLength(2);
    expect(hidden[1]).toHaveTextContent('→');
  });

  it('exibe o botão de favoritar com ícone de estrela', () => {
    renderCard();
    const favButton = screen.getByRole('button', {
      name: `Favoritar ${PLACE.name}`,
    });
    expect(favButton).toBeInTheDocument();
    expect(favButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('usa só o que existe no subtítulo e omite o que falta', () => {
    renderCard({ ...PLACE, neighborhood: null });
    expect(screen.getByText('Oficinas, saraus e exposições.')).toBeInTheDocument();
  });

  it('omite subtítulo e etiqueta sem bairro, resumo nem categoria', () => {
    const { container } = renderCard({ id: 'x', name: 'Só o nome' });
    expect(container.querySelector('p')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('aceita o nível de título da seção onde está', () => {
    renderCard(PLACE, { headingLevel: 2 });
    expect(screen.getByRole('heading', { level: 2, name: PLACE.name })).toBeInTheDocument();
  });
});

describe('categoryIcon', () => {
  it('escolhe Música ou Arte por palavra-chave, e nenhum ícone sem correspondência', () => {
    expect(categoryIcon('Casa de Música')).toMatchObject({ width: 15, height: 16 });
    expect(categoryIcon('Museu')).toMatchObject({ width: 16, height: 16 });
    expect(categoryIcon('Centro Cultural')).toMatchObject({ width: 16, height: 16 });
    expect(categoryIcon('Biblioteca')).toBeNull();
    expect(categoryIcon(null)).toBeNull();
  });

  it('na versão compacta (lista do Explorar) mostra só nome e subtítulo', () => {
    renderCard({ ...PLACE, summary: 'a 350 m · gratuito' }, { compact: true });
    expect(screen.getByRole('link', { name: PLACE.name })).toBeInTheDocument();
    expect(screen.getByText('Butantã · a 350 m · gratuito')).toBeInTheDocument();
    expect(screen.queryByText('Casa de Cultura')).not.toBeInTheDocument();
    expect(screen.queryByText('→')).not.toBeInTheDocument();
  });
});
