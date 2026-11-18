// src/components/PlaceCard.jsx
// Card de espaço cultural da seção "Fora do óbvio" (issue #52, componente "Card" do Figma):
// arte lateral nas cores do tema, nome, bairro · resumo, etiqueta de categoria e seta.
// O card inteiro é clicável, mas o link fica no título: leitores de tela anunciam só o
// nome do espaço, e não todo o texto do card.
import { Link } from 'react-router-dom';
import { placePath } from '../services/places';
import { categoryIcon } from './categoryIcons';
import PlaceTag from './PlaceTag';
import styles from './PlaceCard.module.css';

function CardFooter({ category }) {
  return (
    <div className={styles.footer}>
      {category && (
        <PlaceTag variant="category" icon={categoryIcon(category)} className={styles.categoryTag}>
          {category}
        </PlaceTag>
      )}
      <span className={styles.arrow} aria-hidden="true">
        →
      </span>
    </div>
  );
}

// place: { id, name, category, neighborhood, summary } (services/places.js, toCard).
// tone: par de cores da arte, "green" (verde + terracota) ou "mustard" (mostarda + grafite),
// alternado entre os cards como no protótipo.
// compact: item da lista do painel da página Explorar (Figma, 385 × 101 px): arte menor,
// nome e subtítulo, sem etiqueta nem seta.
export default function PlaceCard({ place, tone = 'green', headingLevel = 3, compact = false }) {
  const Heading = `h${headingLevel}`;
  const subtitle = [place.neighborhood, place.summary].filter(Boolean).join(' · ');
  const variant = compact ? styles.compact : '';
  return (
    <article className={`${styles.card} ${styles[tone] ?? styles.green} ${variant}`}>
      <div className={styles.art} aria-hidden="true">
        <span className={styles.blockBack} />
        <span className={styles.blockFront} />
      </div>
      <div className={styles.body}>
        <Heading className={styles.title}>
          <Link to={placePath(place.id)} className={styles.link}>
            {place.name}
          </Link>
        </Heading>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {!compact && <CardFooter category={place.category} />}
      </div>
    </article>
  );
}
