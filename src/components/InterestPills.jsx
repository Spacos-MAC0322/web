// src/components/InterestPills.jsx
// "Explore por interesse" da Descobrir (issue #62; Figma, Homepage): pílulas que abrem o
// mapa da página Explorar já filtrado, e "Fora do óbvio", que leva à seção desta página.
// "Acessível" chega com a user story #7, quando houver dados de acessibilidade para filtrar.
// "Grátis" só aparece quando algum espaço tem preço conhecido: o Mapas Culturais de São
// Paulo não informa preços, e o filtro não teria resultado.
import { useId } from 'react';
import { Link } from 'react-router-dom';
import useApiRequest, { RequestStatus } from '../hooks/useApiRequest';
import { fetchFilterOptions } from '../services/places';
import { explorePath } from '../services/searchFilters';
import { categoryIcon } from './categoryIcons';
import PlaceTag from './PlaceTag';
import styles from './InterestPills.module.css';

const loadOptions = (signal) => fetchFilterOptions({ signal });

function LinkPill({ to, variant, icon, children }) {
  return (
    <li>
      <PlaceTag as={Link} to={to} variant={variant} icon={icon}>
        {children}
      </PlaceTag>
    </li>
  );
}

// discoverHref/onDiscover: âncora e ação do "Fora do óbvio" (rolar e levar o foco).
// Ordem do protótipo: Arte, Música, Fora do óbvio, Grátis e "+ Mais".
export default function InterestPills({ discoverHref, onDiscover }) {
  const titleId = useId();
  const options = useApiRequest(loadOptions);
  const hasPrices = options.status === RequestStatus.SUCCESS && options.data.pricedPlaces > 0;
  return (
    <section className={styles.interests} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        Explore por interesse
      </h2>
      <ul className={styles.pills}>
        <LinkPill
          to={explorePath({ categories: ['arte'] })}
          variant="category"
          icon={categoryIcon('Arte')}
        >
          Arte
        </LinkPill>
        <LinkPill
          to={explorePath({ categories: ['musica'] })}
          variant="category"
          icon={categoryIcon('Música')}
        >
          Música
        </LinkPill>
        <li>
          <PlaceTag as="a" variant="hidden" href={discoverHref} onClick={onDiscover}>
            Fora do óbvio
          </PlaceTag>
        </li>
        {hasPrices && (
          <LinkPill to={explorePath({ free: true })} variant="free">
            Grátis
          </LinkPill>
        )}
        <LinkPill to={explorePath()} variant="neutral">
          + Mais filtros
        </LinkPill>
      </ul>
    </section>
  );
}
