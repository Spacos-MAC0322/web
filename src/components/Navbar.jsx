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
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="12" cy="7.5" r="3.5" fill="var(--color-green)" />
              <rect x="6" y="13.5" width="12" height="6" rx="3" fill="var(--color-green)" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}