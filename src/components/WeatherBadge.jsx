// src/components/WeatherBadge.jsx
// Previsão do tempo para o dia do roteiro (issue #101, user story #13): ícone e condição,
// temperaturas mínima e máxima, chance de chuva e uma sugestão de espaços abertos ou
// fechados. Consulta de novo sempre que a data muda; sem data, não mostra nada.
import { useCallback } from 'react';
import useApiRequest, { RequestStatus } from '../hooks/useApiRequest';
import { formatItineraryDate } from '../pages/itineraryFormat';
import {
  activityRecommendation,
  describeWeather,
  formatTemperature,
} from '../pages/weatherFormat';
import { fetchWeather } from '../services/itineraries';
import RequestError from './RequestError';
import styles from './WeatherBadge.module.css';

const WEATHER_ERROR = 'Não foi possível consultar a previsão do tempo agora.';

function Forecast({ forecast, date }) {
  const condition = describeWeather(forecast.weatherCode);
  const recommendation = activityRecommendation(forecast);
  const rain = Number.isFinite(forecast.rainChance) ? `${Math.round(forecast.rainChance)}%` : '–';
  return (
    <>
      <div className={styles.summary}>
        <span className={styles.icon} aria-hidden="true">
          {condition.icon}
        </span>
        <div className={styles.text}>
          <p className={styles.condition}>{condition.label}</p>
          <p className={styles.date}>{formatItineraryDate(date)}</p>
        </div>
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>Mínima</dt>
          <dd>{formatTemperature(forecast.minTemperature)}</dd>
        </div>
        <div>
          <dt>Máxima</dt>
          <dd>{formatTemperature(forecast.maxTemperature)}</dd>
        </div>
        <div>
          <dt>Chance de chuva</dt>
          <dd>{rain}</dd>
        </div>
      </dl>
      {recommendation && (
        <p className={`${styles.recommendation} ${styles[recommendation.tone]}`}>
          {recommendation.text}
        </p>
      )}
    </>
  );
}

function WeatherContent({ date }) {
  const load = useCallback((signal) => fetchWeather(date, { signal }), [date]);
  const { data, status, error, retry } = useApiRequest(load);

  if (status === RequestStatus.ERROR) {
    return <RequestError error={error} onRetry={retry} fallbackMessage={WEATHER_ERROR} />;
  }
  if (status !== RequestStatus.SUCCESS) {
    return <p className={styles.note}>Consultando a previsão…</p>;
  }
  if (!data.forecast) {
    // Fora da janela de 16 dias ou Open-Meteo indisponível: o backend explica o motivo.
    return <p className={styles.note}>{data.warning ?? 'Previsão indisponível para esta data.'}</p>;
  }
  return <Forecast forecast={data.forecast} date={date} />;
}

// date: data do roteiro (YYYY-MM-DD) ou vazio.
export default function WeatherBadge({ date }) {
  if (!date) return null;
  return (
    <section className={styles.card} aria-label="Previsão do tempo em São Paulo">
      <h2 className={styles.title}>Previsão do tempo</h2>
      <WeatherContent date={date} />
    </section>
  );
}
