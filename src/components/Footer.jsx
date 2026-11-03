// src/components/Footer.jsx
import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.leftColumn}>
          <Link to="/sobre" className={styles.primaryLink}>
            Sobre nós
          </Link>
          <Link to="/login" className={styles.primaryLink}>
            Sign in
          </Link>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.socialRow}>
            <span className={styles.socialLabel}>Redes:</span>
            <div className={styles.socialIcons}>
              {/* Instagram */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className={styles.socialBtn}
                aria-label="Instagram"
              >
                <svg viewBox="0 0 24 24" className={styles.iconSvg} aria-hidden="true">
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="5"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  />
                  <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
                </svg>
              </a>

              {/* Xuitter */}
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                className={styles.socialBtn}
                aria-label="X"
              >
                <svg viewBox="0 0 24 24" className={styles.iconSvg} aria-hidden="true">
                  <path
                    d="M4 4L10.5 12.8L4 20H6.2L11.6 14.1L16 20H20L13.1 10.7L19.2 4H17L12.1 9.4L8 4H4Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </a>

              {/* Pinterest */}
              <a
                href="https://pinterest.com"
                target="_blank"
                rel="noreferrer"
                className={styles.socialBtn}
                aria-label="Pinterest"
              >
                <svg viewBox="0 0 24 24" className={styles.iconSvg} aria-hidden="true">
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  />
                  <path
                    d="M10.5 16.5L11.7 11.8C11.4 11.3 11.2 10.6 11.2 10C11.2 8.5 12.3 7.5 13.7 7.5C15.1 7.5 16 8.5 16 10.1C16 12 14.8 13.6 13.1 13.6C12.4 13.6 11.8 13.1 11.6 12.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </a>

              {/* Facebook */}
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className={styles.socialBtn}
                aria-label="Facebook"
              >
                <svg viewBox="0 0 24 24" className={styles.iconSvg} aria-hidden="true">
                  <path
                    d="M14.5 7.5H13C12.2 7.5 12 7.9 12 8.7V10.5H14.4L14.1 13H12V19H9.5V13H7.5V10.5H9.5V8.5C9.5 6.3 10.8 5 12.9 5C13.7 5 14.5 5.1 14.5 5.1V7.5Z"
                    fill="currentColor"
                  />
                </svg>
              </a>
            </div>
          </div>

          <div className={styles.legalRow}>
            <Link to="/termos" className={styles.legalLink}>
              Termos e Serviços
            </Link>
            <span className={styles.separator}>-</span>
            <Link to="/privacidade" className={styles.legalLink}>
              Política de Privacidade
            </Link>
            <span className={styles.separator}>-</span>
            <Link to="/acessibilidade" className={styles.legalLink}>
              Política de Acessibilidade
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}