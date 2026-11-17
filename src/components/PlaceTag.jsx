// src/components/PlaceTag.jsx
// Etiqueta de um espaço, como no componente "Icons e Tags" do protótipo (Figma). Variantes:
// "category", "accessible", "free", "hidden" e "neutral" (padrão). Cores: categoria
// (mostarda), Acessível (sálvia), Fora do óbvio (terracota), Grátis e demais selos (claras,
// com borda). Os ícones são decorativos: o texto já diz o que a etiqueta significa.
import accessibleIcon from '../assets/icons/acessivel.svg';
import hiddenGemIcon from '../assets/icons/fora-do-obvio.svg';
import freeIcon from '../assets/icons/gratis.svg';
import styles from './PlaceTag.module.css';

const ICONS = {
  accessible: { src: accessibleIcon, width: 18, height: 18, bleed: true },
  free: { src: freeIcon, width: 14, height: 16 },
  hidden: { src: hiddenGemIcon, width: 18, height: 16 },
};

export default function PlaceTag({ variant = 'neutral', children }) {
  const icon = ICONS[variant];
  return (
    <span className={`${styles.tag} ${styles[variant] ?? styles.neutral}`}>
      {children}
      {icon && (
        <img
          src={icon.src}
          width={icon.width}
          height={icon.height}
          alt=""
          className={icon.bleed ? styles.iconBleed : styles.icon}
        />
      )}
    </span>
  );
}
