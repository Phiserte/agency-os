"use client"

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

import {
  CheckCircle2,
  Clock3,
  AlertTriangle,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Download,
} from "lucide-react";

import {
  DndContext,
  useDroppable,
  useDraggable,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import Sidebar from "@/components/Sidebar";
import TaskDetailModal, {
  type TaskDetail,
} from "@/components/Taskdetailmodal";

import {
  useTaskPolling,
  type Task as PollingTask,
} from "@/hooks/useTaskPolling";

const LOGO_SRC = "/logo.svg";

/* -------------------------------------------------------------------------- */
/*                                   Colors                                   */
/* -------------------------------------------------------------------------- */

const P = {
  bg0: "#F8FAFC",
  bg1: "#F1F5F9",

  card: "#FFFFFF",

  border: "#E2E8F0",
  borderHover: "#CBD5E1",

  text: "#0F172A",
  textSub: "#475569",
  textMute: "#94A3B8",

  purple: "#534AB7",
  purpleLight: "#AFA9EC",
  purpleDim: "#EEEDFE",
  purpleText: "#3C3489",

  teal: "#1D9E75",
  tealDim: "#E1F5EE",
  tealText: "#085041",

  amber: "#EF9F27",
  amberDim: "#FAEEDA",
  amberText: "#633806",

  red: "#E24B4A",
  redDim: "#FCEBEB",
  redText: "#791F1F",
};

const STATUS_ORDER = [
  "backlog",
  "todo",
  "inprogress",
  "review",
  "done",
] as const;

const STATUS_CFG: Record<
  string,
  {
    label: string;
    color: string;
    dim: string;
    dot: string;
  }
> = {
  backlog: {
    label: "Backlog",
    color: P.textSub,
    dim: "#E2E8F0",
    dot: P.textMute,
  },

  todo: {
    label: "To Do",
    color: P.purpleText,
    dim: P.purpleDim,
    dot: P.purple,
  },

  inprogress: {
    label: "In Progress",
    color: "#1E40AF",
    dim: "#EFF6FF",
    dot: "#3B82F6",
  },

  review: {
    label: "Review",
    color: P.amberText,
    dim: P.amberDim,
    dot: P.amber,
  },

  done: {
    label: "Done",
    color: P.tealText,
    dim: P.tealDim,
    dot: P.teal,
  },
};

const PRIORITY_CFG = {
  high: {
    label: "High",
    color: P.redText,
    dim: P.redDim,
  },

  medium: {
    label: "Medium",
    color: P.amberText,
    dim: P.amberDim,
  },

  low: {
    label: "Low",
    color: "#27500A",
    dim: "#EAF3DE",
  },
};

const TAG_COLORS = [
  {
    color: P.purpleText,
    dim: P.purpleDim,
  },

  {
    color: "#1E40AF",
    dim: "#EFF6FF",
  },

  {
    color: P.tealText,
    dim: P.tealDim,
  },

  {
    color: P.amberText,
    dim: P.amberDim,
  },
];

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

interface Task {
  id: string;

  title: string;

  description: string;

  priority: string;

  status: string;

  assignee: string;

  assignedBy?: string;

  tags: string[];

  due: string;

  progress: number;

  createdAt: string;
}

interface Props {
  tasks: Task[];

  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };

  dateStr: string;

  greet: string;

  nowISO: string;
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function getDueStatus(
  due: string,
  nowISO: string
): "overdue" | "today" | "soon" | "ok" | "none" {
  if (!due) return "none";

  const d = new Date(due);
  const n = new Date(nowISO);

  if (isNaN(d.getTime())) return "none";

  const diff = Math.ceil((d.getTime() - n.getTime()) / 86400000);

  if (diff < 0) return "overdue";

  if (diff === 0) return "today";

  if (diff <= 3) return "soon";

  return "ok";
}

function getDueLabel(
  due: string,
  nowISO: string
) {
  if (!due) return "";

  const d = new Date(due);
  const n = new Date(nowISO);

  if (isNaN(d.getTime())) return due;

  const diff = Math.ceil((d.getTime() - n.getTime()) / 86400000);

  if (diff < 0)
    return `${Math.abs(diff)}d overdue`;

  if (diff === 0)
    return "Due today";

  if (diff === 1)
    return "Due tomorrow";

  if (diff <= 7)
    return `Due in ${diff}d`;

  return d.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
}

function timeAgo(
  iso: string,
  nowISO: string
) {
  const diff =
    new Date(nowISO).getTime() -
    new Date(iso).getTime();

  const mins = Math.floor(diff / 60000);

  const hrs = Math.floor(mins / 60);

  const days = Math.floor(hrs / 24);

  if (mins < 1) return "just now";

  if (mins < 60) return `${mins}m ago`;

  if (hrs < 24) return `${hrs}h ago`;

  if (days < 7) return `${days}d ago`;

  return new Date(iso).toLocaleDateString(
    "en-IN",
    {
      month: "short",
      day: "numeric",
    }
  );
}

const DUE_STYLE = {
  overdue: {
    color: P.red,
    bg: P.redDim,
  },

  today: {
    color: P.amber,
    bg: P.amberDim,
  },

  soon: {
    color: P.amberText,
    bg: "rgba(239,159,39,.06)",
  },

  ok: {
    color: P.textSub,
    bg: "transparent",
  },

  none: {
    color: P.textSub,
    bg: "transparent",
  },
};

const AV_BG = [
  P.purpleDim,
  "#EFF6FF",
  P.tealDim,
  P.amberDim,
  P.redDim,
];

const AV_FG = [
  P.purpleText,
  "#1E40AF",
  P.tealText,
  P.amberText,
  P.redText,
]; 

/* -------------------------------------------------------------------------- */
/*                                   Avatar                                   */
/* -------------------------------------------------------------------------- */

function Avatar({
  name,
  size = 28,
}: {
  name: string;
  size?: number;
}) {
  const index =
    (name?.charCodeAt(0) ?? 65) %
    AV_BG.length;

  const parts = (name || "?").trim().split(" ");

  const initials =
    parts.length === 1
      ? parts[0].slice(0, 2).toUpperCase()
      : (
          parts[0][0] +
          parts[parts.length - 1][0]
        ).toUpperCase();

  return (
    <div
      style={{
        width: size,
        height: size,

        borderRadius: "50%",

        background: AV_BG[index],

        border: `1px solid ${AV_FG[index]}33`,

        display: "flex",

        alignItems: "center",

        justifyContent: "center",

        fontWeight: 700,

        color: AV_FG[index],

        fontSize: Math.floor(size * 0.36),

        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Comment Counter                               */
/* -------------------------------------------------------------------------- */

function useCommentCount(taskId: string) {
  const [count, setCount] =
    useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    fetch(`/api/tasks/${taskId}/comments`)
      .then((r) => r.json())
      .then((data: unknown[]) => {
        if (mounted)
          setCount(data.length);
      })
      .catch(() => {
        if (mounted)
          setCount(0);
      });

    return () => {
      mounted = false;
    };
  }, [taskId]);

  return count;
}

/* -------------------------------------------------------------------------- */
/*                                 Task Card                                  */
/* -------------------------------------------------------------------------- */

function TaskCard({
  task,
  nowISO,
  onClick,
}: {
  task: Task;

  nowISO: string;

  onClick: (task: Task) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
  });

 const priority =
  PRIORITY_CFG[
    task.priority as keyof typeof PRIORITY_CFG
  ] ?? PRIORITY_CFG.low;
  const dueState = getDueStatus(
    task.due,
    nowISO
  );

  const dueStyle =
    DUE_STYLE[dueState];

  const dueLabel = getDueLabel(
    task.due,
    nowISO
  );

  const comments =
    useCommentCount(task.id);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (!isDragging)
          onClick(task);
      }}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px,${transform.y}px,0)`
          : undefined,

        opacity: isDragging
          ? 0.45
          : 1,

        cursor: isDragging
          ? "grabbing"
          : "pointer",

        userSelect: "none",

        touchAction: "none",

        background: P.card,

        borderRadius: 12,

        padding: 14,

        border:
          dueState === "overdue"
            ? `1px solid ${P.red}55`
            : `1px solid ${P.border}`,

        borderLeft:
          dueState === "overdue"
            ? `3px solid ${P.red}`
            : dueState === "today"
            ? `3px solid ${P.amber}`
            : `1px solid ${P.border}`,

        boxShadow: isDragging
          ? "0 12px 24px rgba(0,0,0,.12)"
          : "0 1px 3px rgba(0,0,0,.03)",

        transition:
          isDragging
            ? "none"
            : "all .15s",
      }}
      onMouseEnter={(e) => {
        if (isDragging) return;

        e.currentTarget.style.boxShadow =
          "0 8px 18px rgba(0,0,0,.08)";

        e.currentTarget.style.borderColor =
          dueState === "overdue"
            ? P.red
            : P.borderHover;
      }}
      onMouseLeave={(e) => {
        if (isDragging) return;

        e.currentTarget.style.boxShadow =
          "0 1px 3px rgba(0,0,0,.03)";

        e.currentTarget.style.borderColor =
          dueState === "overdue"
            ? `${P.red}55`
            : P.border;
      }}
    >
      {/* Header */}

      <div
        style={{
          display: "flex",

          justifyContent: "space-between",

          alignItems: "center",

          marginBottom: 10,
        }}
      >
        <span
          style={{
            padding: "2px 7px",

            borderRadius: 5,

            fontSize: 10,

            fontWeight: 600,

            background: priority.dim,

            color: priority.color,
          }}
        >
          {priority.label}
        </span>

        {dueLabel && (
          <span
            style={{
              display: "flex",

              alignItems: "center",

              gap: 4,

              padding: "2px 7px",

              borderRadius: 5,

              fontSize: 10,

              background: dueStyle.bg,

              color: dueStyle.color,

              fontWeight:
                dueState === "today" ||
                dueState === "overdue"
                  ? 600
                  : 500,
            }}
          >
            {(dueState === "today" ||
              dueState === "overdue") && (
              <AlertTriangle
                size={9}
              />
            )}

            {dueLabel}
          </span>
        )}
      </div>

      {/* Title */}

      <h4
        style={{
          margin: 0,

          fontSize: 13,

          fontWeight: 600,

          color: P.text,

          lineHeight: 1.4,
        }}
      >
        {task.title}
      </h4>

      {task.description && (
        <p
          style={{
            marginTop: 6,

            marginBottom: 10,

            color: P.textSub,

            fontSize: 11,

            lineHeight: 1.5,

            display: "-webkit-box",

            WebkitLineClamp: 2,

            WebkitBoxOrient: "vertical",

            overflow: "hidden",
          }}
        >
          {task.description}
        </p>
      )}

      {/* Progress */}

      {task.progress > 0 && (
        <>
          <div
            style={{
              display: "flex",

              justifyContent: "space-between",

              fontSize: 10,

              marginBottom: 3,
            }}
          >
            <span>Progress</span>

            <span
              style={{
                color:
                  task.progress === 100
                    ? P.teal
                    : P.amber,
              }}
            >
              {task.progress}%
            </span>
          </div>

          <div
            style={{
              height: 5,

              background: P.bg1,

              borderRadius: 999,

              overflow: "hidden",

              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: `${task.progress}%`,

                height: "100%",

                background:
                  task.progress === 100
                    ? P.teal
                    : P.purple,
              }}
            />
          </div>
        </>
      )}

      {/* Tags */}

      {!!task.tags.length && (
        <div
          style={{
            display: "flex",

            flexWrap: "wrap",

            gap: 4,

            marginBottom: 10,
          }}
        >
          {task.tags.map((tag, i) => {
            const c =
              TAG_COLORS[
                i % TAG_COLORS.length
              ];

            return (
              <span
                key={tag}
                style={{
                  background: c.dim,

                  color: c.color,

                  padding: "2px 6px",

                  borderRadius: 4,

                  fontSize: 10,
                }}
              >
                {tag}
              </span>
            );
          })}
        </div>
      )}

      {/* Footer */}

      <div
        style={{
          display: "flex",

          justifyContent:
            "space-between",

          alignItems: "center",

          borderTop: `1px solid ${P.border}`,

          paddingTop: 10,
        }}
      >
        <div
          style={{
            display: "flex",

            alignItems: "center",

            gap: 6,
          }}
        >
          <Avatar
            name={task.assignee}
            size={20}
          />

          <span
            style={{
              fontSize: 11,

              color: P.textSub,
            }}
          >
            {task.assignee}
          </span>
        </div>

        <div
          style={{
            display: "flex",

            alignItems: "center",

            gap: 8,
          }}
        >
          {comments !== null && (
            <span
              style={{
                display: "flex",

                alignItems: "center",

                gap: 3,

                fontSize: 11,

                color:
                  comments > 0
                    ? P.purple
                    : P.textMute,
              }}
            >
              <MessageSquare
                size={11}
              />

              {comments}
            </span>
          )}

          <span
            style={{
              fontSize: 10,

              color: P.textMute,
            }}
          >
            {timeAgo(
              task.createdAt,
              nowISO
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Column                                    */
/* -------------------------------------------------------------------------- */

function Column({
  status,
  tasks,
  nowISO,
  onCardClick,
}: {
  status: string;
  tasks: Task[];
  nowISO: string;
  onCardClick: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const cfg = STATUS_CFG[status];

  const [collapsed, setCollapsed] =
    useState(status === "done");

  return (
    <div
      ref={setNodeRef}
      style={{
        width: 280,
        minWidth: 280,

        flexShrink: 0,

        display: "flex",

        flexDirection: "column",

        minHeight: 0,

        height: "100%",

        borderRadius: 14,

        background: isOver
          ? cfg.dim
          : "transparent",

        border: isOver
          ? `2px dashed ${cfg.dot}`
          : "2px dashed transparent",

        transition: "all .15s",
      }}
    >
      {/* Header */}

      <button
        onClick={() =>
          setCollapsed((v) => !v)
        }
        style={{
          flexShrink: 0,

          display: "flex",

          justifyContent:
            "space-between",

          alignItems: "center",

          padding: "10px 12px",

          background: P.card,

          border: `1px solid ${P.border}`,

          borderRadius: 12,

          cursor: "pointer",

          boxShadow:
            "0 1px 3px rgba(0,0,0,.04)",
        }}
      >
        <div
          style={{
            display: "flex",

            alignItems: "center",

            gap: 8,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,

              borderRadius: "50%",

              background: cfg.dot,
            }}
          />

          <span
            style={{
              fontWeight: 600,

              fontSize: 13,

              color: P.text,
            }}
          >
            {cfg.label}
          </span>
        </div>

        <div
          style={{
            display: "flex",

            alignItems: "center",

            gap: 8,
          }}
        >
          <span
            style={{
              background: cfg.dim,

              color: cfg.color,

              borderRadius: 999,

              padding: "2px 8px",

              fontSize: 11,

              fontWeight: 700,
            }}
          >
            {tasks.length}
          </span>

          {collapsed ? (
            <ChevronDown
              size={14}
            />
          ) : (
            <ChevronUp
              size={14}
            />
          )}
        </div>
      </button>

      {/* Accent */}

      <div
        style={{
          height: 3,

          flexShrink: 0,

          margin: "10px 4px",

          borderRadius: 999,

          background: cfg.dot,

          opacity: .45,
        }}
      />

      {/* THIS IS THE IMPORTANT FIX */}

      <div
        style={{
          flex: 1,

          minHeight: 0,

          overflow: "hidden",

          display: collapsed
            ? "none"
            : "flex",

          flexDirection: "column",
        }}
      >
        <div
          style={{
            flex: 1,

            minHeight: 0,

            overflowY: "auto",

            overflowX: "hidden",

            display: "flex",

            flexDirection: "column",

            gap: 10,

            paddingRight: 6,
          }}
        >
          {tasks.length === 0 ? (
            <div
              style={{
                height: 70,

                display: "flex",

                alignItems: "center",

                justifyContent:
                  "center",

                border: `1px dashed ${P.border}`,

                borderRadius: 12,

                background: P.card,

                color: P.textMute,

                fontSize: 12,

                flexShrink: 0,
              }}
            >
              No tasks
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                nowISO={nowISO}
                onClick={onCardClick}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function TalentDashboard({ tasks: initialTasks, user, dateStr, greet, nowISO }: Props) {
  const router = useRouter()
  const [tasks,        setTasks]        = useState<Task[]>(initialTasks)
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null)
  const [logging,      setLogging]      = useState(false)
  const [isMounted,    setIsMounted]    = useState(false)
  const [draggingTaskIds, setDraggingTaskIds] = useState<Set<string>>(new Set())
  const [exporting,    setExporting]    = useState(false)

  // Responsive sidebar state
  const [isMobile, setIsMobile] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  // Prevent Next.js SSR / Hydration mismatch issues
  useEffect(() => {
    setIsMounted(true)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Close mobile sidebar when clicking outside
  useEffect(() => {
    if (!isMobileSidebarOpen || !isMobile) return

    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setIsMobileSidebarOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMobileSidebarOpen, isMobile])

  // Close profile dropdown when clicking outside
  useEffect(() => {
    if (!isProfileOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isProfileOpen])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const total      = tasks.length
  const done       = tasks.filter(t => t.status === "done").length
  const inProgress = tasks.filter(t => t.status === "inprogress").length
  const overdue    = tasks.filter(t => getDueStatus(t.due, nowISO) === "overdue" && t.status !== "done").length
  const dueToday   = tasks.filter(t => getDueStatus(t.due, nowISO) === "today" && t.status !== "done").length
  const pct        = total === 0 ? 0 : Math.round((done / total) * 100)

  const grouped = STATUS_ORDER.reduce<Record<string, Task[]>>((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s)
    return acc
  }, {})

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const taskId       = active.id as string
    const targetStatus = over.id as string // This will be "todo", "inprogress", etc.

    // Add to dragging set to prevent polling from updating it
    setDraggingTaskIds(prev => new Set(prev).add(taskId))

    // 1. Update the local UI state immediately so the card moves over smoothly
    setTasks(prevTasks => 
      prevTasks.map(t => 
        t.id === taskId ? { ...t, status: targetStatus } : t
      )
    )

    // 2. Optional: If you want to sync this move to your database via an API:
    
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      })
    } catch (err) {
      console.error("Failed to save task status", err)
      // Rollback UI state if the server call fails
      setTasks(initialTasks)
    } finally {
      // Remove from dragging set after a short delay to let the UI settle
      setTimeout(() => {
        setDraggingTaskIds(prev => {
          const next = new Set(prev)
          next.delete(taskId)
          return next
        })
      }, 100)
    }
  }

  // Handle task updates from polling — memoized so identity stays stable
  // across renders (draggingTaskIds only changes on actual drag start/end).
  // This was the source of the polling loop: an inline arrow function here
  // was recreated every render, which made useTaskPolling's internal
  // fetchTasks unstable and retriggered the "initial fetch" on every render.
  const handleTasksUpdate = useCallback((polledTasks: PollingTask[]) => {
  setTasks(prevTasks => {
    if (draggingTaskIds.size > 0) {
      return prevTasks
    }
    return polledTasks as Task[]
  })
}, [draggingTaskIds])

  // Set up polling for real-time updates
  const { refetch: _refetch } = useTaskPolling({
    draggingTaskIds,
    onTasksUpdate: handleTasksUpdate,
    interval: 6000,
    filterParams: { talentId: user.id }
  })

  async function handleLogout() {
    setLogging(true)
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  async function handleExportWorksheet() {
    setExporting(true)
    try {
      const response = await fetch("/api/worksheet/export")
      
      if (!response.ok) {
        const error = await response.json()
        alert(error.error || "Failed to export worksheet")
        return
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition")
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || "worksheet.xlsx"

      // Create a blob and download it
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Failed to export worksheet:", error)
      alert("Failed to export worksheet. Please try again.")
    } finally {
      setExporting(false)
    }
  }

  return (
    // FIX: was minHeight: "100vh" with no overflow control, so the whole
    // document grew and scrolled as tasks piled up — including the sidebar,
    // which has a fixed height: "100vh" but nothing keeping it pinned to the
    // viewport, so it scrolled away with the rest of the page. Locking this
    // to height: "100vh" + overflow: "hidden" makes it the single scroll
    // boundary; everything that needs to scroll now does so *inside* it.
    <div style={{
      height: "100vh", background: P.bg0,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: P.text,
      display: "flex",
      overflow: "hidden",
    }}>

        {/* Mobile Sidebar Toggle Button */}
        {isMobile && (
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            style={{
              position: "fixed",
              top: 16,
              left: 16,
              zIndex: 1001,
              width: 40,
              height: 40,
              borderRadius: 8,
              background: P.card,
              border: `1px solid ${P.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              color: P.text,
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)"
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"
            }}
            title={isMobileSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}

        {/* Sidebar */}
        {isMobile ? (
          // Mobile: Fixed sidebar that can be toggled
          <div
            ref={sidebarRef}
            style={{
              width: isMobileSidebarOpen ? 240 : 0,
              minWidth: isMobileSidebarOpen ? 240 : 0,
              height: "100vh",
              position: "fixed",
              left: 0,
              top: 0,
              zIndex: 999,
              transition: "width 0.3s ease, min-width 0.3s ease",
              overflow: "hidden",
              background: P.card,
              borderRight: `1px solid ${P.border}`,
            }}
          >
            <div style={{ width: 240, height: "100vh", display: "flex", flexDirection: "column" }}>
              <Sidebar user={user} />
            </div>
          </div>
        ) : (
          // Desktop: Normal sidebar always visible
          <div style={{
            width: 240,
            minWidth: 240,
            height: "100vh",
            flexShrink: 0,
            background: P.card,
            borderRight: `1px solid ${P.border}`,
          }}>
            <Sidebar user={user} />
          </div>
        )}

        {/* Main Content */}
        <div style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          background: P.bg0,
          overflow: "hidden",
          minWidth: 0,
        }}>
        {/* NAVBAR — sticky is redundant now that the scroll boundary lives
            one level down (see the content div below), but harmless to
            keep; it just never actually needs to "stick" since it's
            already outside the scrolling area. */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 40,
          background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${P.border}`,
          display: "flex", alignItems: "center",
          padding: "0 32px", height: 56, gap: 16,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO_SRC}
              alt="Sahynex"
              style={{
                height: 28,
              }}
            />
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 20,
              background: P.purpleDim, color: P.purpleText, fontWeight: 600,
            }}>
              Talent Portal
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {overdue > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: P.redDim, border: `1px solid ${P.red}44`,
                borderRadius: 8, padding: "5px 12px",
                fontSize: 11, color: P.red, fontWeight: 600,
              }}>
                <AlertTriangle size={12} strokeWidth={2.5} />
                {overdue} overdue
              </div>
            )}

            {/* Worksheet Export Button */}
            <button
              onClick={handleExportWorksheet}
              disabled={exporting || total === 0}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: exporting ? P.purpleDim : P.card,
                border: `1px solid ${exporting ? P.purple : P.border}`,
                borderRadius: 8, padding: "5px 12px",
                fontSize: 11, color: exporting ? P.purpleText : P.textSub,
                fontWeight: 600, cursor: exporting ? "not-allowed" : "pointer",
                transition: "all 0.15s",
                opacity: total === 0 ? 0.5 : 1,
              }}
              title={total === 0 ? "No completed tasks to export" : "Download worksheet"}
            >
              <Download size={12} strokeWidth={2} />
              {exporting ? "Exporting..." : "Worksheet"}
            </button>

            {/* Profile Dropdown */}
            <div
              ref={profileRef}
              style={{ position: "relative" }}
            >
              <div
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 8px", borderRadius: 10,
                  border: `1px solid ${P.border}`, background: P.card,
                  cursor: "pointer",
                }}
              >
                <Avatar name={user.name} size={28} />
                <span style={{ fontSize: 13, color: P.textSub, fontWeight: 500 }}>
                  {user.name.split(" ")[0]}
                </span>
                <ChevronDown size={12} color={P.textMute} strokeWidth={1.8} />
              </div>

              {/* Profile Dropdown Menu */}
              {isProfileOpen && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  background: P.card,
                  border: `1px solid ${P.border}`,
                  borderRadius: 12,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  minWidth: 200,
                  zIndex: 1000,
                  overflow: "hidden",
                }}>
                  <div style={{
                    padding: "12px 16px",
                    borderBottom: `1px solid ${P.border}`,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: P.text }}>{user.name}</div>
                    <div style={{ fontSize: 12, color: P.textSub, marginTop: 2 }}>{user.email}</div>
                    <div style={{
                      fontSize: 11,
                      color: P.purple,
                      background: P.purpleDim,
                      padding: "2px 8px",
                      borderRadius: 6,
                      marginTop: 6,
                      display: "inline-block",
                      fontWeight: 500,
                      textTransform: "capitalize",
                    }}>
                      {user.role.replace("_", " ")}
                    </div>
                  </div>

                  <div style={{ padding: "6px 0" }}>
                    <button
                      onClick={() => {
                        setIsProfileOpen(false)
                        handleLogout()
                      }}
                      disabled={logging}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        border: "none",
                        background: "transparent",
                        color: P.red,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = P.redDim}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <LogOut size={14} color={P.red} strokeWidth={1.8} />
                      {logging ? "Signing out..." : "Sign out"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* LAYOUT FIX: Split the single scroll container into two levels.
            Outer: flex column that consumes remaining space but never scrolls.
            Inner: the actual scrollable pane that holds all dashboard content.
            This prevents the board from fighting the parent for height and
            lets height:100% propagate correctly through Board → Columns. */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Inner scroll container — this is where all dashboard content lives */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", padding: "32px 32px 56px" }}>

            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px", margin: 0 }}>
                {greet}, {user.name.split(" ")[0]}
              </h1>
              <p style={{ marginTop: 4, fontSize: 13, color: P.textSub }}>{dateStr}</p>
            </div>

            {/* ── ALERT BANNERS ─────────────────────────────────────────────── */}
            {(overdue > 0 || dueToday > 0) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                {overdue > 0 && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: P.redDim, border: `1px solid ${P.red}33`,
                    borderRadius: 12, padding: "12px 16px",
                  }}>
                    <AlertTriangle size={16} color={P.red} strokeWidth={2} />
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: P.redText }}>
                        {overdue} task{overdue > 1 ? "s are" : " is"} overdue
                      </span>
                      <span style={{ fontSize: 12, color: P.redText, opacity: 0.8, marginLeft: 8 }}>
                        — please review and update your agency
                      </span>
                    </div>
                  </div>
                )}
                {dueToday > 0 && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: P.amberDim, border: `1px solid ${P.amber}33`,
                    borderRadius: 12, padding: "12px 16px",
                  }}>
                    <Clock3 size={16} color={P.amber} strokeWidth={2} />
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: P.amberText }}>
                        {dueToday} task{dueToday > 1 ? "s are" : " is"} due today
                      </span>
                      <span style={{ fontSize: 12, color: P.amberText, opacity: 0.8, marginLeft: 8 }}>
                        — check progress below
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STAT CARDS ────────────────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 20 }}>
              {[
                { label: "Your Tasks",  value: total,      color: P.purple,                             dim: P.purpleDim, icon: CheckSquare,   delta: `${pct}% complete` },
                { label: "In Progress", value: inProgress, color: "#3B82F6",                            dim: "#EFF6FF",   icon: Clock3,        delta: "active now" },
                { label: "Completed",   value: done,       color: P.teal,                               dim: P.tealDim,   icon: CheckCircle2,  delta: "finished" },
                { label: "Overdue",     value: overdue,    color: overdue > 0 ? P.red : P.textMute,  dim: overdue > 0 ? P.redDim : P.bg1, icon: AlertTriangle, delta: overdue > 0 ? "needs attention" : "all on track" },
              ].map(({ label, value, color, dim, icon: Icon, delta }) => (
                <div
                  key={label}
                  style={{
                    background: P.card, border: `1px solid ${P.border}`,
                    borderRadius: 14, padding: "18px 20px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    position: "relative", overflow: "hidden",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"
                    el.style.transform = "translateY(-1px)"
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"
                    el.style.transform = "translateY(0)"
                  }}
                >
                  {/* Top accent */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: "14px 14px 0 0" }} />

                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: dim,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 12, marginTop: 4,
                  }}>
                    <Icon size={18} color={color} strokeWidth={1.8} />
                  </div>
                  <p style={{ fontSize: 11, color: P.textSub, letterSpacing: "0.4px", textTransform: "uppercase", fontWeight: 600, margin: 0 }}>
                    {label}
                  </p>
                  <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", color: P.text, margin: "4px 0 8px", lineHeight: 1 }}>
                    {value}
                  </p>
                  <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: dim, color, fontWeight: 600 }}>
                    {delta}
                  </span>
                </div>
              ))}
            </div>

            {/* ── PROGRESS BAR ──────────────────────────────────────────────── */}
            <div style={{
              background: P.card, border: `1px solid ${P.border}`,
              borderRadius: 12, padding: "14px 20px", marginBottom: 24,
              display: "flex", alignItems: "center", gap: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <span style={{ fontSize: 12, color: P.textSub, fontWeight: 600, whiteSpace: "nowrap" }}>
                Overall Progress
              </span>
              <div style={{ flex: 1, height: 8, background: P.bg1, borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  width: `${pct}%`, height: "100%",
                  background: pct === 100
                    ? P.teal
                    : `linear-gradient(90deg, ${P.purple}, #3B82F6)`,
                  borderRadius: 4, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
                }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: pct === 100 ? P.teal : P.purple, minWidth: 36 }}>
                {pct}%
              </span>
              {pct === 100 && (
                <span style={{ fontSize: 12, color: P.teal, fontWeight: 600 }}>🎉 All done!</span>
              )}
            </div>

            {/* ── EMPTY STATE ───────────────────────────────────────────────── */}
            {total === 0 && (
              <div style={{
                textAlign: "center", padding: "64px 0",
                border: `1px dashed ${P.border}`, borderRadius: 16, background: P.card,
              }}>
                <CheckSquare size={36} color={P.textMute} strokeWidth={1.2} style={{ margin: "0 auto 12px" }} />
                <p style={{ fontSize: 14, color: P.textSub, margin: "0 0 6px", fontWeight: 500 }}>
                  No tasks assigned yet
                </p>
                <p style={{ fontSize: 12, color: P.textMute }}>
                  Your agency will assign tasks here once your project kicks off
                </p>
              </div>
            )}

            {/* ── BOARD ─────────────────────────────────────────────────────── */}
            {/* BoardContainer: consumes all remaining vertical space and acts as
                the height constraint for the board. Without this wrapper the
                board's height:100% has nothing to resolve against. */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
              {total > 0 && isMounted && (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexShrink:0 }}>
                    <p style={{ fontSize: 11, color: P.textSub, letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 600, margin: 0 }}>
                      Your Tasks
                    </p>
                    <span style={{ fontSize: 11, color: P.textMute }}>
                      Click any card to view details & comments
                    </span>
                  </div>

                  <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <div style={{
                      display: "flex", gap: 18,
                      flex: 1,
                      height: "100%",
                      minHeight: 0,
                      overflowX: "auto",
                      overflowY: "hidden",
                      paddingBottom: 24,
                      alignItems: "stretch",
                    }}>
                      {STATUS_ORDER.map(status => (
                        <Column
                          key={status}
                          status={status}
                          tasks={grouped[status] ?? []}
                          nowISO={nowISO}
                          onCardClick={task => setSelectedTask(task as unknown as TaskDetail)}
                        />
                      ))}
                    </div>
                  </DndContext>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Detail Modal — employee can view + comment, read-only status */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          readOnly={true}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}