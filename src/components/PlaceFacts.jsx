// src/components/PlaceFacts.jsx
// Card "Planeje sua visita" da página do lugar (protótipo "Explorar - Detalhes", issue #32):
// horário, entrada, acessibilidade, endereço e contato. O que a fonte não informa aparece
// como "não informado".
import { useId } from 'react';
import {
  admissionText,
  describeAccessibility,
  openingHoursLines,
  phoneHref,
  safeWebsite,
} from '../pages/placeFormat';
import styles from './PlaceFacts.module.css';

function Fact({ title, children }) {
  return (
    <div className={styles.fact}>
      <dt className={styles.term}>{title}</dt>
      <dd className={styles.value}>{children}</dd>
    </div>
  );
}

const Missing = ({ children }) => <span className={styles.missing}>{children}</span>;
const Note = ({ children }) => <span className={styles.note}>{children}</span>;

function OpeningHours({ openingHours, curationNotes }) {
  const lines = openingHoursLines(openingHours);
  if (lines.length === 0) return <Missing>Horário não informado</Missing>;
  return (
    <>
      <ul className={styles.lines}>
        {lines.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
      {curationNotes && <Note>{curationNotes}</Note>}
      {openingHours.verified !== true && (
        <Note>Horário informado pela fonte e não confirmado. Confira antes de ir.</Note>
      )}
    </>
  );
}

function Accessibility({ accessibility, curationNotes }) {
  const { text, notes } = describeAccessibility(accessibility, curationNotes);
  if (!text && notes.length === 0) return <Missing>Não informado</Missing>;
  return (
    <>
      {text}
      {notes.map((note) => (
        <Note key={note}>{note}</Note>
      ))}
    </>
  );
}

function Address({ address }) {
  if (!address.full) return <Missing>Endereço não informado</Missing>;
  const extra = [address.neighborhood, address.postal_code && `CEP ${address.postal_code}`]
    .filter(Boolean)
    .join(' · ');
  return (
    <>
      {address.full}
      {extra && <Note>{extra}</Note>}
    </>
  );
}

function Contacts({ website, phone, tel }) {
  return (
    <>
      {website && (
        <a href={website} target="_blank" rel="noopener noreferrer" className={styles.link}>
          Site oficial<span className="visually-hidden"> (abre em nova aba)</span>
        </a>
      )}
      {tel && (
        <a href={tel} className={styles.link}>
          {phone}
        </a>
      )}
    </>
  );
}

// place: JSON de GET /api/places/{id} (PlaceDetailSchema).
export default function PlaceFacts({ place }) {
  const titleId = useId();
  const contacts = place.contacts ?? {};
  const website = safeWebsite(contacts.website);
  const tel = phoneHref(contacts.phone);
  const admission = admissionText(place.admission);
  return (
    <section className={styles.card} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        Planeje sua visita
      </h2>
      <dl className={styles.facts}>
        <Fact title="Horário">
          <OpeningHours
            openingHours={place.opening_hours ?? {}}
            curationNotes={place.curation?.opening_hours_notes}
          />
        </Fact>
        <Fact title="Entrada">{admission ?? <Missing>Valor não informado</Missing>}</Fact>
        <Fact title="Acessibilidade">
          <Accessibility
            accessibility={place.accessibility ?? {}}
            curationNotes={place.curation?.accessibility_notes}
          />
        </Fact>
        <Fact title="Endereço">
          <Address address={place.address ?? {}} />
        </Fact>
        {(website || tel) && (
          <Fact title="Contato">
            <Contacts website={website} phone={contacts.phone} tel={tel} />
          </Fact>
        )}
      </dl>
    </section>
  );
}
