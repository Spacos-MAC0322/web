import { describe, expect, it } from 'vitest';
import {
  admissionText,
  describeAccessibility,
  describeAdmission,
  openingHoursLines,
  phoneHref,
  placeTags,
  safeWebsite,
  sourceLinks,
} from './placeFormat';

describe('describeAdmission', () => {
  it('destaca entrada grátis pela flag do backend', () => {
    expect(describeAdmission({ is_free: true })).toEqual({ isFree: true, text: null });
  });

  it('reconhece gratuidade no texto livre do Mapas Culturais e mantém o texto', () => {
    expect(describeAdmission({ price_text: 'Entrada gratuita' })).toEqual({
      isFree: true,
      text: 'Entrada gratuita',
    });
  });

  it('não marca como grátis quando a fonte diz que é pago', () => {
    const admission = { is_free: false, price_text: 'Grátis às terças' };
    expect(describeAdmission(admission).isFree).toBe(false);
  });

  it('prefere o texto da fonte e formata a faixa de preço em reais quando não há texto', () => {
    expect(describeAdmission({ price_text: 'R$ 20 (inteira)', price_min: 10 }).text).toBe(
      'R$ 20 (inteira)',
    );
    expect(describeAdmission({ price_min: 10, price_max: 25.5 }).text).toMatch(
      /^R\$\s10,00 a R\$\s25,50$/,
    );
    expect(describeAdmission({ price_max: 30 }).text).toMatch(/^R\$\s30,00$/);
  });

  it('trata preço zero como grátis e devolve null sem informação', () => {
    expect(describeAdmission({ price_min: 0 }).isFree).toBe(true);
    expect(describeAdmission({})).toEqual({ isFree: false, text: null });
  });
});

describe('openingHoursLines', () => {
  it('separa o texto livre por quebras de linha e ponto e vírgula', () => {
    expect(openingHoursLines({ text: 'Ter a sex: 10h às 18h;\n Sáb: 9h às 14h\n\n' })).toEqual([
      'Ter a sex: 10h às 18h',
      'Sáb: 9h às 14h',
    ]);
  });

  it('devolve lista vazia sem horário', () => {
    expect(openingHoursLines({ text: null })).toEqual([]);
    expect(openingHoursLines()).toEqual([]);
  });
});

describe('admissionText', () => {
  it('usa o texto da fonte, "Gratuita" quando só a gratuidade é conhecida, ou null', () => {
    expect(admissionText({ price_text: 'R$ 20' })).toBe('R$ 20');
    expect(admissionText({ is_free: true })).toBe('Gratuita');
    expect(admissionText({})).toBeNull();
  });
});

describe('placeTags', () => {
  it('lista as etiquetas confirmadas na ordem do protótipo', () => {
    const place = {
      badges: { hidden_gem: true, wheelchair: true, pet_friendly: false, family_friendly: true },
      admission: { price_text: 'Entrada gratuita' },
    };
    expect(placeTags(place)).toEqual([
      { variant: 'accessible', label: 'Acessível' },
      { variant: 'free', label: 'Grátis' },
      { variant: 'hidden', label: 'Fora do óbvio' },
      { variant: 'neutral', label: 'Bom para famílias' },
    ]);
  });

  it('não cria etiquetas sem selos confirmados', () => {
    expect(placeTags({ badges: { wheelchair: null, is_free: false } })).toEqual([]);
    expect(placeTags({})).toEqual([]);
  });
});

describe('describeAccessibility', () => {
  it('junta os recursos confirmados numa frase e separa as observações', () => {
    expect(
      describeAccessibility(
        {
          wheelchair: true,
          adapted_restroom: true,
          physical_features: ['rampa'],
          notes: 'Elevador',
        },
        'Piso tátil na entrada',
      ),
    ).toEqual({
      text: 'Acessível para cadeira de rodas, banheiro adaptado, rampa',
      notes: ['Elevador', 'Piso tátil na entrada'],
    });
  });

  it('informa quando a fonte só declara acessibilidade, e null quando nada foi informado', () => {
    expect(describeAccessibility({ declared: true }).text).toBe(
      'Acessibilidade declarada pela fonte',
    );
    expect(describeAccessibility({ wheelchair: false }).text).toBe(
      'Sem acesso para cadeira de rodas',
    );
    expect(describeAccessibility()).toEqual({ text: null, notes: [] });
  });
});

describe('links de contato e fonte', () => {
  it('aceita apenas sites http(s)', () => {
    expect(safeWebsite(' https://museu.sp.gov.br ')).toBe('https://museu.sp.gov.br');
    expect(safeWebsite('javascript:alert(1)')).toBeNull();
    expect(safeWebsite('www.museu.com')).toBeNull();
  });

  it('monta o link de telefone só com dígitos', () => {
    expect(phoneHref('(11) 3333-4444')).toBe('tel:1133334444');
    expect(phoneHref('')).toBeNull();
  });

  it('agrupa as fontes por nome e usa o link do registro', () => {
    expect(
      sourceLinks([
        { provider: 'mapas_saas', external_id: '1' },
        { provider: 'mapas_saas', external_id: '1', record_url: 'https://mapas.example/espaco/1' },
        { provider: 'geosampa', external_id: '9' },
      ]),
    ).toEqual([
      { name: 'Mapas Culturais', url: 'https://mapas.example/espaco/1' },
      { name: 'GeoSampa', url: null },
    ]);
  });
});
