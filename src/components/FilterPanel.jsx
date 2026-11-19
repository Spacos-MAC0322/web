// src/components/FilterPanel.jsx
// Filtros do painel "Filtrar lugares" da página Explorar (issue #63, frame Explorar do
// Figma): "O que você quer ver?" com os grupos de interesse e quantos espaços há em cada
// um, "Para o seu passeio" (entrada gratuita e preço máximo) e a região da cidade. Cada
// mudança vale na hora: o mapa e a lista acompanham os filtros. No celular, os grupos
// ficam atrás do botão "Filtros", para o mapa não ficar abaixo de uma lista longa.
// "Para o seu passeio" só aparece quando algum espaço tem preço conhecido (o Mapas
// Culturais de São Paulo não informa preços) ou quando um filtro de preço já está ativo.
import { useId, useState } from 'react';
import useApiRequest, { RequestStatus } from '../hooks/useApiRequest';
import { fetchFilterOptions } from '../services/places';
import { PRICE_OPTIONS, ZONES, activeFilterCount } from '../services/searchFilters';
import { groupIcon } from './groupIcons';
import RequestError from './RequestError';
import styles from './FilterPanel.module.css';

const loadOptions = (signal) => fetchFilterOptions({ signal });
const ZONE_LABELS = { Centro: 'Centro' };
const zoneLabel = (zone) => ZONE_LABELS[zone] ?? `Zona ${zone}`;

const toggle = (list, value) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

function Option({ checked, onChange, icon, children, count }) {
  return (
    <li>
      <label className={styles.option}>
        <input type="checkbox" className={styles.checkbox} checked={checked} onChange={onChange} />
        <span className={styles.icon} aria-hidden="true">
          {icon && <img src={icon.src} alt="" width={icon.width} height={icon.height} />}
        </span>
        <span className={styles.label}>{children}</span>
        {count !== undefined && (
          <span className={styles.count}>
            {/* Lido como "Teatro, 4 espaços"; na tela, só o número. */}
            <span className="visually-hidden">{`, ${count} ${count === 1 ? 'espaço' : 'espaços'}`}</span>
            <span aria-hidden="true">{count}</span>
          </span>
        )}
      </label>
    </li>
  );
}

// Grupos sem espaços somem, a menos que já estejam marcados (ex.: vindos de um link).
// options: resultado de useApiRequest com { groups, pricedPlaces }.
function InterestGroups({ options, selected, onToggle }) {
  const { status, error, retry } = options;
  if (status === RequestStatus.ERROR) {
    return (
      <RequestError
        error={error}
        onRetry={retry}
        fallbackMessage="Não foi possível carregar as categorias."
      />
    );
  }
  if (status !== RequestStatus.SUCCESS) return <p className={styles.message}>Carregando…</p>;
  const visible = options.data.groups.filter(
    (group) => group.count > 0 || selected.includes(group.id),
  );
  if (visible.length === 0) return <p className={styles.message}>Ainda não há categorias.</p>;
  return (
    <ul className={styles.options}>
      {visible.map((group) => (
        <Option
          key={group.id}
          checked={selected.includes(group.id)}
          onChange={() => onToggle(group.id)}
          icon={groupIcon(group.id)}
          count={group.count}
        >
          {group.label}
        </Option>
      ))}
    </ul>
  );
}

function Group({ title, children }) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{title}</legend>
      {children}
    </fieldset>
  );
}

function PriceSelect({ value, onChange }) {
  const selectId = useId();
  return (
    <div className={styles.price}>
      <label htmlFor={selectId} className={styles.priceLabel}>
        Preço máximo
      </label>
      <select
        id={selectId}
        className={styles.select}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
      >
        <option value="">Sem limite</option>
        {PRICE_OPTIONS.map((price) => (
          <option key={price} value={price}>
            Até R$ {price}
          </option>
        ))}
      </select>
    </div>
  );
}

// filters: ver services/searchFilters.js; onChange(updater) recebe a função que gera os
// próximos filtros a partir dos atuais (como o setFilters de useSearchFilters).
export default function FilterPanel({ filters, onChange }) {
  const [open, setOpen] = useState(false);
  const groupsId = useId();
  const options = useApiRequest(loadOptions);
  const count = activeFilterCount({ ...filters, q: '' });
  const priceFilterActive = filters.free || filters.maxPrice !== null;
  const showPrices = (options.data?.pricedPlaces ?? 0) > 0 || priceFilterActive;
  const update = (patch) => onChange((current) => ({ ...current, ...patch(current) }));
  return (
    <div className={styles.panel}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={groupsId}
        onClick={() => setOpen((current) => !current)}
      >
        {count > 0 ? `Filtros (${count})` : 'Filtros'}
      </button>
      <div id={groupsId} className={`${styles.groups} ${open ? styles.open : ''}`}>
        <Group title="O que você quer ver?">
          <InterestGroups
            options={options}
            selected={filters.categories}
            onToggle={(id) => update((current) => ({ categories: toggle(current.categories, id) }))}
          />
        </Group>
        {showPrices && (
          <Group title="Para o seu passeio">
            <ul className={styles.options}>
              <Option
                checked={filters.free}
                onChange={() => update((current) => ({ free: !current.free }))}
              >
                Entrada gratuita
              </Option>
            </ul>
            <PriceSelect
              value={filters.maxPrice}
              onChange={(maxPrice) => update(() => ({ maxPrice }))}
            />
          </Group>
        )}
        <Group title="Região">
          <ul className={styles.options}>
            {ZONES.map((zone) => (
              <Option
                key={zone}
                checked={filters.regions.includes(zone)}
                onChange={() => update((current) => ({ regions: toggle(current.regions, zone) }))}
              >
                {zoneLabel(zone)}
              </Option>
            ))}
          </ul>
        </Group>
      </div>
    </div>
  );
}
