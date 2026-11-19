import { describe, expect, it } from 'vitest';
import { distanceKm, formatDistance, formatRadius, isInsideMapBounds } from './geo';

const SE = [-23.5503, -46.6339];
const MASP = [-23.5614, -46.6559];

describe('distanceKm', () => {
  it('calcula a distância em linha reta entre dois pontos', () => {
    expect(distanceKm(SE, MASP)).toBeCloseTo(2.6, 1);
    expect(distanceKm(SE, SE)).toBe(0);
  });
});

describe('isInsideMapBounds', () => {
  it('aceita a Grande São Paulo e recusa pontos fora dela', () => {
    expect(isInsideMapBounds(MASP)).toBe(true);
    expect(isInsideMapBounds([-22.9, -43.2])).toBe(false); // Rio de Janeiro
  });
});

describe('formatDistance', () => {
  it('usa metros abaixo de 1 km e km com vírgula acima', () => {
    expect(formatDistance(0.3456)).toBe('350 m');
    expect(formatDistance(0.001)).toBe('10 m');
    expect(formatDistance(1.234)).toBe('1,2 km');
    expect(formatDistance(10)).toBe('10 km');
  });
});

describe('formatRadius', () => {
  it('formata o raio do controle em km', () => {
    expect(formatRadius(0.5)).toBe('0,5 km');
    expect(formatRadius(2)).toBe('2 km');
  });
});
