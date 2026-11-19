// src/components/PlaceTextSearch.jsx
// Busca por texto do painel "Filtrar lugares" (issue #63; Figma, frame Explorar): nome do
// espaço, bairro, categoria ou região. O mapa e a lista acompanham enquanto se digita,
// com uma pequena espera para não consultar a cada letra; Enter aplica na hora.
import { useCallback, useEffect, useState } from 'react';
import SearchBar from './SearchBar';

export const TEXT_DEBOUNCE_MS = 300;
export const MAX_QUERY_LENGTH = 100;

// value: texto aplicado (filters.q); onChange(text) aplica um novo texto.
export default function PlaceTextSearch({ value, onChange }) {
  const [text, setText] = useState(value);
  const [sent, setSent] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);

  // Mudança vinda de fora ("Limpar", voltar no navegador): o campo acompanha. A que este
  // campo acabou de enviar não mexe no texto, para não apagar o que já foi digitado depois.
  if (value !== previousValue) {
    setPreviousValue(value);
    if (value !== sent) {
      setText(value);
      setSent(value);
    }
  }

  const apply = useCallback(
    (next) => {
      setSent(next.trim());
      onChange(next);
    },
    [onChange],
  );

  useEffect(() => {
    if (text.trim() === value.trim()) return undefined;
    const timer = setTimeout(() => apply(text), TEXT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, value, apply]);

  return (
    <SearchBar
      label="Buscar espaços por nome, bairro ou região"
      placeholder="Busque por lugar, bairro ou região"
      autoComplete="off"
      maxLength={MAX_QUERY_LENGTH}
      value={text}
      onChange={setText}
      onSubmit={() => apply(text)}
    />
  );
}
