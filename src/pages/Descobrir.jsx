// src/pages/Descobrir.jsx
// Página inicial, na ordem do protótipo: título, "Explore por interesse", chamada para o
// mapa (página Explorar) e a seção "Fora do óbvio" (#53). Por enquanto, "Explore por
// interesse" só tem o filtro rápido "Fora do óbvio"; as demais pílulas chegam com a #62.
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import mapaDescobrir from '../assets/mapa-descobrir.jpg';
import DiscoverSection, { DISCOVER_SECTION_ID } from '../components/DiscoverSection';
import PlaceTag from '../components/PlaceTag';
import styles from './Descobrir.module.css';

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function InterestPills({ onDiscover }) {
  return (
    <section className={styles.interests} aria-labelledby="descobrir-interesses-titulo">
      <h2 id="descobrir-interesses-titulo" className={styles.interestsTitle}>
        Explore por interesse
      </h2>
      <ul className={styles.pills}>
        <li>
          <PlaceTag
            as="a"
            variant="hidden"
            href={`#${DISCOVER_SECTION_ID}`}
            onClick={onDiscover}
          >
            Fora do óbvio
          </PlaceTag>
        </li>
      </ul>
    </section>
  );
}

function MapSection() {
  return (
    <section className={styles.mapSection} aria-labelledby="descobrir-mapa-titulo">
      {/* Ilustração clicável; para teclado e leitores de tela, o link é o botão abaixo. */}
      <div className={styles.visual}>
        <Link to="/explorar" className={styles.mapImageLink} tabIndex={-1} aria-hidden="true">
          <img src={mapaDescobrir} alt="" className={styles.mapImage} />
        </Link>
        <span className={styles.tag} aria-hidden="true">
          pela cidade
        </span>
      </div>

      <div className={styles.text}>
        <h2 id="descobrir-mapa-titulo" className={styles.sectionTitle}>
          Explore o mapa da cidade de São Paulo
        </h2>
        <p className={styles.lead}>Escolha seus interesses e explore os lugares no mapa.</p>
        <Link to="/explorar" className={styles.mapLink}>
          Abrir o mapa
        </Link>
      </div>
    </section>
  );
}

export default function Descobrir() {
  const discoverHeading = useRef(null);

  // Filtro rápido: rola até a seção e leva o foco ao título, para teclado e leitores de tela.
  const goToDiscover = (event) => {
    event.preventDefault();
    const heading = discoverHeading.current;
    heading?.scrollIntoView?.({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
    heading?.focus({ preventScroll: true });
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>O que você quer descobrir na cidade hoje?</h1>
      <InterestPills onDiscover={goToDiscover} />
      <MapSection />
      <DiscoverSection headingRef={discoverHeading} />
    </div>
  );
}
