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
  clientId?: string | null
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

  const fetchTasks = useCallback(async () => {
    try {
      // Build query string from filter params
      const queryString = new URLSearchParams(filterParams).toString()
      const url = `/api/tasks${queryString ? `?${queryString}` : ""}`
      
      const response = await fetch(url, {
        headers: { "Cache-Control": "no-cache" },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const tasks: Task[] = await response.json()

      // Normalize task data (convert _id to string if needed)
      const normalizedTasks = tasks.map((task: any) => ({
        ...task,
        _id: task._id?.toString() ?? task.id,
        id: task._id?.toString() ?? task.id,
        clientId: task.clientId?.toString() ?? task.clientId,
        createdAt: task.createdAt?.toISOString?.() ?? task.createdAt,
        updatedAt: task.updatedAt?.toISOString?.() ?? task.updatedAt,
      }))

      onTasksUpdate(normalizedTasks)
    } catch (error) {
      console.error("[useTaskPolling] Failed to fetch tasks:", error)
    }
  }, [onTasksUpdate, filterParams])

  useEffect(() => {
    if (!enabled) return

    // Initial fetch
    fetchTasks()

    // Set up polling interval
    intervalRef.current = setInterval(fetchTasks, interval)

    // Handle visibility change - pause when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - clear interval to save resources
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      } else {
        // Tab is visible again - resume polling and fetch immediately
        if (!intervalRef.current) {
          fetchTasks()
          intervalRef.current = setInterval(fetchTasks, interval)
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    visibilityHandlerRef.current = handleVisibilityChange

    // Cleanup on unmount
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