// src/pages/Descobrir.jsx
// Página inicial. Por enquanto traz a chamada para o mapa (página Explorar); as demais
// seções do protótipo (busca, interesses, "Fora do óbvio"…) chegam nas próprias issues.
import { Link } from 'react-router-dom';
import mapaDescobrir from '../assets/mapa-descobrir.jpg';
import styles from './Descobrir.module.css';

export default function Descobrir() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>O que você quer descobrir na cidade hoje?</h1>

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
    </div>
  );
}
