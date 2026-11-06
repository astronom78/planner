import { useEffect, useState } from 'react'
import { query, orderBy } from 'firebase/firestore'
import { userCol } from '../firebase'
import { useCollection } from '../hooks'
import type { Project, Task } from '../types'
import { addProject, PROJECT_COLORS, sortProjects, setProjectPinned, saveProjectOrder } from '../actions'
import ProjectEditor from './ProjectEditor'

export default function Projects() {
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0])
  const [reordering, setReordering] = useState(false)

  const projects = useCollection<Project>(query(userCol('projects'), orderBy('createdAt'))) ?? []
  const tasks = useCollection<Task>(userCol('tasks')) ?? []

  useEffect(() => {
    const listener = (e: Event) => {
      const id = (e as CustomEvent).detail as string
      setOpenId(id)
    }
    window.addEventListener('open-project', listener)
    return () => window.removeEventListener('open-project', listener)
  }, [])

  const open = openId != null ? projects.find((p) => p.id === openId) : null
  if (open) return <ProjectEditor project={open} onBack={() => setOpenId(null)} />

  const active = sortProjects(projects.filter((p) => !p.archived))
  const archived = projects
    .filter((p) => p.archived)
    .sort((a, b) => (b.archivedAt ?? b.createdAt) - (a.archivedAt ?? a.createdAt))

  const submit = () => {
    if (!newTitle.trim()) return
    addProject(newTitle.trim(), newColor).then((p) => {
      setNewTitle('')
      setCreating(false)
      setOpenId(p.id)
    })
  }

  // Двигать можно только внутри своей группы: закреплённые остаются над остальными
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= active.length || !!active[j].pinned !== !!active[i].pinned) return
    const next = [...active]
    ;[next[i], next[j]] = [next[j], next[i]]
    saveProjectOrder(next)
  }

  const progress = (pid: string) => {
    const all = tasks.filter((t) => t.projectId === pid)
    if (all.length === 0) return 0
    return Math.round((all.filter((t) => t.isDone).length / all.length) * 100)
  }

  return (
    <div className="page">
      <div className="cal-head">
        <h1 className="page-title">Проекты</h1>
        <div className="cal-nav">
          {active.length > 1 && (
            <button className={'btn' + (reordering ? ' primary' : '')} onClick={() => setReordering((r) => !r)}>
              {reordering ? 'Готово' : 'Порядок'}
            </button>
          )}
          {!reordering && (
            <button className="btn primary" onClick={() => setCreating(true)}>
              + Новый проект
            </button>
          )}
        </div>
      </div>

      {creating && (
        <div className="overlay" onClick={() => setCreating(false)}>
          <div className="sheet small" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <span className="sheet-title">Новый проект</span>
              <button className="icon-btn" onClick={() => setCreating(false)}>
                ✕
              </button>
            </div>
            <input
              className="text-input"
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Название проекта"
            />
            <div className="color-row">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  className={'color-dot' + (newColor === c ? ' selected' : '')}
                  style={{ background: c }}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
            <div className="sheet-actions">
              <button className="btn primary" onClick={submit} disabled={!newTitle.trim()}>
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="project-list">
        {active.map((p, i) =>
          reordering ? (
            <div key={p.id} className="project-card reorder">
              <div className="card-color" style={{ background: p.color }} />
              <div className="card-body">
                <div className="card-title">{p.title}</div>
              </div>
              <div className="reorder-actions">
                <button
                  className={'icon-btn small pin-btn' + (p.pinned ? ' on' : '')}
                  title={p.pinned ? 'Открепить' : 'Закрепить наверху'}
                  onClick={() => setProjectPinned(p, !p.pinned)}
                >
                  📌
                </button>
                <button
                  className="icon-btn small"
                  title="Выше"
                  disabled={i === 0 || !!active[i - 1].pinned !== !!p.pinned}
                  onClick={() => move(i, -1)}
                >
                  ↑
                </button>
                <button
                  className="icon-btn small"
                  title="Ниже"
                  disabled={i === active.length - 1 || !!active[i + 1].pinned !== !!p.pinned}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </button>
              </div>
            </div>
          ) : (
            <button key={p.id} className="project-card" onClick={() => setOpenId(p.id)}>
              <div className="card-color" style={{ background: p.color }} />
              <div className="card-body">
                <div className="card-title">
                  {p.pinned && <span className="pin-mark" title="Закреплён">📌</span>}
                  {p.title}
                </div>
                <div className="progress-row">
                  <div className="progress-track">
                    <div className="progress-fill" style={{ background: p.color, width: progress(p.id) + '%' }} />
                  </div>
                  <span className="progress-label">{progress(p.id)}%</span>
                </div>
              </div>
            </button>
          ),
        )}
        {active.length === 0 && archived.length === 0 && (
          <div className="empty">
            <p>Пока нет проектов</p>
            <p className="hint">Создайте первый проект, чтобы начать отслеживать этапы работы</p>
          </div>
        )}
        {active.length === 0 && archived.length > 0 && (
          <div className="empty">
            <p>Активных проектов нет</p>
            <p className="hint">Все проекты перенесены в архив — вкладка «🗄 Архив» в шапке</p>
          </div>
        )}
      </div>
    </div>
  )
}
