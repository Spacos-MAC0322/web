// src/pages/weatherFormat.js
// Textos da previsão do tempo do roteiro (issue #101). O backend repassa o weather_code
// da Open-Meteo, que segue a tabela WMO: https://open-meteo.com/en/docs (WMO Weather
// interpretation codes).

// kind agrupa os códigos para o ícone e a recomendação.
const CONDITIONS = [
  { codes: [0], kind: 'clear', label: 'Céu limpo', icon: '☀️' },
  { codes: [1], kind: 'clear', label: 'Predomínio de sol', icon: '🌤️' },
  { codes: [2], kind: 'cloudy', label: 'Parcialmente nublado', icon: '⛅' },
  { codes: [3], kind: 'cloudy', label: 'Nublado', icon: '☁️' },
  { codes: [45, 48], kind: 'cloudy', label: 'Neblina', icon: '🌫️' },
  { codes: [51, 53, 55, 56, 57], kind: 'rain', label: 'Garoa', icon: '🌦️' },
  { codes: [61, 63, 65, 66, 67], kind: 'rain', label: 'Chuva', icon: '🌧️' },
  { codes: [80, 81, 82], kind: 'rain', label: 'Pancadas de chuva', icon: '🌧️' },
  { codes: [71, 73, 75, 77, 85, 86], kind: 'rain', label: 'Neve', icon: '🌨️' },
  { codes: [95, 96, 99], kind: 'storm', label: 'Tempestade', icon: '⛈️' },
];

const UNKNOWN = { kind: 'unknown', label: 'Condição não informada', icon: '🌡️' };

export function describeWeather(code) {
  const condition = CONDITIONS.find(({ codes }) => codes.includes(code));
  return condition ? { kind: condition.kind, label: condition.label, icon: condition.icon } : UNKNOWN;
}

export function formatTemperature(value) {
  return Number.isFinite(value) ? `${Math.round(value)}°C` : '–';
}

// A partir de quanto a chance de chuva muda a recomendação.
export const RAIN_LIKELY = 60;
export const RAIN_POSSIBLE = 30;

// Sugestão para escolher as paradas: espaços abertos (parques) ou fechados (museus,
// teatros). tone: 'outdoor', 'mixed' ou 'indoor'.
export function activityRecommendation({ weatherCode, rainChance }) {
  const { kind } = describeWeather(weatherCode);
  const chance = Number.isFinite(rainChance) ? rainChance : null;
  if (kind === 'storm' || kind === 'rain' || (chance !== null && chance >= RAIN_LIKELY)) {
    return {
      tone: 'indoor',
      text: 'Dia com chuva: prefira museus, teatros, bibliotecas e outros espaços fechados.',
    };
  }
  if (chance !== null && chance >= RAIN_POSSIBLE) {
    return {
      tone: 'mixed',
      text: 'Pode chover: tenha um espaço fechado como alternativa para as paradas ao ar livre.',
    };
  }
  if (kind === 'clear' || kind === 'cloudy') {
    return {
      tone: 'outdoor',
      text: 'Bom dia para atividades ao ar livre, como parques e passeios a pé.',
    };
  }
  return null;
}
