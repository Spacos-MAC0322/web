// src/components/groupIcons.js
// Ícone de cada grupo de interesse do painel "Filtrar lugares" (ids de
// GET /api/search/filters). Música usa o ícone do protótipo; os demais são Material
// Symbols (Google, licença Apache 2.0), a mesma família dos ícones do protótipo, como as
// máscaras de Teatro e o garfo e faca de Gastronomia. Grupo sem ícone fica só com o nome.
import arteUrbanaIcon from '../assets/icons/arte-urbana.svg';
import cinemaIcon from '../assets/icons/cinema.svg';
import culturaIcon from '../assets/icons/cultura.svg';
import cursosIcon from '../assets/icons/cursos.svg';
import gastronomiaIcon from '../assets/icons/gastronomia.svg';
import leituraIcon from '../assets/icons/leitura.svg';
import musicIcon from '../assets/icons/musica.svg';
import parquesIcon from '../assets/icons/parques.svg';
import patrimonioIcon from '../assets/icons/patrimonio.svg';
import teatroIcon from '../assets/icons/teatro.svg';

const symbol = (src) => ({ src, width: 20, height: 20 });

const GROUP_ICONS = {
  arte: symbol(culturaIcon),
  teatro: symbol(teatroIcon),
  musica: { src: musicIcon, width: 15, height: 16 },
  cinema: symbol(cinemaIcon),
  leitura: symbol(leituraIcon),
  parques: symbol(parquesIcon),
  patrimonio: symbol(patrimonioIcon),
  formacao: symbol(cursosIcon),
  'arte-urbana': symbol(arteUrbanaIcon),
  gastronomia: symbol(gastronomiaIcon),
};

export function groupIcon(id) {
  return GROUP_ICONS[id] ?? null;
}
