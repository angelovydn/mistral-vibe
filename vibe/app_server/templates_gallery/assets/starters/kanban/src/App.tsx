import { Check, ChevronDown, Columns3, Layers3, Plus } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

const columns = ["To do", "In progress", "Done"] as const;
type Column = (typeof columns)[number];
type Task = {
  id: number;
  title: string;
  tag: string;
  owner: string;
  column: Column;
  art?: string;
};
const firstTasks: Task[] = [
  {
    id: 1,
    title: "Explore the visual direction",
    tag: "Design",
    owner: "Mira",
    column: "To do",
    art: "arches",
  },
  {
    id: 2,
    title: "Map the onboarding flow",
    tag: "Product",
    owner: "Alex",
    column: "To do",
  },
  {
    id: 3,
    title: "Build the component library",
    tag: "Build",
    owner: "Sol",
    column: "In progress",
    art: "tiles",
  },
  {
    id: 4,
    title: "Write the launch checklist",
    tag: "Product",
    owner: "Mira",
    column: "In progress",
  },
  {
    id: 5,
    title: "Define the type scale",
    tag: "Design",
    owner: "Alex",
    column: "Done",
  },
  {
    id: 6,
    title: "Review customer interviews",
    tag: "Research",
    owner: "Sol",
    column: "Done",
  },
];
const people = ["Alex", "Mira", "Sol"];
const initials: Record<string, string> = { Alex: "AE", Mira: "MP", Sol: "SP" };

export default function App() {
  const [tasks, setTasks] = useState(firstTasks);
  const [owner, setOwner] = useState("Everyone");
  const [target, setTarget] = useState<Column>("To do");
  const [dragging, setDragging] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  function moveTask(id: number, column: Column) {
    setTasks((items) =>
      items.map((task) => (task.id === id ? { ...task, column } : task)),
    );
  }

  function startTask(column: Column) {
    setTarget(column);
    dialog.current?.showModal();
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title")).trim();
    if (!title) return;
    setTasks((items) => [
      ...items,
      {
        id: Math.max(0, ...items.map((t) => t.id)) + 1,
        title,
        owner: String(form.get("owner")),
        tag: String(form.get("tag")),
        column: target,
      },
    ]);
    setOwner("Everyone");
    event.currentTarget.reset();
    dialog.current?.close();
  }

  return (
    <div className="board-app">
      <header className="mast">
        <div className="wordmark">
          <span>
            <Layers3 size={22} />
          </span>
          Studio Board
        </div>
        <div className="members" aria-label="Members Alex, Mira and Sol">
          {people.map((name) => (
            <i key={name} className={"person " + name}>
              {initials[name]}
            </i>
          ))}
        </div>
      </header>
      <main>
        <div className="project">
          Studio workspace <span>/</span> Spring release
        </div>
        <div className="heading">
          <div>
            <h1>Product board</h1>
            <p>
              <Columns3 size={14} /> Team kanban
            </p>
          </div>
          <button className="primary" onClick={() => startTask("To do")}>
            <Plus size={16} />
            New task
          </button>
        </div>
        <div className="toolbar">
          <h2>Board</h2>
          <label>
            Assignee{" "}
            <select
              aria-label="Filter by assignee"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            >
              {["Everyone", ...people].map((person) => (
                <option key={person}>{person}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="lanes">
          {columns.map((column, index) => {
            const visible = tasks.filter(
              (task) =>
                task.column === column &&
                (owner === "Everyone" || task.owner === owner),
            );
            return (
              <section
                className={"lane lane-" + index}
                key={column}
                aria-label={column}
                onDragOver={(event) => {
                  if (dragging !== null) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragging !== null) moveTask(dragging, column);
                  setDragging(null);
                }}
              >
                <div className="lane-head">
                  <i className="dot" />
                  <h3>{column}</h3>
                  <span>{visible.length}</span>
                  <button
                    aria-label={"Add task to " + column}
                    onClick={() => startTask(column)}
                  >
                    <Plus size={15} />
                  </button>
                </div>
                {visible.map((task) => (
                  <article
                    className="task"
                    key={task.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", String(task.id));
                      setDragging(task.id);
                    }}
                    onDragEnd={() => setDragging(null)}
                  >
                    {task.art && (
                      <div aria-hidden="true" className={"art " + task.art}>
                        <i />
                        <i />
                        <i />
                      </div>
                    )}
                    <span className={"tag " + task.tag.toLowerCase()}>
                      {task.tag}
                    </span>
                    <h4>{task.title}</h4>
                    <footer>
                      <span
                        className={"person " + task.owner}
                        title={task.owner}
                      >
                        {initials[task.owner]}
                      </span>
                      <label className="move">
                        {column === "Done" && <Check size={12} />}
                        <span>Move</span>
                        <ChevronDown size={11} />
                        <select
                          value={column}
                          aria-label={"Move " + task.title}
                          onChange={(e) =>
                            moveTask(task.id, e.target.value as Column)
                          }
                        >
                          {columns.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                    </footer>
                  </article>
                ))}
                {visible.length === 0 && (
                  <button className="empty" onClick={() => startTask(column)}>
                    <Plus size={14} />
                    Add a task
                  </button>
                )}
              </section>
            );
          })}
        </div>
      </main>
      <dialog ref={dialog} aria-labelledby="task-title">
        <form className="dialog-form" onSubmit={addTask}>
          <h2 id="task-title">New task</h2>
          <label>
            Task name
            <input name="title" required maxLength={100} />
          </label>
          <label>
            Assignee
            <select
              name="owner"
              defaultValue={owner === "Everyone" ? "Alex" : owner}
            >
              {people.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select name="tag">
              {["Design", "Product", "Build", "Research"].map((tag) => (
                <option key={tag}>{tag}</option>
              ))}
            </select>
          </label>
          <div className="dialog-actions">
            <button type="button" onClick={() => dialog.current?.close()}>
              Cancel
            </button>
            <button type="submit">Add task</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
