import { useState } from 'react'
import { collection, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { useCollection } from '../hooks'
import type { Project, Task } from '../types'
import { unarchiveProject } from '../actions'
import ProjectEditor from './ProjectEditor'

const archivedDate = (ts?: number | null) =>
  ts ? new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

export default function Archive() {
  const [openId, setOpenId] = useState<string | null>(null)

  const projects = useCollection<Project>(query(collection(db, 'projects'), orderBy('createdAt'))) ?? []
  const tasks = useCollection<Task>(collection(db, 'tasks')) ?? []

  const open = openId != null ? projects.find((p) => p.id === openId) : null
  if (open) return <ProjectEditor project={open} onBack={() => setOpenId(null)} />

  const archived = projects
    .filter((p) => p.archived)
    .sort((a, b) => (b.archivedAt ?? b.createdAt) - (a.archivedAt ?? a.createdAt))

  const progress = (pid: string) => {
    const all = tasks.filter((t) => t.projectId === pid)
    if (all.length === 0) return 0
    return Math.round((all.filter((t) => t.isDone).length / all.length) * 100)
  }

  return (
    <div className="page">
      <div className="cal-head">
        <h1 className="page-title">Архив</h1>
        {archived.length > 0 && <div className="progress-pill">В архиве: {archived.length}</div>}
      </div>

      {archived.length === 0 ? (
        <div className="empty">
          <p>Архив пуст</p>
          <p className="hint">
            Завершённые проекты прячутся кнопкой «🗄 В архив» внизу страницы проекта —
            <br />
            задачи, этапы и файлы при этом сохраняются
          </p>
        </div>
      ) : (
        <div className="project-list">
          {archived.map((p) => (
            <div key={p.id} className="project-card archived">
              <div className="card-color" style={{ background: p.color }} />
              <div className="card-body">
                <div className="card-title">{p.title}</div>
                <div className="progress-row">
                  <div className="progress-track">
                    <div className="progress-fill" style={{ background: p.color, width: progress(p.id) + '%' }} />
                  </div>
                  <span className="progress-label">{progress(p.id)}%</span>
                </div>
                <div className="card-meta">Архивирован {archivedDate(p.archivedAt)}</div>
              </div>
              <div className="archive-actions">
                <button className="btn" onClick={() => setOpenId(p.id)}>
                  Открыть
                </button>
                <button
                  className="btn primary"
                  onClick={() => unarchiveProject(p.id)}
                  title="Вернуть проект в список «Проекты»"
                >
                  Вернуть
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
