// src/components/PlaceHero.jsx
// Faixa verde do topo da página do lugar (protótipo "Explorar - Detalhes"): imagem com
// cantos arredondados e formas terracota e mostarda atrás, e o nome do espaço em destaque.
// A fonte de dados não tem fotos: o espaço da imagem mostra a inicial do nome.

import styles from './PlaceHero.module.css';

export default function PlaceHero({ name, titleId }) {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <header className={styles.hero}>
      <div className={styles.art} aria-hidden="true">
        <span className={styles.accentTerracotta} />
        <span className={styles.accentMustard} />
        <div className={styles.picture}>
          <span className={styles.initial}>{initial}</span>
        </div>
      </div>
      <h1 id={titleId} className={styles.title}>
        {name}
      </h1>
    </header>
  );
}
