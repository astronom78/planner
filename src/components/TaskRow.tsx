import { useState } from 'react'
import type { Task } from '../types'
import { updateTask } from '../actions'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Props {
  task: Task
  onOpen: (t: Task) => void
}

export function sortTasks(a: Task, b: Task): number {
  if (a.isDone !== b.isDone) return a.isDone ? 1 : -1
  if (a.deadline && b.deadline) return a.deadline < b.deadline ? -1 : 1
  if (a.deadline) return -1
  if (b.deadline) return 1
  return 0
}

export default function TaskRow({ task, onOpen }: Props) {
  const [editingDate, setEditingDate] = useState(false)
  const [date, setDate] = useState(task.deadline ?? '')

  const commitDate = () => {
    updateTask(task.id, { deadline: date || null })
    setEditingDate(false)
  }

  return (
    <button
      className={'task-row task-btn' + (task.isDone ? ' done' : '')}
      onClick={() => onOpen(task)}
    >
      <input
        type="checkbox"
        className="check"
        checked={task.isDone}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => updateTask(task.id, { isDone: e.target.checked })}
      />
      <span className="task-title">{task.title}</span>
      {editingDate ? (
        <span className="date-edit" onClick={(e) => e.stopPropagation()}>
          <input
            type="date"
            autoFocus
            className="text-input date date-input-mini"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onBlur={commitDate}
            onKeyDown={(e) => e.key === 'Enter' && commitDate()}
          />
          {date && (
            <button className="icon-btn small" title="Убрать дату" onMouseDown={() => { setDate(''); commitDate() }}>
              ✕
            </button>
          )}
        </span>
      ) : task.deadline ? (
        <span
          className="chip chip-deadline mini date-chip"
          onClick={(e) => {
            e.stopPropagation()
            setDate(task.deadline ?? '')
            setEditingDate(true)
          }}
          title="Изменить дату"
        >
          {format(new Date(task.deadline + 'T00:00:00'), 'd MMM', { locale: ru })}
        </span>
      ) : (
        <span
          className="chip chip-date-add mini"
          onClick={(e) => {
            e.stopPropagation()
            setEditingDate(true)
          }}
          title="Добавить дату"
        >
          + дата
        </span>
      )}
    </button>
  )
}
