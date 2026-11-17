// src/components/PlaceTag.jsx
// Etiqueta de um espaço, como no componente "Icons e Tags" do protótipo (Figma). Variantes:
// "category", "accessible", "free", "hidden" e "neutral" (padrão). Cores: categoria
// (mostarda), Acessível (sálvia), Fora do óbvio (terracota), Grátis e demais selos (claras,
// com borda). Os ícones são decorativos: o texto já diz o que a etiqueta significa.
// `as` troca o elemento (ex.: "a" para o filtro rápido) e `icon` substitui o ícone padrão
// da variante ({ src, width, height }, ex.: o da categoria).
import accessibleIcon from '../assets/icons/acessivel.svg';
import hiddenGemIcon from '../assets/icons/fora-do-obvio.svg';
import freeIcon from '../assets/icons/gratis.svg';
import styles from './PlaceTag.module.css';

const ICONS = {
  accessible: { src: accessibleIcon, width: 18, height: 18, bleed: true },
  free: { src: freeIcon, width: 14, height: 16 },
  hidden: { src: hiddenGemIcon, width: 18, height: 16 },
};

export default function PlaceTag({
  variant = 'neutral',
  icon = ICONS[variant],
  as: Element = 'span',
  className = '',
  children,
  ...props
}) {
  const variantClass = styles[variant] ?? styles.neutral;
  return (
    <Element className={`${styles.tag} ${variantClass} ${className}`} {...props}>
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
    </Element>
  );
}
