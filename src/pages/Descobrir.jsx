// src/pages/Descobrir.jsx
// Página inicial, na ordem do protótipo: título, barra de busca, "Explore por interesse",
// chamada para o mapa (página Explorar) e a seção "Fora do óbvio" (#53). A busca e as
// pílulas abrem a Explorar com os filtros já aplicados (issue #62).
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import mapaDescobrir from '../assets/mapa-descobrir.jpg';
import DiscoverSection, { DISCOVER_SECTION_ID } from '../components/DiscoverSection';
import InterestPills from '../components/InterestPills';
import SearchBar from '../components/SearchBar';
import { explorePath } from '../services/searchFilters';
import styles from './Descobrir.module.css';

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

// Envia para a Explorar, onde o mapa e a lista mostram o resultado.
function PlaceSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  return (
    <SearchBar
      className={styles.search}
      label="Buscar espaços culturais por nome, bairro ou região"
      placeholder="Busque por lugar, bairro ou região"
      autoComplete="off"
      maxLength={100}
      value={query}
      onChange={setQuery}
      onSubmit={(text) => navigate(explorePath({ q: text.trim() }))}
      submitLabel="Buscar"
    />
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
      <div className={styles.hero}>
        <h1 className={styles.title}>O que você quer descobrir na cidade hoje?</h1>
        <PlaceSearch />
      </div>
      <InterestPills discoverHref={`#${DISCOVER_SECTION_ID}`} onDiscover={goToDiscover} />
      <MapSection />
      <DiscoverSection headingRef={discoverHeading} />
    </div>
  );
}
