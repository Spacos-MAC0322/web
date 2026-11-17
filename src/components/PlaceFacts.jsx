// src/components/PlaceFacts.jsx
// Informações práticas da página do lugar (issue #32): endereço, horário de funcionamento,
// valor da entrada e contato. O que a fonte não informa aparece como "não informado".
import { describeAdmission, openingHoursLines, phoneHref, safeWebsite } from '../pages/placeFormat';
import styles from './PlaceFacts.module.css';

function Fact({ title, children }) {
  return (
    <div className={styles.fact}>
      <dt className={styles.term}>{title}</dt>
      <dd className={styles.value}>{children}</dd>
    </div>
  );
}

function Address({ address }) {
  if (!address.full) return <span className={styles.missing}>Endereço não informado</span>;
  const extra = [address.neighborhood, address.postal_code && `CEP ${address.postal_code}`]
    .filter(Boolean)
    .join(' · ');
  return (
    <>
      {address.full}
      {extra && <span className={styles.note}>{extra}</span>}
    </>
  );
}

function OpeningHours({ openingHours, curationNotes }) {
  const lines = openingHoursLines(openingHours);
  if (lines.length === 0) return <span className={styles.missing}>Horário não informado</span>;
  return (
    <>
      <ul className={styles.hours}>
        {lines.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
      {curationNotes && <span className={styles.note}>{curationNotes}</span>}
      {openingHours.verified !== true && (
        <span className={styles.note}>
          Horário informado pela fonte e não confirmado. Confira antes de ir.
        </span>
      )}
    </>
  );
}

function Admission({ admission }) {
  const { isFree, text } = describeAdmission(admission);
  if (!isFree && !text) return <span className={styles.missing}>Valor não informado</span>;
  return (
    <>
      {isFree && <strong className={styles.free}>Grátis</strong>}
      {text && <span className={isFree ? styles.note : undefined}>{text}</span>}
    </>
  );
}

function Contacts({ contacts }) {
  const website = safeWebsite(contacts.website);
  const tel = phoneHref(contacts.phone);
  return (
    <>
      {website && (
        <a href={website} target="_blank" rel="noopener noreferrer" className={styles.link}>
          Site oficial<span className="visually-hidden"> (abre em nova aba)</span>
        </a>
      )}
      {tel && (
        <a href={tel} className={styles.link}>
          {contacts.phone}
        </a>
      )}
    </>
  );
}

// place: JSON de GET /api/places/{id} (PlaceDetailSchema).
export default function PlaceFacts({ place }) {
  const contacts = place.contacts ?? {};
  const hasContacts = safeWebsite(contacts.website) || phoneHref(contacts.phone);
  return (
    <dl className={styles.facts}>
      <Fact title="Endereço">
        <Address address={place.address ?? {}} />
      </Fact>
      <Fact title="Horário de funcionamento">
        <OpeningHours
          openingHours={place.opening_hours ?? {}}
          curationNotes={place.curation?.opening_hours_notes}
        />
      </Fact>
      <Fact title="Entrada">
        <Admission admission={place.admission ?? {}} />
      </Fact>
      {hasContacts && (
        <Fact title="Contato">
          <Contacts contacts={contacts} />
        </Fact>
      )}
    </dl>
  );
}
