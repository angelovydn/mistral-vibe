import {
  ArrowLeft,
  ArrowUp,
  Hash,
  MessageCircle,
  Plus,
  Radio,
  Search,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

type Message = { author: string; text: string; time: string };
type Room = { name: string; description: string; messages: Message[] };

const rooms: Room[] = [
  {
    name: "Design studio",
    description: "A space for design reviews and ideas",
    messages: [
      {
        author: "Mira Patel",
        time: "10:24",
        text: "Morning team! The new type studies are ready for a first look.",
      },
      {
        author: "You",
        time: "10:28",
        text: "The warmer palette is looking great. I’ll bring the updated mockups to our review.",
      },
      {
        author: "Jon Bell",
        time: "10:32",
        text: "Love where this is going. Can we try the new headline on the home screen?",
      },
    ],
  },
  {
    name: "Product",
    description: "Product decisions and discoveries",
    messages: [
      {
        author: "Jon Bell",
        time: "09:46",
        text: "The walkthrough is ready. What should we prioritize next?",
      },
    ],
  },
  {
    name: "Engineering",
    description: "Build notes and technical questions",
    messages: [
      {
        author: "Sol Park",
        time: "09:18",
        text: "Yesterday’s build is ready to test.",
      },
    ],
  },
  {
    name: "The lounge",
    description: "The studio’s common room",
    messages: [
      {
        author: "Mira Patel",
        time: "Yesterday",
        text: "Any interesting reads for the weekend?",
      },
    ],
  },
];
const initials = (name: string) =>
  name === "You"
    ? "AE"
    : name
        .split(" ")
        .map((word) => word[0])
        .join("");

export default function App() {
  const [channels, setChannels] = useState(rooms);
  const [current, setCurrent] = useState(0);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [showList, setShowList] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const stream = useRef<HTMLDivElement>(null);
  const room = channels[current];

  useEffect(() => {
    if (stream.current) stream.current.scrollTop = stream.current.scrollHeight;
  }, [room]);

  function selectRoom(index: number) {
    setCurrent(index);
    setShowList(false);
    setDraft("");
  }

  function send(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    const message = {
      author: "You",
      text: draft.trim(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setChannels(
      channels.map((channel, index) =>
        index === current
          ? { ...channel, messages: [...channel.messages, message] }
          : channel,
      ),
    );
    setDraft("");
  }

  function addChannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(
      new FormData(event.currentTarget).get("name") ?? "",
    ).trim();
    if (!name) return;
    setChannels([
      ...channels,
      { name, description: "Team conversation", messages: [] },
    ]);
    selectRoom(channels.length);
    setQuery("");
    event.currentTarget.reset();
    dialog.current?.close();
  }

  return (
    <div className={"chat-app " + (showList ? "list-open" : "")}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">
            <Radio size={23} />
          </span>
          Relay
        </div>
        <label className="search">
          <Search size={15} />
          <input
            aria-label="Find a channel"
            placeholder="Find a channel"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="nav-group">
          <h2>Channels</h2>
          <button
            aria-label="Add channel"
            onClick={() => dialog.current?.showModal()}
          >
            <Plus size={16} />
          </button>
        </div>
        <nav aria-label="Channels">
          {channels.map(
            (channel, index) =>
              channel.name.toLowerCase().includes(query.toLowerCase()) && (
                <button
                  key={index}
                  aria-current={index === current ? "page" : undefined}
                  onClick={() => selectRoom(index)}
                >
                  <Hash size={16} />
                  {channel.name}
                </button>
              ),
          )}
        </nav>
        {channels.every(
          (ch) => !ch.name.toLowerCase().includes(query.toLowerCase()),
        ) && <p className="no-channels">No matching channels</p>}
        <div className="account">
          <span className="profile">AE</span>
          <div>
            <strong>Alex Ellis</strong>
            <small>
              <i />
              Available
            </small>
          </div>
        </div>
      </aside>
      <main className="thread">
        <header className="thread-head">
          <button
            className="back"
            aria-label="Show channels"
            onClick={() => setShowList(true)}
          >
            <ArrowLeft size={21} />
          </button>
          <span className="channel-icon">
            <Hash size={23} />
          </span>
          <div>
            <h1>{room.name}</h1>
            <p>{room.description}</p>
          </div>
        </header>
        <div
          className="stream"
          ref={stream}
          role="log"
          aria-label="Conversation"
        >
          <div className="day">
            <span />
            Today
            <span />
          </div>
          {room.messages.map((message, index) => (
            <article
              key={index}
              className={"message " + (message.author === "You" ? "mine" : "")}
            >
              <span
                className={
                  "avatar " + (message.author === "Jon Bell" ? "apricot" : "")
                }
              >
                {initials(message.author)}
              </span>
              <div className="message-body">
                <div className="byline">
                  <strong>{message.author}</strong>
                  <time>{message.time}</time>
                </div>
                <p>{message.text}</p>
              </div>
            </article>
          ))}
          {room.messages.length === 0 && (
            <p className="empty">Start the conversation in {room.name}.</p>
          )}
        </div>
        <form className="composer" onSubmit={send}>
          <MessageCircle size={19} />
          <input
            aria-label="Message"
            placeholder={
              "Message #" + room.name.toLowerCase().replaceAll(" ", "-")
            }
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={!draft.trim()}
          >
            <ArrowUp size={19} />
          </button>
        </form>
      </main>
      <dialog ref={dialog} aria-labelledby="channel-title">
        <form className="dialog-form" onSubmit={addChannel}>
          <h2 id="channel-title">New channel</h2>
          <label>
            Channel name
            <input name="name" maxLength={40} required />
          </label>
          <div className="dialog-actions">
            <button type="button" onClick={() => dialog.current?.close()}>
              Cancel
            </button>
            <button type="submit">Create channel</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
