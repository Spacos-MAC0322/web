import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, ApiErrorKind } from '../services/api';
import { fetchPlacesInBounds } from '../services/places';
import MapExplorer from './MapExplorer';

// Só a chamada ao backend é simulada; mapa, hook e conversão de limites são reais.
vi.mock('../services/places', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchPlacesInBounds: vi.fn(),
}));

const PIN = {
  id: 'mapas_saas:space:31',
  name: 'Museu de Teste',
  category: 'Museu',
  position: [-23.5505, -46.6333],
  badges: {},
};

function renderExplorer(props = {}) {
  return render(
    <MemoryRouter>
      <MapExplorer {...props} />
    </MemoryRouter>,
  );
}

const NEARBY_PIN = { ...PIN, id: 'perto', name: 'Teatro Perto', position: [-23.562, -46.656] };
const SEARCH_AREA = { center: [-23.5614, -46.6559], radiusKm: 1, label: 'MASP' };
const nearbyResult = (places) => ({
  places,
  status: 'success',
  error: null,
  retry: vi.fn(),
});

describe('MapExplorer', () => {
  beforeEach(() => {
    // O jsdom não calcula layout; sem tamanho, o mapa não teria área visível para consultar.
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
    fetchPlacesInBounds.mockReset();
    fetchPlacesInBounds.mockResolvedValue([PIN]);
  });

  it('renderiza o mapa e busca os pinos da área visível de São Paulo', async () => {
    renderExplorer();
    expect(screen.getByRole('region', { name: /mapa de espaços culturais/i })).toBeInTheDocument();
    expect(await screen.findByTitle('Museu de Teste')).toBeInTheDocument();

    expect(fetchPlacesInBounds).toHaveBeenCalledOnce();
    const [params] = fetchPlacesInBounds.mock.calls[0];
    expect(params.sw_lat).toBeLessThan(-23.5505);
    expect(params.ne_lat).toBeGreaterThan(-23.5505);
    expect(params.sw_lng).toBeLessThan(-46.6333);
    expect(params.ne_lng).toBeGreaterThan(-46.6333);
    expect(screen.getByRole('status')).toHaveTextContent('1 espaço nesta área');
  });

  it('abre o card do lugar ao clicar no pino', async () => {
    renderExplorer();
    await userEvent.click(await screen.findByTitle('Museu de Teste'));
    expect(
      await screen.findByRole('link', { name: 'Ver detalhes de Museu de Teste' }),
    ).toHaveAttribute('href', '/lugar/mapas_saas%3Aspace%3A31');
  });

  it('mostra o erro da API e consulta de novo ao clicar em "Tentar de novo"', async () => {
    fetchPlacesInBounds.mockRejectedValueOnce(
      new ApiError('Não foi possível conectar ao Spaços.', { kind: ApiErrorKind.NETWORK }),
    );
    renderExplorer();
    const retry = await screen.findByRole('button', { name: 'Tentar de novo' });
    expect(screen.getByRole('status')).toHaveTextContent('Não foi possível conectar ao Spaços.');

    await userEvent.click(retry);
    expect(await screen.findByTitle('Museu de Teste')).toBeInTheDocument();
    expect(fetchPlacesInBounds).toHaveBeenCalledTimes(2);
  });

  it('com uma área de busca, mostra o raio e só os espaços próximos, sem consultar a área', async () => {
    const { container } = renderExplorer({
      searchArea: SEARCH_AREA,
      nearby: nearbyResult([NEARBY_PIN]),
    });

    expect(await screen.findByTitle('Teatro Perto')).toBeInTheDocument();
    expect(screen.getByTitle('Ponto de referência: MASP')).toBeInTheDocument();
    expect(container.querySelector('path.leaflet-interactive, path')).not.toBeNull();
    expect(screen.queryByTitle('Museu de Teste')).not.toBeInTheDocument();
    expect(fetchPlacesInBounds).not.toHaveBeenCalled();
  });

  it('avisa quando não há espaços no raio', async () => {
    renderExplorer({ searchArea: SEARCH_AREA, nearby: nearbyResult([]) });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Nenhum espaço em até 1 km. Aumente o raio.',
    );
  });

  it('volta a consultar a área visível quando a busca é limpa', async () => {
    const { rerender } = renderExplorer({
      searchArea: SEARCH_AREA,
      nearby: nearbyResult([NEARBY_PIN]),
    });
    await screen.findByTitle('Teatro Perto');
    rerender(
      <MemoryRouter>
        <MapExplorer />
      </MemoryRouter>,
    );
    expect(await screen.findByTitle('Museu de Teste')).toBeInTheDocument();
    expect(fetchPlacesInBounds).toHaveBeenCalledOnce();
  });

  it('mostra o botão de localização abaixo do zoom quando há onLocate', async () => {
    const onLocate = vi.fn();
    renderExplorer({ onLocate });
    await userEvent.click(screen.getByRole('button', { name: 'Usar minha localização' }));
    expect(onLocate).toHaveBeenCalledOnce();
  });
});
