import { describe, expect, it, vi } from 'vitest';
import api from './api';
import {
  addPlaceToItinerary,
  createItinerary,
  deleteItinerary,
  fetchItinerary,
  fetchWeather,
  listItineraries,
  replaceItinerary,
  validateItinerary,
} from './itineraries';

const API_ITINERARY = {
  id: 'abc',
  title: 'Sábado no centro',
  date: '2026-11-28',
  stops: [
    {
      place_id: 'mapas_saas:space:65',
      order: 2,
      planned_start_time: '14:00',
      planned_end_time: null,
      conflict_warning: 'O local estará fechado no horário planejado.',
    },
    {
      place_id: 'mapas_saas:space:1',
      order: 1,
      planned_start_time: '10:00',
      planned_end_time: '11:30',
      event_id: 'evento-7',
      conflict_warning: null,
    },
  ],
  preferences: {},
  created_at: '2026-11-23T06:09:30.410000Z',
  updated_at: '2026-11-23T06:10:00.000000Z',
  weather_forecast: null,
  weather_warning: 'Previsão do tempo temporariamente indisponível.',
};

const ITINERARY = {
  id: 'abc',
  title: 'Sábado no centro',
  date: '2026-11-28',
  stops: [
    {
      placeId: 'mapas_saas:space:1',
      order: 1,
      startTime: '10:00',
      endTime: '11:30',
      eventId: 'evento-7',
      conflictWarning: null,
    },
    {
      placeId: 'mapas_saas:space:65',
      order: 2,
      startTime: '14:00',
      endTime: null,
      eventId: null,
      conflictWarning: 'O local estará fechado no horário planejado.',
    },
  ],
  createdAt: '2026-11-23T06:09:30.410000Z',
  updatedAt: '2026-11-23T06:10:00.000000Z',
  weatherForecast: null,
  weatherWarning: 'Previsão do tempo temporariamente indisponível.',
};

const INPUT = {
  title: 'Sábado no centro',
  date: '2026-11-28',
  stops: [
    { placeId: 'mapas_saas:space:65', startTime: '14:00', endTime: '', eventId: null },
    { placeId: 'mapas_saas:space:1', startTime: '10:00', endTime: '11:30', eventId: 'evento-7' },
  ],
};

const API_BODY = {
  title: 'Sábado no centro',
  date: '2026-11-28',
  stops: [
    {
      place_id: 'mapas_saas:space:65',
      order: 1,
      planned_start_time: '14:00',
      planned_end_time: null,
      event_id: null,
    },
    {
      place_id: 'mapas_saas:space:1',
      order: 2,
      planned_start_time: '10:00',
      planned_end_time: '11:30',
      event_id: 'evento-7',
    },
  ],
};

describe('services/itineraries', () => {
  it('listItineraries consulta GET /api/itineraries e normaliza os resumos', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({
      data: [
        {
          id: 'abc',
          title: 'Sábado',
          date: null,
          stop_count: 2,
          created_at: '2026-11-23T06:09:30Z',
          updated_at: '2026-11-23T06:09:30Z',
        },
        { id: 'def', title: 'Sem paradas' },
      ],
    });
    const { signal } = new AbortController();

    await expect(listItineraries({ signal })).resolves.toEqual([
      {
        id: 'abc',
        title: 'Sábado',
        date: null,
        stopCount: 2,
        createdAt: '2026-11-23T06:09:30Z',
        updatedAt: '2026-11-23T06:09:30Z',
      },
      { id: 'def', title: 'Sem paradas', date: null, stopCount: 0, createdAt: null, updatedAt: null },
    ]);
    expect(get).toHaveBeenCalledWith('/api/itineraries', { signal });
  });

  it('listItineraries devolve lista vazia quando a resposta não é uma lista', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: null });
    await expect(listItineraries()).resolves.toEqual([]);
  });

  it('fetchItinerary codifica o id e devolve as paradas em ordem de visita', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: API_ITINERARY });
    const { signal } = new AbortController();

    await expect(fetchItinerary('a/b c', { signal })).resolves.toEqual(ITINERARY);
    expect(get).toHaveBeenCalledWith('/api/itineraries/a%2Fb%20c', { signal });
  });

  it('fetchItinerary aceita roteiro sem paradas nem datas', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { id: 'x', title: 'Vazio' } });
    await expect(fetchItinerary('x')).resolves.toMatchObject({
      id: 'x',
      date: null,
      stops: [],
      createdAt: null,
    });
  });

  it('createItinerary envia POST com order renumerado pela posição na lista', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: API_ITINERARY });

    await expect(createItinerary(INPUT)).resolves.toEqual(ITINERARY);
    expect(post).toHaveBeenCalledWith('/api/itineraries', API_BODY, { signal: undefined });
  });

  it('createItinerary envia data vazia como null', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: API_ITINERARY });
    await createItinerary({ title: 'Ideias', date: '', stops: [] });
    expect(post.mock.calls[0][1]).toEqual({ title: 'Ideias', date: null, stops: [] });
  });

  it('replaceItinerary envia PUT com o roteiro inteiro', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: API_ITINERARY });
    const { signal } = new AbortController();

    await expect(replaceItinerary('abc', INPUT, { signal })).resolves.toEqual(ITINERARY);
    expect(put).toHaveBeenCalledWith('/api/itineraries/abc', API_BODY, { signal });
  });

  it('deleteItinerary envia DELETE', async () => {
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: '' });
    await expect(deleteItinerary('abc')).resolves.toBeUndefined();
    expect(del).toHaveBeenCalledWith('/api/itineraries/abc', { signal: undefined });
  });

  it('validateItinerary envia data e paradas e devolve os avisos na mesma ordem', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({
      data: [API_ITINERARY.stops[0], API_ITINERARY.stops[1]],
    });

    const stops = await validateItinerary({ date: INPUT.date, stops: INPUT.stops });

    expect(stops.map((stop) => stop.conflictWarning)).toEqual([
      'O local estará fechado no horário planejado.',
      null,
    ]);
    expect(post).toHaveBeenCalledWith(
      '/api/itineraries/validate',
      { date: INPUT.date, stops: API_BODY.stops },
      { signal: undefined },
    );
  });

  it('addPlaceToItinerary lê o roteiro e acrescenta o espaço como última parada', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: API_ITINERARY });
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: API_ITINERARY });

    await expect(addPlaceToItinerary('abc', 'teatro')).resolves.toEqual(ITINERARY);

    expect(put.mock.calls[0][0]).toBe('/api/itineraries/abc');
    expect(put.mock.calls[0][1]).toEqual({
      title: 'Sábado no centro',
      date: '2026-11-28',
      stops: [
        {
          place_id: 'mapas_saas:space:1',
          order: 1,
          planned_start_time: '10:00',
          planned_end_time: '11:30',
          event_id: 'evento-7',
        },
        {
          place_id: 'mapas_saas:space:65',
          order: 2,
          planned_start_time: '14:00',
          planned_end_time: null,
          event_id: null,
        },
        { place_id: 'teatro', order: 3, planned_start_time: null, planned_end_time: null, event_id: null },
      ],
    });
  });

  it('addPlaceToItinerary recusa roteiro cheio sem enviar nada', async () => {
    const full = {
      ...API_ITINERARY,
      stops: Array.from({ length: 50 }, (_, i) => ({ place_id: `p${i}`, order: i + 1 })),
    };
    vi.spyOn(api, 'get').mockResolvedValue({ data: full });
    const put = vi.spyOn(api, 'put');

    await expect(addPlaceToItinerary('abc', 'teatro')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Este roteiro já tem 50 paradas, o limite.',
    });
    expect(put).not.toHaveBeenCalled();
  });

  it('fetchWeather consulta a previsão da data e normaliza os campos', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        weather_forecast: {
          date: '2026-11-28',
          temperature_min: 18.5,
          temperature_max: 27.2,
          weather_code: 3,
          precipitation_probability: 40,
        },
        weather_warning: null,
      },
    });
    const { signal } = new AbortController();

    await expect(fetchWeather('2026-11-28', { signal })).resolves.toEqual({
      forecast: {
        date: '2026-11-28',
        minTemperature: 18.5,
        maxTemperature: 27.2,
        weatherCode: 3,
        rainChance: 40,
      },
      warning: null,
    });
    expect(get).toHaveBeenCalledWith('/api/itineraries/weather', {
      params: { date: '2026-11-28' },
      signal,
    });
  });

  it('fetchWeather devolve o aviso quando não há previsão', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { weather_forecast: null, weather_warning: 'Data fora da janela de previsão do tempo.' },
    });
    await expect(fetchWeather('2027-03-01')).resolves.toEqual({
      forecast: null,
      warning: 'Data fora da janela de previsão do tempo.',
    });
  });

  it('propaga o erro da API sem alterá-lo', async () => {
    const failure = new Error('falhou');
    vi.spyOn(api, 'get').mockRejectedValue(failure);
    await expect(fetchItinerary('abc')).rejects.toBe(failure);
  });
});
