import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import MapPopupCard from './MapPopupCard';

const PLACE = { id: 'mapas_saas:space:31', name: 'Museu de Teste', category: 'Museu' };

function PlaceIdPage() {
  return <p>Lugar {useParams().id}</p>;
}

function renderCard(place = PLACE) {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<MapPopupCard place={place} />} />
        <Route path="/lugar/:id" element={<PlaceIdPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MapPopupCard', () => {
  it('mostra nome, categoria e o botão "Ver detalhes"', () => {
    renderCard();
    expect(screen.getByRole('article', { name: 'Museu de Teste' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Museu de Teste' })).toBeInTheDocument();
    expect(screen.getByText('Museu')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver detalhes de Museu de Teste' })).toHaveTextContent(
      'Ver detalhes',
    );
  });

  it('omite a tag quando o lugar não tem categoria', () => {
    renderCard({ ...PLACE, category: null });
    expect(screen.queryByText('Museu')).not.toBeInTheDocument();
  });

  it('leva o foco para o botão ao abrir, para quem navega pelo teclado', () => {
    renderCard();
    expect(screen.getByRole('link', { name: /ver detalhes/i })).toHaveFocus();
  });

  it('navega para a página do lugar com o id codificado na URL', async () => {
    renderCard();
    const link = screen.getByRole('link', { name: /ver detalhes/i });
    expect(link).toHaveAttribute('href', '/lugar/mapas_saas%3Aspace%3A31');
    await userEvent.click(link);
    expect(screen.getByText('Lugar mapas_saas:space:31')).toBeInTheDocument();
  });
});
