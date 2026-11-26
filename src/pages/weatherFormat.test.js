import { describe, expect, it } from 'vitest';
import {
  activityRecommendation,
  describeWeather,
  formatTemperature,
  RAIN_LIKELY,
  RAIN_POSSIBLE,
} from './weatherFormat';

describe('describeWeather', () => {
  it.each([
    [0, 'clear', 'Céu limpo'],
    [1, 'clear', 'Predomínio de sol'],
    [2, 'cloudy', 'Parcialmente nublado'],
    [3, 'cloudy', 'Nublado'],
    [45, 'cloudy', 'Neblina'],
    [53, 'rain', 'Garoa'],
    [63, 'rain', 'Chuva'],
    [81, 'rain', 'Pancadas de chuva'],
    [95, 'storm', 'Tempestade'],
  ])('código WMO %i é %s (%s)', (code, kind, label) => {
    expect(describeWeather(code)).toMatchObject({ kind, label });
    expect(describeWeather(code).icon).toBeTruthy();
  });

  it('não quebra com código desconhecido', () => {
    expect(describeWeather(1234)).toMatchObject({ kind: 'unknown', label: 'Condição não informada' });
    expect(describeWeather(undefined).kind).toBe('unknown');
  });
});

describe('formatTemperature', () => {
  it('arredonda para graus inteiros', () => {
    expect(formatTemperature(18.5)).toBe('19°C');
    expect(formatTemperature(-0.4)).toBe('0°C');
    expect(formatTemperature(null)).toBe('–');
  });
});

describe('activityRecommendation', () => {
  it('sugere espaços abertos com tempo bom e pouca chance de chuva', () => {
    expect(activityRecommendation({ weatherCode: 0, rainChance: 10 }).tone).toBe('outdoor');
    expect(activityRecommendation({ weatherCode: 3, rainChance: null }).tone).toBe('outdoor');
  });

  it(`pede um plano fechado a partir de ${RAIN_POSSIBLE}% de chance de chuva`, () => {
    expect(activityRecommendation({ weatherCode: 2, rainChance: RAIN_POSSIBLE }).tone).toBe('mixed');
    expect(activityRecommendation({ weatherCode: 2, rainChance: RAIN_POSSIBLE - 1 }).tone).toBe(
      'outdoor',
    );
  });

  it(`sugere espaços fechados com chuva prevista ou ${RAIN_LIKELY}% de chance`, () => {
    expect(activityRecommendation({ weatherCode: 63, rainChance: 20 }).tone).toBe('indoor');
    expect(activityRecommendation({ weatherCode: 95, rainChance: null }).tone).toBe('indoor');
    expect(activityRecommendation({ weatherCode: 1, rainChance: RAIN_LIKELY }).tone).toBe('indoor');
  });

  it('não sugere nada sem saber a condição nem a chuva', () => {
    expect(activityRecommendation({ weatherCode: 1234, rainChance: null })).toBeNull();
  });
});
