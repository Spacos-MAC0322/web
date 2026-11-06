// src/components/Navbar.jsx
import { NavLink, Link } from 'react-router-dom';
import logoSpacos from '../assets/logo.png'; //Logo extraida do Figma, mas podemos atualizar depois
import styles from './Navbar.module.css';

export default function Navbar() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logoLink} aria-label="Página inicial SPaços">
          <img src={logoSpacos} alt="SPaços" className={styles.logoImage} />
        </Link>

        <nav className={styles.nav} aria-label="Navegação principal">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            Descobrir
          </NavLink>
          <NavLink
            to="/explorar"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            Explorar
          </NavLink>
          <NavLink
            to="/rotas"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            Rotas
          </NavLink>
          <NavLink
            to="/salvos"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            Salvos
          </NavLink>
        </nav>

        <div className={styles.actions}>
          <Link to="/login" className={styles.profileButton} aria-label="Acessar conta">
            <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="50" height="50" rx="19" fill="#E2B23A"/>
            <path d="M25 13C23.6739 13 22.4021 13.5057 21.4645 14.4059C20.5268 15.3061 20 16.527 20 17.8C20 19.073 20.5268 20.2939 21.4645 21.1941C22.4021 22.0943 23.6739 22.6 25 22.6C26.3261 22.6 27.5979 22.0943 28.5355 21.1941C29.4732 20.2939 30 19.073 30 17.8C30 16.527 29.4732 15.3061 28.5355 14.4059C27.5979 13.5057 26.3261 13 25 13ZM31.25 25H18.75C17.7554 25 16.8016 25.3793 16.0983 26.0544C15.3951 26.7295 15 27.6452 15 28.6C15 31.2784 16.1475 33.424 18.03 34.876C19.8825 36.304 22.3675 37 25 37C27.6325 37 30.1175 36.304 31.97 34.876C33.85 33.424 35 31.2784 35 28.6C35 27.6452 34.6049 26.7295 33.9017 26.0544C33.1984 25.3793 32.2446 25 31.25 25Z" fill="#272824"/>
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
