import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, ApiErrorKind } from '../services/api';
import { fetchWeather } from '../services/itineraries';
import WeatherBadge from './WeatherBadge';

vi.mock('../services/itineraries', () => ({ fetchWeather: vi.fn() }));

const SUNNY = {
  forecast: {
    date: '2026-11-28',
    minTemperature: 18.5,
    maxTemperature: 27.2,
    weatherCode: 1,
    rainChance: 10,
  },
  warning: null,
};

function card() {
  return screen.getByRole('region', { name: 'Previsão do tempo em São Paulo' });
}

describe('WeatherBadge', () => {
  it('não aparece sem data', () => {
    render(<WeatherBadge date="" />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(fetchWeather).not.toHaveBeenCalled();
  });

  it('mostra condição, temperaturas, chance de chuva e a sugestão de atividade', async () => {
    fetchWeather.mockResolvedValue(SUNNY);
    render(<WeatherBadge date="2026-11-28" />);
    expect(within(card()).getByText('Consultando a previsão…')).toBeInTheDocument();

    expect(await within(card()).findByText('Predomínio de sol')).toBeInTheDocument();
    expect(fetchWeather).toHaveBeenCalledWith('2026-11-28', { signal: expect.any(AbortSignal) });
    expect(within(card()).getByText('sábado, 28 de novembro de 2026')).toBeInTheDocument();
    const facts = card();
    expect(within(facts).getByText('Mínima').nextSibling).toHaveTextContent('19°C');
    expect(within(facts).getByText('Máxima').nextSibling).toHaveTextContent('27°C');
    expect(within(facts).getByText('Chance de chuva').nextSibling).toHaveTextContent('10%');
    expect(within(card()).getByText(/Bom dia para atividades ao ar livre/)).toBeInTheDocument();
  });

  it('sugere espaços fechados quando a previsão é de chuva', async () => {
    fetchWeather.mockResolvedValue({
      ...SUNNY,
      forecast: { ...SUNNY.forecast, weatherCode: 63, rainChance: 80 },
    });
    render(<WeatherBadge date="2026-11-28" />);
    expect(await screen.findByText('Chuva')).toBeInTheDocument();
    expect(screen.getByText(/prefira museus, teatros, bibliotecas/)).toBeInTheDocument();
  });

  it('mostra o aviso do backend quando não há previsão para a data', async () => {
    fetchWeather.mockResolvedValue({
      forecast: null,
      warning: 'Data fora da janela de previsão do tempo.',
    });
    render(<WeatherBadge date="2027-03-01" />);
    expect(await screen.findByText('Data fora da janela de previsão do tempo.')).toBeInTheDocument();
  });

  it('consulta de novo quando a data muda', async () => {
    fetchWeather.mockResolvedValue(SUNNY);
    const { rerender } = render(<WeatherBadge date="2026-11-28" />);
    await screen.findByText('Predomínio de sol');
    rerender(<WeatherBadge date="2026-11-29" />);
    expect(await screen.findByText('domingo, 29 de novembro de 2026')).toBeInTheDocument();
    expect(fetchWeather).toHaveBeenLastCalledWith('2026-11-29', expect.anything());
  });

  it('mostra a falha e tenta de novo', async () => {
    fetchWeather
      .mockRejectedValueOnce(new ApiError('Fora do ar.', { kind: ApiErrorKind.SERVER, status: 503 }))
      .mockResolvedValueOnce(SUNNY);
    render(<WeatherBadge date="2026-11-28" />);
    expect(await screen.findByText('Fora do ar.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Predomínio de sol')).toBeInTheDocument();
  });
});
