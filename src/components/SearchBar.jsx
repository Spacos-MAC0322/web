// src/components/SearchBar.jsx
// Barra de busca do protótipo (Figma, "Search_Bar": 62 px de altura, cantos de 18 px,
// borda sálvia e lupa), usada na Descobrir, no texto do painel da Explorar e no endereço
// da seção "Perto de você". Com `submitLabel`, mostra o botão de enviar.
import { useId } from 'react';
import searchIcon from '../assets/icons/buscar.svg';
import styles from './SearchBar.module.css';

// label: nome acessível do campo (fica visível só para leitores de tela).
// onSubmit(value): Enter ou o botão; as demais props vão para o <input>.
export default function SearchBar({
  label,
  value,
  onChange,
  onSubmit,
  submitLabel,
  className = '',
  ...inputProps
}) {
  const inputId = useId();
  const submit = (event) => {
    event.preventDefault();
    onSubmit?.(value);
  };
  return (
    <form role="search" className={`${styles.form} ${className}`} onSubmit={submit}>
      <label htmlFor={inputId} className="visually-hidden">
        {label}
      </label>
      <div className={styles.searchBar}>
        <img src={searchIcon} alt="" width="20" height="20" className={styles.searchIcon} />
        <input
          id={inputId}
          type="search"
          className={styles.input}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          {...inputProps}
        />
        {submitLabel && (
          <button type="submit" className={styles.submit}>
            {submitLabel}
          </button>
        )}
      </div>
    </form>
  );
}
