// src/pages/placeFormat.js
// Textos da página de detalhes do lugar a partir do JSON de GET /api/places/{id}.
// Admission/acessibilidade alimentam o card "Planeje sua visita" do protótipo.
// O backend não infere o que a fonte não informa: campos ausentes viram "não informado".

const FREE_ADMISSION = /\b(gr[aá]tis|gratuit[oa]|entrada (franca|livre))\b/i;
const SAFE_URL = /^https?:\/\//i;

function formatMoney(value, currency) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
  } catch {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
}

function priceRange(min, max, currency) {
  const hasMin = Number.isFinite(min);
  const hasMax = Number.isFinite(max);
  if (hasMin && hasMax && min !== max) {
    return `${formatMoney(min, currency)} a ${formatMoney(max, currency)}`;
  }
  if (hasMin || hasMax) return formatMoney(hasMin ? min : max, currency);
  return null;
}

// { isFree, text }: `text` é null quando a fonte não informa o valor da entrada.
// A sincronização com o Mapas Culturais só traz o preço em texto livre ("Entrada gratuita"),
// por isso a gratuidade também é reconhecida no texto.
export function describeAdmission(admission = {}) {
  const { is_free: isFreeFlag, price_min: min, price_max: max, price_text: priceText } = admission;
  const currency = admission.currency || 'BRL';
  const zeroPrice = min === 0 && (max ?? 0) === 0;
  const freeText = FREE_ADMISSION.test(priceText ?? '');
  const isFree = isFreeFlag === true || (isFreeFlag !== false && (zeroPrice || freeText));
  const text = priceText || priceRange(min, max, currency);
  return { isFree, text: isFree && !priceText ? null : text };
}

// O horário vem em texto livre; quebras de linha e ";" separam os dias.
export function openingHoursLines(openingHours = {}) {
  return (openingHours.text ?? '')
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean);
}

// Valor da linha "Entrada": o texto da fonte, ou "Gratuita" quando só se sabe que é grátis.
export function admissionText(admission) {
  const { isFree, text } = describeAdmission(admission);
  return text ?? (isFree ? 'Gratuita' : null);
}

const EXTRA_TAGS = [
  ['pet_friendly', 'Pet-friendly'],
  ['family_friendly', 'Bom para famílias'],
  ['lgbtqia_inclusion', 'Espaço seguro LGBTQIAP+'],
];

// Etiquetas do espaço na ordem do protótipo: Acessível, Grátis, Fora do óbvio e os demais
// selos de curadoria. Só selos confirmados (true) viram etiqueta; false e null, não.
export function placeTags(place) {
  const badges = place.badges ?? {};
  const tags = [];
  if (badges.wheelchair === true) tags.push({ variant: 'accessible', label: 'Acessível' });
  if (badges.is_free === true || describeAdmission(place.admission).isFree) {
    tags.push({ variant: 'free', label: 'Grátis' });
  }
  if (badges.hidden_gem === true) tags.push({ variant: 'hidden', label: 'Fora do óbvio' });
  for (const [key, label] of EXTRA_TAGS) {
    if (badges[key] === true) tags.push({ variant: 'neutral', label });
  }
  return tags;
}

// Linha "Acessibilidade": recursos confirmados pela fonte, mais as observações da fonte e
// da curadoria. `text` é null quando nada foi informado.
export function describeAccessibility(accessibility = {}, curationNotes = null) {
  const parts = [];
  if (accessibility.wheelchair === true) parts.push('acessível para cadeira de rodas');
  if (accessibility.wheelchair === false) parts.push('sem acesso para cadeira de rodas');
  if (accessibility.adapted_restroom === true) parts.push('banheiro adaptado');
  parts.push(...(accessibility.physical_features ?? []));
  if (parts.length === 0 && accessibility.declared === true) {
    parts.push('acessibilidade declarada pela fonte');
  }
  const joined = parts.join(', ');
  const text = joined ? joined[0].toUpperCase() + joined.slice(1) : null;
  return { text, notes: [accessibility.notes, curationNotes].filter(Boolean) };
}

// Links só para http(s): o site vem da fonte e não pode virar "javascript:".
export function safeWebsite(url) {
  return typeof url === 'string' && SAFE_URL.test(url.trim()) ? url.trim() : null;
}

export function phoneHref(phone) {
  const digits = (phone ?? '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : null;
}

const PROVIDER_NAMES = { geosampa: 'GeoSampa' };

// "mapas_saas" e "mapas_culturais:<host>" são instâncias do Mapas Culturais.
function providerName(provider) {
  return provider.startsWith('mapas') ? 'Mapas Culturais' : (PROVIDER_NAMES[provider] ?? provider);
}

// Origem dos dados (ASR01): nomes únicos das fontes, com link para o registro quando houver.
export function sourceLinks(sources = []) {
  const seen = new Map();
  for (const source of sources) {
    const name = providerName(source.provider);
    if (!seen.has(name) || (!seen.get(name).url && source.record_url)) {
      seen.set(name, { name, url: safeWebsite(source.record_url) });
    }
  }
  return [...seen.values()];
}
