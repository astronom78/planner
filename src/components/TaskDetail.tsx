import { useRef, useState } from 'react'
import { collection, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useCollection } from '../hooks'
import type { Task, Stage, Project, Attachment } from '../types'
import { updateTask, deleteTask, addAttachment, deleteAttachment } from '../actions'
import Editor from './Editor'

interface Props {
  task: Task
  stage?: Stage
  project?: Project
  onClose: () => void
  onOpenProject: () => void
}

export default function TaskDetail({ task, stage, project, onClose, onOpenProject }: Props) {
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(task.notes)
  const fileRef = useRef<HTMLInputElement>(null)

  const attachments =
    useCollection<Attachment>(query(collection(db, 'attachments'), where('taskId', '==', task.id)), [task.id]) ?? []

  const setDone = (v: boolean) => updateTask(task.id, { isDone: v })
  const rename = (title: string) => updateTask(task.id, { title })

  const saveNotes = () => {
    updateTask(task.id, { notes })
    setEditingNotes(false)
  }

  const onFiles = (files: FileList | null) => {
    if (!files) return
    for (const f of Array.from(files)) {
      addAttachment({ taskId: task.id, projectId: null, name: f.name, mime: f.type || 'application/octet-stream', blob: f })
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <button className="icon-btn" onClick={onClose} title="Закрыть">
            ✕
          </button>
          {project && (
            <button className="btn" onClick={onOpenProject}>
              В проекте
            </button>
          )}
        </div>

        <div className="task-row">
          <input
            type="checkbox"
            className="check"
            checked={task.isDone}
            onChange={(e) => setDone(e.target.checked)}
          />
          <input
            className="title-input"
            value={task.title}
            onChange={(e) => rename(e.target.value)}
            placeholder="Название задачи"
          />
        </div>

        <div className="chips">
          {project && (
            <span className="chip" style={{ '--chip': project.color } as React.CSSProperties}>
              <span className="chip-dot" />
              {project.title}
            </span>
          )}
          {stage && <span className="chip chip-stage">Этап: {stage.title}</span>}
        </div>

        <div className="sheet-section">
          <div className="section-label">Дедлайн</div>
          <div className="deadline-edit">
            <input
              type="date"
              className="text-input date"
              value={task.deadline ?? ''}
              onChange={(e) => updateTask(task.id, { deadline: e.target.value || null })}
            />
            {task.deadline && (
              <button className="btn" onClick={() => updateTask(task.id, { deadline: null })}>
                Убрать дату
              </button>
            )}
          </div>
        </div>

        <div className="sheet-section">
          <div className="section-label">Заметки</div>
          {editingNotes ? (
            <>
              <Editor content={notes} onChange={setNotes} placeholder="Заметки по задаче…" />
              <div className="sheet-actions">
                <button className="btn" onClick={() => setEditingNotes(false)}>
                  Отмена
                </button>
                <button className="btn primary" onClick={saveNotes}>
                  Готово
                </button>
              </div>
            </>
          ) : task.notes ? (
            <>
              <div className="rich-preview" dangerouslySetInnerHTML={{ __html: task.notes }} />
              <button className="btn" onClick={() => setEditingNotes(true)}>
                Редактировать
              </button>
            </>
          ) : (
            <button className="btn" onClick={() => setEditingNotes(true)}>
              + Добавить заметку
            </button>
          )}
        </div>

        <div className="sheet-section">
          <div className="section-label">Вложения</div>
          <div className="attachments">
            {attachments.map((a) => (
              <div key={a.id} className="attachment">
                {a.mime.startsWith('image/') ? (
                  <img className="thumb" src={a.url} alt={a.name} onClick={() => window.open(a.url, '_blank')} />
                ) : (
                  <button className="file-chip" onClick={() => window.open(a.url, '_blank')} title={a.name}>
                    📄 {a.name}
                  </button>
                )}
                <button className="icon-btn small" title="Удалить" onClick={() => deleteAttachment(a.id)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          <button className="btn" onClick={() => fileRef.current?.click()}>
            + Прикрепить файл
          </button>
        </div>

        <div className="sheet-footer">
          <button className="btn danger" onClick={() => { deleteTask(task.id); onClose() }}>
            Удалить задачу
          </button>
        </div>
      </div>
    </div>
  )
}
