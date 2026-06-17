"use client";

import { useState, useRef, useCallback, useId, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import TaskDetailModal, { type TaskDetail } from "@/components/Taskdetailmodal";
import {
  LayoutDashboard, CheckSquare, Users, LogOut,
  BarChart3, UserPlus, Bell, Plus, TrendingUp,
  ChevronDown, Search,
} from "lucide-react";

// ── Palette (matches DashboardPage) ──────────────────────────────────────────
const P = {
  purple:      "#534AB7",
  purpleHover: "#4339A0",
  purpleLight: "#AFA9EC",
  purpleDim:   "#EEEDFE",
  purpleText:  "#3C3489",
  teal:        "#1D9E75",
  tealDim:     "#E1F5EE",
  tealText:    "#085041",
  amber:       "#EF9F27",
  amberDim:    "#FAEEDA",
  amberText:   "#633806",
  red:         "#E24B4A",
  redDim:      "#FCEBEB",
  redText:     "#791F1F",
  green:       "#639922",
  greenDim:    "#EAF3DE",
  greenText:   "#27500A",
  blue:        "#3B82F6",
  blueDim:     "#EFF6FF",
  blueText:    "#1E40AF",
  sidebar:     "#1E1B4B",
  sidebarHov:  "#2D2A6A",
  sidebarAct:  "#312E81",
  sidebarText: "#C7D2FE",
  sidebarMute: "#818CF8",
  bg:          "#F3F4F8",
  card:        "#FFFFFF",
  border:      "#E5E7EB",
  borderDark:  "#D1D5DB",
  text:        "#111827",
  textSub:     "#6B7280",
  textMute:    "#9CA3AF",
};

// ── Types ─────────────────────────────────────────────────────────────────────
export type Priority = "high" | "medium" | "low";
export type ColumnId = "backlog" | "todo" | "inprogress" | "review" | "done";

export interface Task {
  id: string;
  _id?: string;
  title: string;
  clientId?: string | null;
  description?: string;
  priority: Priority;
  assignee?: string;
  tags?: string[];
  due?: string;
  progress?: number;
  status?: ColumnId;
  [key: string]: unknown;
}

interface KanbanBoardProps {
  tasks?: Task[];
  onTaskMove?: (taskId: string, fromCol: ColumnId, toCol: ColumnId) => void;
  onTaskCreate?: (task: Omit<Task, "id">) => void;
}

interface ClientOption { id: string; name: string; email: string; company: string }

// ── Column config ─────────────────────────────────────────────────────────────
const COLUMNS: {
  id: ColumnId; label: string;
  color: string; textColor: string; dim: string; dot: string; accent: string
}[] = [
  { id: "backlog",    label: "Backlog",     color: P.textMute,   textColor: "#6B7280", dim: "#F9FAFB",    dot: "#9CA3AF",   accent: "#9CA3AF" },
  { id: "todo",       label: "To Do",       color: P.purple,     textColor: P.purpleText, dim: P.purpleDim, dot: P.purple,    accent: P.purple },
  { id: "inprogress", label: "In Progress", color: P.blue,       textColor: P.blueText,   dim: P.blueDim,   dot: P.blue,      accent: P.blue },
  { id: "review",     label: "Review",      color: P.amber,      textColor: P.amberText,  dim: P.amberDim,  dot: P.amber,     accent: P.amber },
  { id: "done",       label: "Done",        color: P.teal,       textColor: P.tealText,   dim: P.tealDim,   dot: P.teal,      accent: P.teal },
];

const PRIORITY_CFG: Record<Priority, { label: string; color: string; dim: string; dot: string }> = {
  high:   { label: "High",   color: P.redText,    dim: P.redDim,   dot: P.red },
  medium: { label: "Medium", color: P.amberText,  dim: P.amberDim, dot: P.amber },
  low:    { label: "Low",    color: P.textSub,    dim: "#F3F4F6",  dot: "#9CA3AF" },
};

const TAG_COLORS = [
  { color: P.purpleText, dim: P.purpleDim },
  { color: P.tealText,   dim: P.tealDim },
  { color: P.amberText,  dim: P.amberDim },
  { color: P.blueText,   dim: P.blueDim },
];

const AV_COLORS = [
  { bg: P.purpleDim, color: P.purpleText },
  { bg: P.tealDim,   color: P.tealText },
  { bg: P.amberDim,  color: P.amberText },
  { bg: P.redDim,    color: P.redText },
  { bg: P.greenDim,  color: P.greenText },
];

const NAV = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/tasks",     icon: CheckSquare,      label: "Tasks" },
  { href: "/admin/clients",   icon: Users,            label: "Clients" },
  { href: "/admin/team",      icon: UserPlus,         label: "Team" },
  { href: "/admin/reports",   icon: BarChart3,        label: "Reports" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function toInitials(name?: string) {
  if (!name) return "?";
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0,2).toUpperCase() : (p[0][0]+p[p.length-1][0]).toUpperCase();
}

function resolveColumn(task: Task): ColumnId {
  const valid = new Set<ColumnId>(["backlog","todo","inprogress","review","done"]);
  return task.status && valid.has(task.status) ? task.status : "backlog";
}

function groupByColumn(tasks: Task[]): Record<ColumnId, Task[]> {
  const map: Record<ColumnId, Task[]> = { backlog:[], todo:[], inprogress:[], review:[], done:[] };
  for (const t of tasks) map[resolveColumn(t)].push(t);
  return map;
}

function generateId() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
}

function getDueState(due?: string): "overdue" | "today" | "soon" | "ok" | "none" {
  if (!due) return "none";
  const d = new Date(due);
  if (isNaN(d.getTime())) return "none";
  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (diff < 0)   return "overdue";
  if (diff === 0) return "today";
  if (diff <= 3)  return "soon";
  return "ok";
}

function formatDue(due?: string): string {
  if (!due) return "";
  const d = new Date(due);
  if (isNaN(d.getTime())) return due;
  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (diff < 0)   return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff <= 7)  return `Due in ${diff}d`;
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

const DUE_COLORS = {
  overdue: { color: P.redText,   bg: P.redDim },
  today:   { color: P.amberText, bg: P.amberDim },
  soon:    { color: P.amberText, bg: "#FFFBEB" },
  ok:      { color: P.textMute,  bg: "#F9FAFB" },
  none:    { color: P.textMute,  bg: "transparent" },
};

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size=28 }: { name?: string; size?: number }) {
  const c = AV_COLORS[(name?.charCodeAt(0) ?? 65) % AV_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: c.bg, color: c.color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.floor(size * 0.36), fontWeight: 600, flexShrink: 0,
      border: `1.5px solid ${c.color}22`,
    }}>
      {toInitials(name)}
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────
interface TaskCardProps {
  task: Task; dragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onCardClick?: (task: Task) => void;
}

function TaskCard({ task, dragging, onDragStart, onDragEnd, onCardClick }: TaskCardProps) {
  const p        = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.medium;
  const tags     = task.tags ?? [];
  const dueState = getDueState(task.due);
  const dueColor = DUE_COLORS[dueState];
  const dueLabel = formatDue(task.due);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => { if (!dragging) onCardClick?.(task); }}
      style={{
        background:   dragging ? "#F9FAFB" : P.card,
        border:       `1px solid ${dragging ? P.purple + "55" : P.border}`,
        borderRadius: 12,
        padding:      "14px 16px",
        cursor:       "grab",
        opacity:      dragging ? 0.5 : 1,
        transition:   "all 0.12s",
        boxShadow:    dragging ? `0 0 0 2px ${P.purple}33` : "0 1px 3px rgba(0,0,0,0.06)",
        userSelect:   "none",
      }}
      onMouseEnter={e => {
        if (!dragging) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
          (e.currentTarget as HTMLDivElement).style.borderColor = P.borderDark;
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
        (e.currentTarget as HTMLDivElement).style.borderColor = P.border;
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Priority + Due */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 6 }}>
        <span style={{
          fontSize: 10, padding: "2px 8px", borderRadius: 20,
          background: p.dim, color: p.color, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: p.dot, display: "inline-block" }} />
          {p.label}
        </span>
        {dueLabel && dueState !== "ok" && (
          <span style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 20,
            background: dueColor.bg, color: dueColor.color, fontWeight: 500,
          }}>
            {dueLabel}
          </span>
        )}
        {dueLabel && dueState === "ok" && (
          <span style={{ fontSize: 10, color: P.textMute }}>{dueLabel}</span>
        )}
      </div>

      {/* Title */}
      <p style={{ fontSize: 13, fontWeight: 600, color: P.text, margin: "0 0 6px", lineHeight: 1.4 }}>
        {task.title}
      </p>

      {/* Description */}
      {task.description && (
        <p style={{
          fontSize: 11, color: P.textSub, margin: "0 0 10px",
          lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {task.description}
        </p>
      )}

      {/* Progress */}
      {task.progress !== undefined && task.progress > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: P.textMute }}>Progress</span>
            <span style={{ fontSize: 10, color: task.progress === 100 ? P.teal : P.amber, fontWeight: 600 }}>
              {task.progress}%
            </span>
          </div>
          <div style={{ height: 4, background: "#F3F4F6", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              width: `${Math.min(100, task.progress)}%`, height: "100%",
              background: task.progress === 100
                ? P.teal
                : `linear-gradient(90deg, ${P.purple}, ${P.blue})`,
              borderRadius: 2, transition: "width 0.3s",
            }} />
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
          {tags.map((tag, i) => {
            const c = TAG_COLORS[i % TAG_COLORS.length];
            return (
              <span key={tag} style={{
                fontSize: 10, padding: "2px 7px", borderRadius: 6,
                background: c.dim, color: c.color, fontWeight: 500,
              }}>
                {tag}
              </span>
            );
          })}
        </div>
      )}

      {/* Assignee */}
      {task.assignee && (
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          paddingTop: 10, borderTop: `1px solid ${P.border}`,
          marginTop: 4,
        }}>
          <Avatar name={task.assignee} size={22} />
          <span style={{ fontSize: 11, color: P.textSub, fontWeight: 500 }}>{task.assignee}</span>
        </div>
      )}
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────
interface ColumnProps {
  col: typeof COLUMNS[number]; tasks: Task[];
  draggingId: string | null; isOver: boolean;
  onDragStart: (taskId: string) => void; onDragEnd: () => void;
  onDragEnter: (colId: ColumnId) => void; onDrop: (colId: ColumnId) => void;
  onAddClick: (colId: ColumnId) => void; onCardClick: (task: Task) => void;
}

function KanbanColumn({
  col, tasks, draggingId, isOver,
  onDragStart, onDragEnd, onDragEnter, onDrop, onAddClick, onCardClick,
}: ColumnProps) {
  return (
    <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 12, padding: "0 2px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: col.dot }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: P.text, letterSpacing: "-0.2px" }}>
            {col.label}
          </span>
          <span style={{
            fontSize: 11, padding: "1px 8px", borderRadius: 20,
            background: col.dim, color: col.textColor, fontWeight: 600,
          }}>
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddClick(col.id)}
          style={{
            width: 26, height: 26, borderRadius: 7,
            background: P.card, border: `1px solid ${P.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: P.textMute, transition: "all 0.12s",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = col.dim;
            (e.currentTarget as HTMLButtonElement).style.borderColor = col.dot;
            (e.currentTarget as HTMLButtonElement).style.color = col.color;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = P.card;
            (e.currentTarget as HTMLButtonElement).style.borderColor = P.border;
            (e.currentTarget as HTMLButtonElement).style.color = P.textMute;
          }}
        >
          <Plus size={13} strokeWidth={2} color="currentColor" />
        </button>
      </div>

      {/* Top accent line */}
      <div style={{ height: 3, borderRadius: "2px 2px 0 0", background: col.accent, marginBottom: 12, opacity: 0.6 }} />

      {/* Drop zone */}
      <div
        onDragEnter={e => { e.preventDefault(); onDragEnter(col.id); }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); onDrop(col.id); }}
        style={{
          flex: 1, minHeight: 120,
          borderRadius: 12,
          border: isOver ? `2px dashed ${col.dot}` : "2px dashed transparent",
          background: isOver ? col.dim : "transparent",
          transition: "all 0.15s",
          padding: isOver ? 8 : 0,
          display: "flex", flexDirection: "column", gap: 10,
        }}
      >
        {tasks.map(task => {
          const taskId = (task._id ?? task.id) as string;
          return (
            <TaskCard
              key={taskId} task={task}
              dragging={draggingId === taskId}
              onDragStart={e => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", taskId);
                onDragStart(taskId);
              }}
              onDragEnd={onDragEnd}
              onCardClick={onCardClick}
            />
          );
        })}

        {tasks.length === 0 && (
          <div
            onClick={() => onAddClick(col.id)}
            style={{
              height: 80, borderRadius: 10,
              border: `1.5px dashed ${isOver ? col.dot : P.border}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.15s", gap: 6,
              background: isOver ? col.dim : "transparent",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = col.dot;
              (e.currentTarget as HTMLDivElement).style.background = col.dim;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = P.border;
              (e.currentTarget as HTMLDivElement).style.background = "transparent";
            }}
          >
            <Plus size={16} color={P.textMute} strokeWidth={1.5} />
            <span style={{ fontSize: 12, color: P.textMute }}>Add task</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add Task Modal ────────────────────────────────────────────────────────────
function AddTaskModal({ defaultCol, onAdd, onClose }: {
  defaultCol: ColumnId; onAdd: (task: Task) => void; onClose: () => void
}) {
  const [title,    setTitle]    = useState("");
  const [desc,     setDesc]     = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignee, setAssignee] = useState("");
  const [tags,     setTags]     = useState("");
  const [due,      setDue]      = useState("");
  const [col,      setCol]      = useState<ColumnId>(defaultCol);
  const [clientId, setClientId] = useState("");
  const [clients,  setClients]  = useState<ClientOption[]>([]);
  const [loadingCl,setLoadingCl]= useState(true);
  const uid = useId();

  useEffect(() => {
    fetch("/api/clients")
      .then(r => r.json()).then((d: ClientOption[]) => setClients(d))
      .catch(() => setClients([]))
      .finally(() => setLoadingCl(false));
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const sc = clients.find(c => c.id === clientId);
    onAdd({
      id: generateId(), title: title.trim(),
      description: desc.trim() || undefined, priority,
      assignee: assignee.trim() || sc?.name || undefined,
      clientId: clientId || undefined,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      due: due || undefined, status: col,
    });
    onClose();
  }

  const field: React.CSSProperties = {
    width: "100%", background: P.bg,
    border: `1px solid ${P.border}`, borderRadius: 8,
    padding: "9px 12px", color: P.text, fontSize: 13,
    outline: "none", boxSizing: "border-box", transition: "border-color 0.15s",
    fontFamily: "inherit",
  };
  const label: React.CSSProperties = {
    fontSize: 11, color: P.textSub, fontWeight: 600,
    letterSpacing: "0.4px", display: "block", marginBottom: 5,
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = P.purple);
  const onBlur  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = P.border);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: P.card, border: `1px solid ${P.border}`,
          borderRadius: 16, padding: "24px",
          width: 460, maxWidth: "calc(100vw - 32px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: P.text, margin: 0 }}>New Task</h2>
            <p style={{ fontSize: 12, color: P.textSub, margin: "3px 0 0" }}>Fill in the task details below</p>
          </div>
          <button onClick={onClose} style={{
            background: P.bg, border: `1px solid ${P.border}`,
            borderRadius: 8, width: 32, height: 32, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: P.textSub,
          }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label htmlFor={`${uid}-t`} style={label}>TITLE *</label>
            <input id={`${uid}-t`} value={title} onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?" required style={field} onFocus={onFocus} onBlur={onBlur} />
          </div>
          <div>
            <label htmlFor={`${uid}-d`} style={label}>DESCRIPTION</label>
            <textarea id={`${uid}-d`} value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Add more context..." rows={2}
              style={{ ...field, resize: "vertical" }} onFocus={onFocus} onBlur={onBlur} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label htmlFor={`${uid}-p`} style={label}>PRIORITY</label>
              <select id={`${uid}-p`} value={priority} onChange={e => setPriority(e.target.value as Priority)}
                style={{ ...field, cursor: "pointer" }} onFocus={onFocus} onBlur={onBlur}>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
            <div>
              <label htmlFor={`${uid}-c`} style={label}>COLUMN</label>
              <select id={`${uid}-c`} value={col} onChange={e => setCol(e.target.value as ColumnId)}
                style={{ ...field, cursor: "pointer" }} onFocus={onFocus} onBlur={onBlur}>
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Client */}
          <div>
            <label htmlFor={`${uid}-cl`} style={label}>ASSIGN TO CLIENT</label>
            <select id={`${uid}-cl`} value={clientId}
              onChange={e => {
                setClientId(e.target.value);
                const c = clients.find(x => x.id === e.target.value);
                if (c) setAssignee(c.name);
              }}
              disabled={loadingCl} style={{ ...field, cursor: "pointer" }} onFocus={onFocus} onBlur={onBlur}>
              <option value="">{loadingCl ? "Loading..." : "No client (internal task)"}</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>
              ))}
            </select>
            {clientId && (
              <p style={{ fontSize: 11, color: P.teal, marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                ✓ This task will appear in the client portal
              </p>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label htmlFor={`${uid}-a`} style={label}>ASSIGNEE</label>
              <input id={`${uid}-a`} value={assignee} onChange={e => setAssignee(e.target.value)}
                placeholder="Team member" style={field} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label htmlFor={`${uid}-due`} style={label}>DUE DATE</label>
              <input id={`${uid}-due`} type="date" value={due} onChange={e => setDue(e.target.value)}
                style={field} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>

          <div>
            <label htmlFor={`${uid}-tg`} style={label}>TAGS (comma separated)</label>
            <input id={`${uid}-tg`} value={tags} onChange={e => setTags(e.target.value)}
              placeholder="Design, Dev, SEO" style={field} onFocus={onFocus} onBlur={onBlur} />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4, borderTop: `1px solid ${P.border}`, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              background: P.bg, border: `1px solid ${P.border}`,
              borderRadius: 8, padding: "9px 18px", color: P.textSub,
              fontSize: 13, cursor: "pointer", fontWeight: 500,
            }}>Cancel</button>
            <button type="submit" style={{
              background: P.purple, border: "none", borderRadius: 8,
              padding: "9px 22px", color: "#fff", fontSize: 13,
              fontWeight: 600, cursor: "pointer",
              boxShadow: `0 2px 8px ${P.purple}44`,
            }}>Create Task</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── API Helpers ───────────────────────────────────────────────────────────────
async function apiPatchTask(id: string, patch: Partial<Task>): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))).error) ?? "Failed to update task");
  return res.json();
}

async function apiCreateTask(task: Omit<Task, "id">): Promise<Task> {
  const res = await fetch("/api/tasks", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))).error) ?? "Failed to create task");
  return res.json();
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onDismiss }: { message: string; type: "error" | "success"; onDismiss: () => void }) {
  return (
    <div onClick={onDismiss} style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 100,
      background: type === "error" ? P.redDim : P.tealDim,
      border: `1px solid ${type === "error" ? P.red : P.teal}44`,
      color: type === "error" ? P.redText : P.tealText,
      borderRadius: 10, padding: "11px 16px", fontSize: 13,
      cursor: "pointer", maxWidth: 320, fontWeight: 500,
      boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    }}>
      {type === "success" ? "✓ " : "⚠ "}{message}
    </div>
  );
}

// ── Main Board ────────────────────────────────────────────────────────────────
export default function KanbanBoard({ tasks: propTasks = [], onTaskMove, onTaskCreate }: KanbanBoardProps) {
  const [columns,      setColumns]      = useState(() => groupByColumn(propTasks));
  const [draggingId,   setDraggingId]   = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [overCol,      setOverCol]      = useState<ColumnId | null>(null);
  const [modalCol,     setModalCol]     = useState<ColumnId | null>(null);
  const [toast,        setToast]        = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [loggingOut,   setLoggingOut]   = useState(false);
  const [search,       setSearch]       = useState("");
  const sourceColRef = useRef<ColumnId | null>(null);
  const router   = useRouter();
  const pathname = usePathname();

  // Track last synced IDs in a ref so we never read columns state inside the effect
  const lastSyncedRef = useRef<string>("");
  useEffect(() => {
    const incoming = propTasks.map(t => (t._id ?? t.id) as string).sort().join(",");
    if (incoming !== lastSyncedRef.current) {
      lastSyncedRef.current = incoming;
      setColumns(groupByColumn(propTasks));
    }
  }, [propTasks]);

  function showToast(message: string, type: "error" | "success" = "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const handleDragStart = useCallback((taskId: string) => {
    setDraggingId(taskId);
    for (const col of COLUMNS) {
      if (columns[col.id].some(t => ((t._id ?? t.id) as string) === taskId)) {
        sourceColRef.current = col.id; break;
      }
    }
  }, [columns]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null); setOverCol(null); sourceColRef.current = null;
  }, []);

  const handleDrop = useCallback((targetColId: ColumnId) => {
    const srcId = sourceColRef.current;
    if (!draggingId || !srcId || srcId === targetColId || draggingId.startsWith("temp_")) {
      setDraggingId(null); setOverCol(null); sourceColRef.current = null; return;
    }
    let movedTask: Task | undefined;
    setColumns(prev => {
      const src = [...prev[srcId]], dst = [...prev[targetColId]];
      const idx = src.findIndex(t => ((t._id ?? t.id) as string) === draggingId);
      if (idx === -1) return prev;
      const [moved] = src.splice(idx, 1);
      movedTask = moved; moved.status = targetColId; dst.push(moved);
      return { ...prev, [srcId]: src, [targetColId]: dst };
    });
    const taskId = draggingId;
    setDraggingId(null); setOverCol(null); sourceColRef.current = null;
    apiPatchTask(taskId, { status: targetColId })
      .then(() => { onTaskMove?.(taskId, srcId, targetColId); router.refresh(); })
      .catch(err => {
        setColumns(prev => {
          if (!movedTask) return prev;
          return {
            ...prev,
            [srcId]: [...prev[srcId], { ...movedTask, status: srcId }],
            [targetColId]: prev[targetColId].filter(t => ((t._id ?? t.id) as string) !== taskId),
          };
        });
        showToast(`Couldn't save: ${(err as Error).message}`);
      });
  }, [draggingId, onTaskMove, router]);

  const handleAddTask = useCallback((task: Task) => {
    const colId = task.status ?? "backlog";
    const tempId = `temp_${Date.now()}`;
    setColumns(prev => ({ ...prev, [colId]: [...prev[colId], { ...task, id: tempId }] }));
    const { id: _, ...rest } = task;
    apiCreateTask(rest)
      .then(saved => {
        setColumns(prev => ({
          ...prev,
          [colId]: prev[colId].map(t => ((t._id ?? t.id) as string) === tempId ? saved : t),
        }));
        onTaskCreate?.(saved);
        router.refresh();
        showToast("Task created", "success");
      })
      .catch(err => {
        setColumns(prev => ({ ...prev, [colId]: prev[colId].filter(t => ((t._id ?? t.id) as string) !== tempId) }));
        showToast(`Couldn't save: ${(err as Error).message}`);
      });
  }, [onTaskCreate, router]);

  const totalTasks = Object.values(columns).reduce((s, a) => s + a.length, 0);
  const doneTasks  = columns.done.length;
  const pct        = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
  const overdue    = Object.values(columns).flat()
    .filter(t => getDueState(t.due) === "overdue" && t.status !== "done").length;

  // Filter columns by search
  const filteredColumns = search.trim()
    ? Object.fromEntries(
        COLUMNS.map(col => [col.id, columns[col.id].filter(t =>
          t.title.toLowerCase().includes(search.toLowerCase()) ||
          (t.assignee ?? "").toLowerCase().includes(search.toLowerCase())
        )])
      ) as Record<ColumnId, Task[]>
    : columns;

  return (
    <div style={{
      display: "flex", height: "100vh",
      background: P.bg, overflow: "hidden",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: P.text,
    }}>

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside style={{
        width: 220, flexShrink: 0, background: P.sidebar,
        display: "flex", flexDirection: "column", padding: "20px 12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px", marginBottom: 28 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: P.purple,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 0 3px ${P.purple}55`, fontSize: 17,
          }}>⚡</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-0.2px" }}>Agency OS</div>
            <div style={{ fontSize: 10, color: P.sidebarMute }}>Admin Portal</div>
          </div>
        </div>

        <p style={{ fontSize: 10, fontWeight: 600, color: P.sidebarMute, letterSpacing: "1px", padding: "0 10px", marginBottom: 6 }}>MAIN</p>
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href === "/admin/tasks" && pathname?.includes("tasks"));
          return (
            <button key={href} onClick={() => router.push(href)} style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "9px 12px", borderRadius: 8, marginBottom: 2,
              background: active ? P.sidebarAct : "transparent",
              border: active ? `1px solid ${P.purple}66` : "1px solid transparent",
              color: active ? "#fff" : P.sidebarText,
              fontSize: 13, fontWeight: active ? 600 : 400,
              cursor: "pointer", textAlign: "left", transition: "all 0.12s",
            }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = P.sidebarHov; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <Icon size={15} strokeWidth={1.8} color={active ? "#fff" : P.sidebarMute} />
              <span style={{ flex: 1 }}>{label}</span>
              {label === "Tasks" && overdue > 0 && (
                <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 20, background: P.red, color: "#fff", fontWeight: 600 }}>
                  {overdue}
                </span>
              )}
            </button>
          );
        })}

        <p style={{ fontSize: 10, fontWeight: 600, color: P.sidebarMute, letterSpacing: "1px", padding: "0 10px", margin: "16px 0 6px" }}>SYSTEM</p>
        <button style={{
          display: "flex", alignItems: "center", gap: 10,
          width: "100%", padding: "9px 12px", borderRadius: 8, marginBottom: 2,
          background: "transparent", border: "1px solid transparent",
          color: P.sidebarText, fontSize: 13, cursor: "pointer", textAlign: "left",
        }}>
          <Bell size={15} strokeWidth={1.8} color={P.sidebarMute} /> Notifications
        </button>

        <div style={{ flex: 1 }} />
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 14 }}>
          <button
            onClick={handleLogout} disabled={loggingOut}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              width: "100%", padding: "8px 10px", borderRadius: 8,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: P.sidebarText, fontSize: 12, cursor: "pointer", transition: "all 0.12s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = P.redDim; (e.currentTarget as HTMLButtonElement).style.color = P.red; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLButtonElement).style.color = P.sidebarText; }}
          >
            <LogOut size={13} strokeWidth={1.8} />
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Topbar */}
        <header style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "0 28px", height: 56, flexShrink: 0,
          background: P.card, borderBottom: `1px solid ${P.border}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: "-0.3px" }}>Tasks</h1>
            <p style={{ fontSize: 12, color: P.textSub, margin: 0 }}>
              {doneTasks}/{totalTasks} completed · {pct}% done
            </p>
          </div>

          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: P.bg, border: `1px solid ${P.border}`,
            borderRadius: 10, padding: "7px 12px", width: 200,
          }}>
            <Search size={13} color={P.textMute} strokeWidth={1.8} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              style={{ border: "none", background: "transparent", fontSize: 13, color: P.text, outline: "none", width: "100%" }}
            />
          </div>

          {/* Progress pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: P.bg, border: `1px solid ${P.border}`,
            borderRadius: 10, padding: "7px 14px",
          }}>
            <TrendingUp size={13} color={P.teal} strokeWidth={2} />
            <div style={{ width: 80, height: 4, background: "#E5E7EB", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                width: `${pct}%`, height: "100%",
                background: `linear-gradient(90deg, ${P.purple}, ${P.teal})`,
                borderRadius: 2, transition: "width 0.3s",
              }} />
            </div>
            <span style={{ fontSize: 12, color: P.textSub, fontWeight: 500, minWidth: 28 }}>{pct}%</span>
          </div>

          {/* New Task */}
          <button
            onClick={() => setModalCol("backlog")}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              background: P.purple, border: "none", borderRadius: 10,
              padding: "8px 16px", color: "#fff", fontSize: 13,
              fontWeight: 600, cursor: "pointer",
              boxShadow: `0 2px 8px ${P.purple}44`,
            }}
          >
            <Plus size={15} strokeWidth={2.5} /> New Task
          </button>

          {/* Live badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: P.tealDim, border: `1px solid ${P.teal}33`,
            borderRadius: 8, padding: "6px 12px",
            fontSize: 12, color: P.tealText, fontWeight: 500,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%", background: P.teal,
              boxShadow: `0 0 0 2px ${P.tealDim}`,
            }} />
            Live
          </div>
        </header>

        {/* Board */}
        <div
          style={{
            flex: 1, overflowX: "auto", overflowY: "hidden",
            padding: "24px 28px", display: "flex", gap: 20, alignItems: "flex-start",
          }}
          onDragLeave={e => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null);
          }}
        >
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id} col={col}
              tasks={filteredColumns[col.id]}
              draggingId={draggingId}
              isOver={overCol === col.id}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragEnter={colId => setOverCol(colId)}
              onDrop={handleDrop}
              onAddClick={setModalCol}
              onCardClick={task => setSelectedTask(task as TaskDetail)}
            />
          ))}
        </div>
      </div>

      {/* Modals */}
      {modalCol && (
        <AddTaskModal defaultCol={modalCol} onAdd={handleAddTask} onClose={() => setModalCol(null)} />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onStatusChange={(taskId, newStatus) => {
            setColumns(prev => {
              const updated = { ...prev };
              for (const col of COLUMNS) {
                const idx = updated[col.id].findIndex(t => ((t._id ?? t.id) as string) === taskId);
                if (idx !== -1) {
                  const task = { ...updated[col.id][idx], status: newStatus as ColumnId };
                  updated[col.id] = updated[col.id].filter((_, i) => i !== idx);
                  updated[newStatus as ColumnId] = [...updated[newStatus as ColumnId], task];
                  break;
                }
              }
              return updated;
            });
          }}
          onProgressChange={(taskId, progress) => {
            setColumns(prev => {
              const updated = { ...prev };
              for (const col of COLUMNS) {
                const idx = updated[col.id].findIndex(t => ((t._id ?? t.id) as string) === taskId);
                if (idx !== -1) {
                  updated[col.id] = updated[col.id].map((t, i) => i === idx ? { ...t, progress } : t);
                  break;
                }
              }
              return updated;
            });
          }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}