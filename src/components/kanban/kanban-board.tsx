"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { useTasks } from "@/components/providers/tasks-provider";
import { TASK_STATUSES } from "@/lib/constants";
import type { Task, TaskStatus } from "@/lib/types/database";

export function KanbanBoard() {
  const { tasks, moveTask, reorderTasks } = useTasks();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const getColumnTasks = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status),
    [tasks]
  );

  // Find which column a task or droppable ID belongs to
  const findColumn = useCallback(
    (id: string): TaskStatus | null => {
      if (TASK_STATUSES.includes(id as TaskStatus)) return id as TaskStatus;
      const task = tasks.find((t) => t.id === id);
      return (task?.status as TaskStatus) ?? null;
    },
    [tasks]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t.id === event.active.id);
      setActiveTask(task ?? null);
    },
    [tasks]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over) {
        setOverColumn(null);
        return;
      }
      const column = findColumn(over.id as string);
      setOverColumn(column);
    },
    [findColumn]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      setOverColumn(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const sourceColumn = findColumn(activeId);
      const destColumn = findColumn(overId);

      if (!sourceColumn || !destColumn) return;

      if (sourceColumn === destColumn) {
        // Same column reorder
        const columnTasks = [...getColumnTasks(sourceColumn)].sort(
          (a, b) => a.sort_order - b.sort_order
        );
        const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
        const newIndex = columnTasks.findIndex((t) => t.id === overId);

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

        const reordered = [...columnTasks];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);
        reorderTasks(sourceColumn, reordered.map((t) => t.id));
      } else {
        // Cross-column move: use moveTask first (handles status + completed_at),
        // then sequentially reorder both columns
        const destTasks = [...getColumnTasks(destColumn)].sort(
          (a, b) => a.sort_order - b.sort_order
        );

        let newIndex = destTasks.length;
        const overTaskIndex = destTasks.findIndex((t) => t.id === overId);
        if (overTaskIndex !== -1) {
          newIndex = overTaskIndex;
        }

        // 1. Move task to new column (awaited — completes before reorder)
        await moveTask(activeId, destColumn, newIndex);

        // 2. Re-index destination column (including the moved task)
        const newDestOrder = [...destTasks];
        newDestOrder.splice(newIndex, 0, { id: activeId } as Task);
        await reorderTasks(destColumn, newDestOrder.map((t) => t.id));

        // 3. Re-index source column
        const sourceTasks = getColumnTasks(sourceColumn)
          .filter((t) => t.id !== activeId)
          .sort((a, b) => a.sort_order - b.sort_order);
        if (sourceTasks.length > 0) {
          await reorderTasks(sourceColumn, sourceTasks.map((t) => t.id));
        }
      }
    },
    [findColumn, getColumnTasks, moveTask, reorderTasks]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 h-full">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={getColumnTasks(status)}
            isOver={overColumn === status}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div style={{ opacity: 0.9 }}>
            <KanbanCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
