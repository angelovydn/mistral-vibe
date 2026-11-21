import {
  BookOpen,
  Check,
  ChevronRight,
  ContactRound,
  Plus,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

type Stage = "Client" | "Lead" | "Prospect";
type Contact = { name: string; company: string; email: string; stage: Stage };
const stages: Stage[] = ["Client", "Lead", "Prospect"];
const initial: Contact[] = [
  {
    name: "Adriana Park",
    company: "Daybreak Studio",
    email: "adriana@example.com",
    stage: "Client",
  },
  {
    name: "Miles Chen",
    company: "North & Co.",
    email: "miles@example.com",
    stage: "Lead",
  },
  {
    name: "Nora Hayes",
    company: "Forma",
    email: "nora@example.com",
    stage: "Client",
  },
  {
    name: "Eli Torres",
    company: "Common Ground",
    email: "eli@example.com",
    stage: "Prospect",
  },
  {
    name: "Sam Okafor",
    company: "Fieldwork",
    email: "sam@example.com",
    stage: "Lead",
  },
  {
    name: "Robin Sato",
    company: "Nightjar",
    email: "robin@example.com",
    stage: "Client",
  },
];
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

export default function App() {
  const [contacts, setContacts] = useState(initial);
  const [filter, setFilter] = useState("All contacts");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Contact | null>(null);
  const addDialog = useRef<HTMLDialogElement>(null);
  const details = useRef<HTMLDialogElement>(null);
  const visible = contacts.filter(
    (contact) =>
      (filter === "All contacts" || contact.stage === filter) &&
      [contact.name, contact.email, contact.company].some((text) =>
        text.toLowerCase().includes(query.trim().toLowerCase()),
      ),
  );

  function addContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name")).trim();
    if (!name) return;
    setContacts([
      {
        name,
        company: String(data.get("company")).trim(),
        email: String(data.get("email")).trim(),
        stage: data.get("stage") as Stage,
      },
      ...contacts,
    ]);
    setQuery("");
    setFilter("All contacts");
    addDialog.current?.close();
    event.currentTarget.reset();
  }

  function openContact(contact: Contact) {
    setSelected(contact);
    details.current?.showModal();
  }

  function updateStage(stage: Stage) {
    if (!selected) return;
    const edited = { ...selected, stage };
    setContacts(
      contacts.map((contact) => (contact === selected ? edited : contact)),
    );
    setSelected(edited);
  }

  return (
    <div className="folio">
      <header className="mast">
        <div className="wordmark">
          <span>
            <BookOpen size={21} strokeWidth={2.4} />
          </span>
          Folio
        </div>
        <span className="divider" />
        <span className="workspace">Studio workspace</span>
        <span className="account" aria-label="Alex Ellis">
          AE
        </span>
      </header>
      <main>
        <div className="heading">
          <div>
            <div className="crumb">
              <ContactRound size={14} /> Directory <ChevronRight size={12} />{" "}
              People
            </div>
            <h1>Contacts</h1>
          </div>
          <button
            className="primary"
            onClick={() => addDialog.current?.showModal()}
          >
            <Plus size={16} />
            Add contact
          </button>
        </div>
        <div className="stats">
          <div>
            <span className="stat-icon blue">
              <UsersRound size={17} />
            </span>
            <p>
              Total contacts
              <strong>{contacts.length.toString().padStart(2, "0")}</strong>
            </p>
          </div>
          <div>
            <span className="stat-icon green">
              <Check size={17} />
            </span>
            <p>
              Active clients
              <strong>
                {contacts
                  .filter((c) => c.stage === "Client")
                  .length.toString()
                  .padStart(2, "0")}
              </strong>
            </p>
          </div>
          <div>
            <span className="stat-icon yellow">
              <ContactRound size={17} />
            </span>
            <p>
              Open leads
              <strong>
                {contacts
                  .filter((c) => c.stage === "Lead")
                  .length.toString()
                  .padStart(2, "0")}
              </strong>
            </p>
          </div>
        </div>
        <section aria-label="Contact directory" className="directory">
          <div className="controls">
            <label className="lookup">
              <Search size={15} />
              <input
                aria-label="Search contacts"
                placeholder="Search contacts"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Filter by relationship"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {["All contacts", ...stages].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Relationship</th>
                  <th>
                    <span className="visually-hidden">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((contact) => (
                  <tr key={contacts.indexOf(contact)}>
                    <td>
                      <button
                        className="person"
                        onClick={() => openContact(contact)}
                      >
                        <span
                          className={
                            "avatar hue-" + (contacts.indexOf(contact) % 5)
                          }
                        >
                          {initials(contact.name)}
                        </span>
                        <strong>{contact.name}</strong>
                      </button>
                    </td>
                    <td>{contact.company || "—"}</td>
                    <td>
                      <span className={"stage " + contact.stage.toLowerCase()}>
                        <i />
                        {contact.stage}
                      </span>
                    </td>
                    <td>
                      <button
                        className="more"
                        aria-label={"View " + contact.name}
                        onClick={() => openContact(contact)}
                      >
                        <ChevronRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visible.length === 0 && (
            <p className="empty">No contacts match your search.</p>
          )}
        </section>
      </main>
      <dialog ref={addDialog} aria-labelledby="new-title">
        <form className="dialog-form" onSubmit={addContact}>
          <h2 id="new-title">Add contact</h2>
          <label>
            Full name
            <input name="name" autoComplete="name" required maxLength={80} />
          </label>
          <label>
            Company
            <input name="company" maxLength={100} />
          </label>
          <label>
            Email address
            <input name="email" type="email" required />
          </label>
          <label>
            Relationship
            <select name="stage" defaultValue="Lead">
              {stages.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <div className="dialog-actions">
            <button type="button" onClick={() => addDialog.current?.close()}>
              Cancel
            </button>
            <button type="submit">Add contact</button>
          </div>
        </form>
      </dialog>
      <dialog ref={details} aria-labelledby="details-name">
        {selected && (
          <div className="details">
            <button
              className="close"
              aria-label="Close contact"
              onClick={() => details.current?.close()}
            >
              <X size={18} />
            </button>
            <span className="avatar hue-0">{initials(selected.name)}</span>
            <h2 id="details-name">{selected.name}</h2>
            <p>{selected.company}</p>
            <p>{selected.email}</p>
            <label className="stage-picker">
              Sales stage
              <select
                value={selected.stage}
                onChange={(event) => updateStage(event.target.value as Stage)}
              >
                {stages.map((stage) => (
                  <option key={stage}>{stage}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </dialog>
    </div>
  );
}
