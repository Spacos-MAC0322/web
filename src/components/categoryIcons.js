// src/components/categoryIcons.js
// Ícone da etiqueta de categoria (protótipo: "Arte" e "Música" em "Explore por interesse").
// As categorias vêm do Mapas Culturais ("Casa de Cultura", "Museu"…), então o ícone é
// escolhido por palavra-chave; sem correspondência, a etiqueta fica só com o texto.
import artIcon from '../assets/icons/arte.svg';
import musicIcon from '../assets/icons/musica.svg';

const MUSIC = { src: musicIcon, width: 15, height: 16 };
const ART = { src: artIcon, width: 16, height: 16 };

const RULES = [
  [/m[uú]sica|show|concerto|orquestra|samba|choro/i, MUSIC],
  [/arte|museu|galeria|ateli[eê]|exposi|cultura|cultural/i, ART],
];

export function categoryIcon(category) {
  if (typeof category !== 'string') return null;
  return RULES.find(([pattern]) => pattern.test(category))?.[1] ?? null;
}
