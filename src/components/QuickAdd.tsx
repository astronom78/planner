import { useState } from 'react'
import { collection, query, where, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { useCollection } from '../hooks'
import type { Project, Stage } from '../types'
import { addTask, addMeeting } from '../actions'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Props {
  date: string
  onClose: () => void
  onTaskCreated: (id: string) => void
  onMeetingCreated: (id: string) => void
}

export default function QuickAdd({ date, onClose, onTaskCreated, onMeetingCreated }: Props) {
  const [mode, setMode] = useState<'task' | 'meeting'>('task')
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [stageId, setStageId] = useState<string | null>(null)
  const [time, setTime] = useState('')

  const projects = useCollection<Project>(collection(db, 'projects')) ?? []
  const stages = useCollection<Stage>(
    projectId ? query(collection(db, 'stages'), where('projectId', '==', projectId), orderBy('order')) : null,
    [projectId],
  ) ?? []

  const submit = () => {
    if (!title.trim()) return
    if (mode === 'task') {
      const pid = projectId ?? projects[0]?.id ?? null
      if (pid == null) {
        alert('Сначала создайте проект на вкладке «Проекты»')
        return
      }
      addTask({ projectId: pid, stageId, title: title.trim(), notes: '', deadline: date, isDone: false }).then(onTaskCreated)
    } else {
      addMeeting({ title: title.trim(), date, time: time || null, notes: '' }).then(onMeetingCreated)
    }
  }

  const dateLabel = format(new Date(date + 'T00:00:00'), 'd MMMM', { locale: ru })

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet small" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-title">{dateLabel}</span>
          <button className="icon-btn" onClick={onClose} title="Закрыть">
            ✕
          </button>
        </div>

        <div className="segmented">
          <button className={'seg' + (mode === 'task' ? ' active' : '')} onClick={() => setMode('task')}>
            Задача
          </button>
          <button className={'seg' + (mode === 'meeting' ? ' active' : '')} onClick={() => setMode('meeting')}>
            Встреча
          </button>
        </div>

        <input
          className="text-input"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={mode === 'task' ? 'Что нужно сделать?' : 'О чём встреча?'}
        />

        {mode === 'task' && (
          <div className="field">
            <select className="text-input" value={projectId ?? ''} onChange={(e) => setProjectId(e.target.value || null)}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            {stages.length > 0 && (
              <select className="text-input" value={stageId ?? ''} onChange={(e) => setStageId(e.target.value || null)}>
                <option value="">Без этапа</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {mode === 'meeting' && (
          <input className="text-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        )}

        <div className="sheet-actions">
          <button className="btn primary" onClick={submit} disabled={!title.trim()}>
            Добавить
          </button>
        </div>
      </div>
    </div>
  )
}
