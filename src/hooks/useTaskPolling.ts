"use client"

import { useEffect, useRef, useCallback } from "react"

export type Priority = "high" | "medium" | "low"
export type ColumnId = "backlog" | "todo" | "inprogress" | "review" | "done"

export interface Task {
  id: string
  _id?: string
  title: string
  description?: string
  priority: Priority
  status: ColumnId
  assignee?: string
  talentId?: string | null
  tags?: string[]
  due?: string
  progress?: number
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

interface UseTaskPollingOptions {
  /** Tasks currently being dragged - these won't be updated during polling */
  draggingTaskIds?: Set<string>
  /** Callback when tasks are updated from polling */
  onTasksUpdate: (tasks: Task[]) => void
  /** Polling interval in milliseconds (default: 6000) */
  interval?: number
  /** Whether polling is enabled (default: true) */
  enabled?: boolean
  /** Optional filter for API query params */
  filterParams?: Record<string, string>
}

export function useTaskPolling({
  draggingTaskIds = new Set(),
  onTasksUpdate,
  interval = 6000,
  enabled = true,
  filterParams = {},
}: UseTaskPollingOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const visibilityHandlerRef = useRef<(() => void) | null>(null)

  // Stabilize filterParams by content, not by object reference
  const filterParamsKey = JSON.stringify(filterParams)

  const fetchTasks = useCallback(async () => {
    try {
      const queryString = new URLSearchParams(filterParams).toString()
      const url = `/api/tasks${queryString ? `?${queryString}` : ""}`
      const response = await fetch(url, {
        headers: { "Cache-Control": "no-cache" },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const tasks: Task[] = await response.json()

      const normalizedTasks = tasks.map((task: any) => ({
        ...task,
        _id: task._id?.toString() ?? task.id,
        id: task._id?.toString() ?? task.id,
        talentId: task.talentId?.toString() ?? task.talentId,
        createdAt: task.createdAt?.toISOString?.() ?? task.createdAt,
        updatedAt: task.updatedAt?.toISOString?.() ?? task.updatedAt,
      }))

      onTasksUpdate(normalizedTasks)
    } catch (error) {
      console.error("[useTaskPolling] Failed to fetch tasks:", error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onTasksUpdate, filterParamsKey])

  useEffect(() => {
    if (!enabled) return

    fetchTasks()
    intervalRef.current = setInterval(fetchTasks, interval)

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      } else {
        if (!intervalRef.current) {
          fetchTasks()
          intervalRef.current = setInterval(fetchTasks, interval)
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    visibilityHandlerRef.current = handleVisibilityChange

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (visibilityHandlerRef.current) {
        document.removeEventListener("visibilitychange", visibilityHandlerRef.current)
      }
    }
  }, [enabled, interval, fetchTasks])

  return {
    refetch: fetchTasks,
  }
}