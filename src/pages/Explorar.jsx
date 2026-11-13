// src/pages/Explorar.jsx
// Mapa de espaços culturais. Os pinos acompanham a área visível: cada movimento ou zoom
// consulta o backend de novo (usePlacesInBounds). O painel de filtros (#63) e a lista de
// lugares entram ao lado do mapa nas próprias issues.
import MapExplorer from '../components/MapExplorer';
import styles from './Explorar.module.css';

export default function Explorar() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Encontre o seu próximo passeio</h1>
      <MapExplorer className={styles.map} />
    </div>
  );
}
