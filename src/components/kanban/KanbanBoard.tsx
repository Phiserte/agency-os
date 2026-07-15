"use client";

import { useState, useRef, useCallback, useId, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTaskPolling, type Task as PollingTask } from "@/hooks/useTaskPolling"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
  type DropAnimation,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Transform } from "@dnd-kit/utilities";
import TaskDetailModal, { type TaskDetail } from "@/components/Taskdetailmodal";
import Sidebar from "@/components/Sidebar"; // Added shared sidebar import
import { Plus, TrendingUp, Search, Eye, Trash2, Loader2 } from "lucide-react";

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

// ── Drag animation config ────────────────────────────────────────────────────
// A real drop animation instead of "dropAnimation={null}" — the overlay card
// now eases back into the column smoothly instead of vanishing instantly.
const dropAnimationConfig: DropAnimation = {
  duration: 220,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.4",
      },
    },
  }),
};

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

// Lightweight signature of a columns object used to detect whether polling
// actually changed anything. Avoids calling setColumns (and re-rendering
// every card) when the server returned exactly the same data.
function columnsSignature(cols: Record<ColumnId, Task[]>): string {
  let sig = "";
  for (const col of COLUMNS) {
    sig += col.id + ":";
    for (const t of cols[col.id]) {
      const id = (t._id ?? t.id) as string;
      sig += `${id}|${t.status}|${t.progress ?? 0}|${t.title};`;
    }
  }
  return sig;
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

function transformToString(transform: Transform | null) {
  if (!transform) return undefined;
  const { x, y, scaleX, scaleY } = transform;
  return `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) scaleX(${scaleX}) scaleY(${scaleY})`;
}

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
  onCardClick?: (task: Task) => void;
  style?: React.CSSProperties;
  attributes?: React.HTMLAttributes<HTMLDivElement>;
  listeners?: React.HTMLAttributes<HTMLDivElement>;
}

function TaskCard({ task, dragging, onCardClick, style, attributes, listeners }: TaskCardProps) {
  const p        = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.medium;
  const tags     = task.tags ?? [];
  const dueState = getDueState(task.due);
  const dueColor = DUE_COLORS[dueState];
  const dueLabel = formatDue(task.due);

  return (
    <div
      {...attributes}
      {...listeners}
      onClick={() => { if (!dragging) onCardClick?.(task); }}
      style={{
        background:   dragging ? "#F9FAFB" : P.card,
        border:       `1px solid ${dragging ? P.purple + "55" : P.border}`,
        borderRadius: 12,
        padding:      "14px 16px",
        cursor:       dragging ? "grabbing" : "grab",
        opacity:      dragging ? 0.5 : 1,
        transition:   "box-shadow 0.15s ease, border-color 0.15s ease, transform 0.15s ease",
        boxShadow:    dragging ? `0 8px 20px -4px ${P.purple}44, 0 0 0 2px ${P.purple}33` : "0 1px 3px rgba(0,0,0,0.06)",
        userSelect:   "none",
        pointerEvents: dragging ? "none" : "auto",
        touchAction:   "none",
        ...style,
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

function SortableTaskCard({ task, dragging, onCardClick }: {
  task: Task; dragging: boolean; onCardClick: (task: Task) => void;
}) {
  const taskId = (task._id ?? task.id) as string;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: taskId,
    // Smoother, slightly slower reorder animation with an eased curve
    transition: {
      duration: 220,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
    },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transformToString(transform),
        transition,
        // Prevents the dragged-from slot from abruptly "popping" other cards
        zIndex: isDragging ? 10 : "auto",
      }}
    >
      <TaskCard
        task={task}
        dragging={dragging || isDragging}
        onCardClick={onCardClick}
        attributes={attributes}
        listeners={listeners}
      />
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────
interface ColumnProps {
  col: typeof COLUMNS[number]; tasks: Task[];
  activeTaskId: string | null; isOver: boolean;
  onAddClick: (colId: ColumnId) => void; onCardClick: (task: Task) => void;
  doneCount: number;
  onClearDone: () => void;
  clearingDone: boolean;
}

function KanbanColumn({
  col, tasks, activeTaskId, isOver,
  onAddClick, onCardClick,
  doneCount, onClearDone, clearingDone,
}: ColumnProps) {
  const { setNodeRef } = useDroppable({ id: col.id });
  const taskIds = tasks.map(task => (task._id ?? task.id) as string);

  return (
    <div
      style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column" }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginBottom: 12, padding: "0 2px", height: 26
      }}>
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
        <div style={{ flex: 1 }} />
        {col.id === "done" && doneCount > 0 && (
          <button
            onClick={onClearDone}
            disabled={clearingDone}
            style={{
              width: 26, height: 26, borderRadius: 7,
              background: clearingDone ? P.redDim : P.card,
              border: `1px solid ${clearingDone ? P.red + "44" : P.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: clearingDone ? "not-allowed" : "pointer",
              color: clearingDone ? P.red : P.textMute,
              transition: "all 0.12s",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              marginRight: 4,
            }}
            onMouseEnter={e => {
              if (!clearingDone) {
                (e.currentTarget as HTMLButtonElement).style.background = P.redDim;
                (e.currentTarget as HTMLButtonElement).style.borderColor = P.red;
                (e.currentTarget as HTMLButtonElement).style.color = P.red;
              }
            }}
            onMouseLeave={e => {
              if (!clearingDone) {
                (e.currentTarget as HTMLButtonElement).style.background = P.card;
                (e.currentTarget as HTMLButtonElement).style.borderColor = P.border;
                (e.currentTarget as HTMLButtonElement).style.color = P.textMute;
              }
            }}
            title="Clear completed tasks"
          >
            {clearingDone ? (
              <Loader2 size={13} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Trash2 size={13} strokeWidth={2} color="currentColor" />
            )}
          </button>
        )}
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
        ref={setNodeRef}
        style={{
          flex: 1, minHeight: 200,
          borderRadius: 12,
          border: isOver ? `2px dashed ${col.dot}` : "2px dashed transparent",
          background: isOver ? col.dim : "transparent",
          transition: "background 0.15s ease, border-color 0.15s ease",
          padding: isOver ? 8 : 0,
          display: "flex", flexDirection: "column", gap: 10,
        }}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map(task => {
            const taskId = (task._id ?? task.id) as string;
            return (
              <SortableTaskCard
                key={taskId}
                task={task}
                dragging={activeTaskId === taskId}
                onCardClick={onCardClick}
              />
            );
          })}
        </SortableContext>

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
    fetch("/api/talents")
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
            <label htmlFor={`${uid}-cl`} style={label}>ASSIGNEE</label>
            <select id={`${uid}-cl`} value={clientId}
              onChange={e => {
                setClientId(e.target.value);
                const c = clients.find(x => x.id === e.target.value);
                if (c) setAssignee(c.name);
              }}
              disabled={loadingCl} style={{ ...field, cursor: "pointer" }} onFocus={onFocus} onBlur={onBlur}>
              <option value="">{loadingCl ? "Loading..." : "No Assignee (internal task)"}</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>
              ))}
            </select>
            {clientId && (
              <p style={{ fontSize: 11, color: P.teal, marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                ✓ This task will appear in the talent portal
              </p>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          
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
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [hoverColumn,  setHoverColumn]  = useState<ColumnId | null>(null);
  const [modalCol,     setModalCol]     = useState<ColumnId | null>(null);
  const [toast,        setToast]        = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [search,       setSearch]       = useState("");
  const [clearingDone, setClearingDone] = useState(false);
  const [draggingTaskIds, setDraggingTaskIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const findTaskColumn = useCallback((taskId: string, source = columns): ColumnId | null => {
    for (const col of COLUMNS) {
      if (source[col.id].some(t => ((t._id ?? t.id) as string) === taskId)) return col.id;
    }
    return null;
  }, [columns]);

  const isColumnId = useCallback((id: string): id is ColumnId =>
    COLUMNS.some(col => col.id === id), []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const taskId = String(event.active.id);
    setActiveTaskId(taskId);
    setHoverColumn(findTaskColumn(taskId));
    // Add to dragging set to prevent polling from updating it
    setDraggingTaskIds(prev => new Set(prev).add(taskId));
  }, [findTaskColumn]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = event.over?.id ? String(event.over.id) : "";
    if (!overId) {
      setHoverColumn(null);
      return;
    }
    setHoverColumn(isColumnId(overId) ? overId : findTaskColumn(overId));
  }, [findTaskColumn, isColumnId]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const taskId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : "";
    const srcId = findTaskColumn(taskId);
    const targetColId = overId
      ? isColumnId(overId)
        ? overId
        : findTaskColumn(overId)
      : null;

    setActiveTaskId(null);
    setHoverColumn(null);

    if (!taskId || !srcId || !targetColId || taskId.startsWith("temp_")) {
      // Nothing to persist — release the drag lock immediately
      setDraggingTaskIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      return;
    }

    const previousColumns = columns;
    const overIndex = isColumnId(overId)
      ? columns[targetColId].length
      : columns[targetColId].findIndex(t => ((t._id ?? t.id) as string) === overId);

    // Keep the task locked out of polling until the PATCH resolves, so a
    // slow network response can't get clobbered by an incoming poll and
    // snap the card back mid-flight.
    const releaseDragLock = () => {
      setDraggingTaskIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    };

    if (srcId === targetColId) {
      const oldIndex = columns[srcId].findIndex(t => ((t._id ?? t.id) as string) === taskId);
      const newIndex = overIndex === -1 ? columns[srcId].length - 1 : overIndex;
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        releaseDragLock();
        return;
      }

      setColumns(prev => ({
        ...prev,
        [srcId]: arrayMove(prev[srcId], oldIndex, newIndex),
      }));

      apiPatchTask(taskId, { status: targetColId })
        .then(() => { router.refresh(); })
        .catch(err => {
          setColumns(previousColumns);
          showToast(`Couldn't save: ${(err as Error).message}`);
        })
        .finally(releaseDragLock);
      return;
    }

    setColumns(prev => {
      const src = [...prev[srcId]];
      const dst = [...prev[targetColId]];
      const oldIndex = src.findIndex(t => ((t._id ?? t.id) as string) === taskId);
      if (oldIndex === -1) return prev;
      const [moved] = src.splice(oldIndex, 1);
      const nextTask = { ...moved, status: targetColId };
      const insertAt = overIndex === -1 ? dst.length : overIndex;
      dst.splice(insertAt, 0, nextTask);
      return { ...prev, [srcId]: src, [targetColId]: dst };
    });

    if (onTaskMove) {
      onTaskMove(taskId, srcId, targetColId);
      releaseDragLock();
    } else {
      apiPatchTask(taskId, { status: targetColId })
        .then(() => { router.refresh(); })
        .catch(err => {
          setColumns(previousColumns);
          showToast(`Move failed: ${(err as Error).message}`);
        })
        .finally(releaseDragLock);
    }
  }, [columns, findTaskColumn, isColumnId, onTaskMove, router]);

  const handleCreateTask = useCallback((fields: Omit<Task, "id">) => {
    if (onTaskCreate) {
      onTaskCreate(fields);
      return;
    }

    const tempId = `temp_${Date.now()}`;
    
    // Destructure with explicit casting to bypass the index signature's 'unknown' enforcement
    const title = fields.title as string;
    const priority = fields.priority as Priority;
    const targetCol = (fields.status || "backlog") as ColumnId;

    const localCopy: Task = {
      ...fields,
      id: tempId,
      title,
      priority,
      status: targetCol,
    };

    setColumns(prev => ({
      ...prev,
      [targetCol]: [...(prev[targetCol] || []), localCopy]
    }));

    apiCreateTask(fields)
      .then(() => {
        showToast("Task created successfully", "success");
        router.refresh();
      })
      .catch(err => {
        setColumns(prev => ({
          ...prev,
          [targetCol]: (prev[targetCol] || []).filter(t => ((t._id ?? t.id) as string) !== tempId)
        }));
        showToast(`Creation failed: ${(err as Error).message}`);
      });
  }, [onTaskCreate, router]);

  const handleClearDone = useCallback(async () => {
    if (clearingDone) return;
    
    const doneTasks = columns.done;
    if (doneTasks.length === 0) {
      showToast("No completed tasks to clear", "error");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${doneTasks.length} completed task(s)? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    setClearingDone(true);
    try {
      const deletePromises = doneTasks.map(task => 
        fetch(`/api/tasks/${task._id ?? task.id}`, {
          method: "DELETE",
        })
      );

      const results = await Promise.all(deletePromises);
      const failed = results.filter(r => !r.ok).length;

      if (failed > 0) {
        showToast(`Failed to delete ${failed} task(s)`, "error");
      } else {
        showToast(`Cleared ${doneTasks.length} completed task(s)`, "success");
        router.refresh();
      }
    } catch (error) {
      showToast("Failed to clear completed tasks", "error");
    } finally {
      setClearingDone(false);
    }
  }, [columns.done, clearingDone, router]);

  // Handle task updates from polling
  const handleTasksUpdate = useCallback((polledTasks: PollingTask[]) => {
    setColumns(prevColumns => {
      // If any tasks are being dragged, skip this update
      if (draggingTaskIds.size > 0) {
        return prevColumns
      }

      // Build the new columns object
      const newColumns: Record<ColumnId, Task[]> = {
        backlog: [],
        todo: [],
        inprogress: [],
        review: [],
        done: [],
      }

      for (const task of polledTasks) {
        const colId = resolveColumn(task)
        newColumns[colId].push(task as Task)
      }

      // Skip the state update entirely if nothing actually changed — this
      // is what was causing the jank: every ~6s poll was replacing the
      // whole columns object (and re-mounting every card) even when the
      // data was byte-for-byte identical to what was already on screen.
      if (columnsSignature(newColumns) === columnsSignature(prevColumns)) {
        return prevColumns
      }

      return newColumns
    })
  }, [draggingTaskIds])

  // Set up polling for real-time updates
  useTaskPolling({
    draggingTaskIds,
    onTasksUpdate: handleTasksUpdate,
    interval: 6000,
    enabled: true,
  })

  // Filter tasks locally based on search state
  const filteredColumns = {
    backlog: columns.backlog.filter(t => t.title.toLowerCase().includes(search.toLowerCase())),
    todo: columns.todo.filter(t => t.title.toLowerCase().includes(search.toLowerCase())),
    inprogress: columns.inprogress.filter(t => t.title.toLowerCase().includes(search.toLowerCase())),
    review: columns.review.filter(t => t.title.toLowerCase().includes(search.toLowerCase())),
    done: columns.done.filter(t => t.title.toLowerCase().includes(search.toLowerCase())),
  };

  const activeTask = activeTaskId
    ? (columns.backlog.concat(columns.todo, columns.inprogress, columns.review, columns.done))
        .find(t => ((t._id ?? t.id) as string) === activeTaskId)
    : null;

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* ── Working Shared Sidebar ── */}
      <Sidebar />

      {/* ── Kanban Board Container Track ── */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: P.bg,
        overflow: "hidden",
        position: "relative",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: P.text,
        minWidth: 0,
      }}>
        {/* Search Header Context */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "12px 28px", height: 56, flexShrink: 0,
          background: P.card, borderBottom: `1px solid ${P.border}`,
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: P.text, flex: 1 }}>Task Board</span>
          <div style={{ position: "relative", width: 240 }}>
            <Search size={14} color={P.textMute} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "6px 10px 6px 30px", fontSize: 12,
                borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg,
                color: P.text, outline: "none", boxSizing: "border-box"
              }}
            />
          </div>
        </div>

        {/* Board Tracks Layout */}
        <div style={{ flex: 1, overflowX: "auto", padding: "24px 28px 40px" }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div style={{ display: "flex", gap: 20, height: "100%" }}>
              {COLUMNS.map(col => (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  tasks={filteredColumns[col.id]}
                  activeTaskId={activeTaskId}
                  isOver={hoverColumn === col.id}
                  onAddClick={setModalCol}
                  onCardClick={(t) => setSelectedTask(t as unknown as TaskDetail)}
                  doneCount={columns.done.length}
                  onClearDone={handleClearDone}
                  clearingDone={clearingDone}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={dropAnimationConfig}>
              {activeTask ? <TaskCard task={activeTask} dragging={true} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* ── Modals & Toast Frameworks ── */}
      {modalCol && (
        <AddTaskModal
          defaultCol={modalCol}
          onAdd={handleCreateTask}
          onClose={() => setModalCol(null)}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onStatusChange={() => router.refresh()}
          onProgressChange={() => router.refresh()}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}