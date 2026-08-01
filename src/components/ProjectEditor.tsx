import { useMemo, useRef, useState } from 'react'
import { collection, query, where, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { useCollection } from '../hooks'
import type { Project, Task, Stage, Attachment } from '../types'
import {
  addStage,
  addTask,
  updateProject,
  deleteProject,
  deleteStage,
  updateStage,
  addAttachment,
  deleteAttachment,
} from '../actions'
import Editor from './Editor'
import TaskDetail from './TaskDetail'
import TaskRow, { sortTasks } from './TaskRow'

interface Props {
  project: Project
  onBack: () => void
}

export default function ProjectEditor({ project, onBack }: Props) {
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(project.notes)
  const [newStage, setNewStage] = useState(false)
  const [stageTitle, setStageTitle] = useState('')
  const [addingToStage, setAddingToStage] = useState<string | 'none' | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDeadline, setNewTaskDeadline] = useState('')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const stages = useCollection<Stage>(query(collection(db, 'stages'), where('projectId', '==', project.id), orderBy('order'))) ?? []
  const tasks = useCollection<Task>(query(collection(db, 'tasks'), where('projectId', '==', project.id))) ?? []
  const attachments = useCollection<Attachment>(query(collection(db, 'attachments'), where('projectId', '==', project.id))) ?? []

  const tasksByStage = useMemo(() => {
    const map = new Map<string | 'none', Task[]>()
    for (const t of tasks) map.set(t.stageId ?? 'none', [...(map.get(t.stageId ?? 'none') ?? []), t])
    for (const list of map.values()) list.sort(sortTasks)
    return map
  }, [tasks])

  const progress = tasks.length ? Math.round((tasks.filter((t) => t.isDone).length / tasks.length) * 100) : 0
  const doneTasks = tasks.filter((t) => t.isDone).length

  const submitStage = () => {
    if (!stageTitle.trim()) return
    addStage(project.id, stageTitle.trim(), stages.length).then(() => {
      setStageTitle('')
      setNewStage(false)
    })
  }

  const submitTask = (stageId: string | 'none') => {
    if (!newTaskTitle.trim()) return
    addTask({
      projectId: project.id,
      stageId: stageId === 'none' ? null : stageId,
      title: newTaskTitle.trim(),
      notes: '',
      deadline: newTaskDeadline || null,
      isDone: false,
    }).then(() => {
      setNewTaskTitle('')
      setNewTaskDeadline('')
      setAddingToStage(null)
    })
  }

  const saveNotes = () => {
    updateProject(project.id, { notes })
    setEditingNotes(false)
  }

  const onFiles = (files: FileList | null) => {
    if (!files) return
    for (const f of Array.from(files)) {
      addAttachment({ taskId: null, projectId: project.id, name: f.name, mime: f.type || 'application/octet-stream', blob: f })
    }
  }

  const stageFor = (t: Task) => (t.stageId != null ? stages.find((s) => s.id === t.stageId) : undefined)

  return (
    <div className="page">
      <div className="cal-head">
        <button className="icon-btn" onClick={onBack} title="Назад">
          ‹
        </button>
        <h1 className="page-title project-title">
          <span className="chip-dot" style={{ '--chip': project.color } as React.CSSProperties} />
          <input
            className="title-input inline"
            value={project.title}
            onChange={(e) => updateProject(project.id, { title: e.target.value })}
          />
        </h1>
        <div className="progress-pill">
          {doneTasks}/{tasks.length} · {progress}%
        </div>
      </div>

      <div className="progress-track wide">
        <div className="progress-fill" style={{ background: project.color, width: progress + '%' }} />
      </div>

      <section className="project-section">
        <div className="section-label">
          Заметки проекта
          {!editingNotes && !project.notes && (
            <button className="btn" onClick={() => setEditingNotes(true)}>
              + Добавить
            </button>
          )}
        </div>
        {editingNotes ? (
          <>
            <Editor content={notes} onChange={setNotes} placeholder="Что важно знать о проекте…" />
            <div className="sheet-actions">
              <button className="btn" onClick={() => setEditingNotes(false)}>
                Отмена
              </button>
              <button className="btn primary" onClick={saveNotes}>
                Готово
              </button>
            </div>
          </>
        ) : project.notes ? (
          <>
            <div className="rich-preview" dangerouslySetInnerHTML={{ __html: project.notes }} />
            <button className="btn" onClick={() => { setNotes(project.notes); setEditingNotes(true) }}>
              Редактировать
            </button>
          </>
        ) : null}
      </section>

      <section className="project-section">
        <div className="section-label">Этапы</div>
        <div className="stages">
          {stages.map((s, i) => {
            const stageTasks = tasksByStage.get(s.id) ?? []
            return (
              <div key={s.id} className={'stage' + (s.isDone ? ' done' : '')}>
                <div className="stage-head">
                  <span className="stage-num" style={{ background: s.isDone ? '#34C759' : project.color }}>
                    {s.isDone ? '✓' : i + 1}
                  </span>
                  <input
                    className="stage-title-input"
                    value={s.title}
                    onChange={(e) => updateStage(s.id, { title: e.target.value })}
                  />
                  <button
                    className="icon-btn small"
                    title={s.isDone ? 'Этап в работе' : 'Завершить этап'}
                    onClick={() => updateStage(s.id, { isDone: !s.isDone })}
                  >
                    {s.isDone ? '↺' : '✓'}
                  </button>
                  <button className="icon-btn small" title="Удалить этап" onClick={() => deleteStage(s.id)}>
                    ✕
                  </button>
                </div>
                <div className="stage-tasks">
                  {stageTasks.map((t) => (
                    <TaskRow key={t.id} task={t} onOpen={setSelectedTask} />
                  ))}
                  {stageTasks.length === 0 && <div className="stage-empty">Нет задач</div>}
                  {addingToStage === s.id ? (
                    <div className="inline-add">
                      <input
                        className="text-input"
                        autoFocus
                        placeholder="Название задачи"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submitTask(s.id)}
                      />
                      <input
                        className="text-input date"
                        type="date"
                        value={newTaskDeadline}
                        onChange={(e) => setNewTaskDeadline(e.target.value)}
                      />
                      <button className="btn primary" onClick={() => submitTask(s.id)}>
                        +
                      </button>
                    </div>
                  ) : (
                    <button className="add-mini" onClick={() => { setAddingToStage(s.id); setNewTaskTitle(''); setNewTaskDeadline('') }}>
                      + Задача
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          <div className="stage-plain">
            <div className="stage-tasks">
              {(tasksByStage.get('none') ?? []).map((t) => (
                <TaskRow key={t.id} task={t} onOpen={setSelectedTask} />
              ))}
              {addingToStage === 'none' ? (
                <div className="inline-add">
                  <input
                    className="text-input"
                    autoFocus
                    placeholder="Название задачи"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitTask('none')}
                  />
                  <input
                    className="text-input date"
                    type="date"
                    value={newTaskDeadline}
                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                  />
                  <button className="btn primary" onClick={() => submitTask('none')}>
                    +
                  </button>
                </div>
              ) : (
                <button className="add-mini" onClick={() => { setAddingToStage('none'); setNewTaskTitle(''); setNewTaskDeadline('') }}>
                  + Задача без этапа
                </button>
              )}
            </div>
          </div>

          {newStage ? (
            <div className="inline-add stage-add">
              <input
                className="text-input"
                autoFocus
                placeholder="Название этапа"
                value={stageTitle}
                onChange={(e) => setStageTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitStage()}
              />
              <button className="btn primary" onClick={submitStage}>
                +
              </button>
            </div>
          ) : (
            <button className="add-mini" onClick={() => setNewStage(true)}>
              + Этап
            </button>
          )}
        </div>
      </section>

      <section className="project-section">
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
      </section>

      <div className="sheet-footer">
        <button
          className="btn danger"
          onClick={() => {
            if (confirm('Удалить проект и все его этапы, задачи и вложения?')) {
              deleteProject(project.id).then(onBack)
            }
          }}
        >
          Удалить проект
        </button>
      </div>

      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          stage={stageFor(selectedTask)}
          project={project}
          onClose={() => setSelectedTask(null)}
          onOpenProject={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}
