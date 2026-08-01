import { useMemo, useState } from 'react'
import { collection } from 'firebase/firestore'
import { db } from '../firebase'
import { useCollection } from '../hooks'
import type { CalendarItem, Task, Stage, Project, Meeting } from '../types'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns'
import { ru } from 'date-fns/locale'
import TaskDetail from './TaskDetail'
import MeetingDetail from './MeetingDetail'
import QuickAdd from './QuickAdd'

const dayFmt = (d: Date) => format(d, 'yyyy-MM-dd')

export default function Calendar() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState<{ kind: 'task' | 'meeting'; id: string } | null>(null)
  const [quickDay, setQuickDay] = useState<string | null>(null)

  const tasks = useCollection<Task>(collection(db, 'tasks')) ?? []
  const meetings = useCollection<Meeting>(collection(db, 'meetings')) ?? []
  const stages = useCollection<Stage>(collection(db, 'stages')) ?? []
  const projects = useCollection<Project>(collection(db, 'projects')) ?? []

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])
  const stageById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages])

  const items: CalendarItem[] = useMemo(() => {
    const t: CalendarItem[] = tasks
      .filter((t) => t.deadline)
      .map((t) => {
        const p = projectById.get(t.projectId)
        const s = t.stageId != null ? stageById.get(t.stageId) : null
        return {
          kind: 'task' as const,
          id: t.id,
          title: t.title,
          date: t.deadline!,
          time: null,
          isDone: t.isDone,
          color: p?.color ?? '#8E8E93',
          projectTitle: p?.title,
          stageTitle: s?.title,
        }
      })
    const m: CalendarItem[] = meetings.map((m) => ({
      kind: 'meeting' as const,
      id: m.id,
      title: m.title,
      date: m.date,
      time: m.time,
      isDone: false,
      color: '#007AFF',
    }))
    return [...t, ...m]
  }, [tasks, meetings, projectById, stageById])

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>()
    for (const it of items) {
      const arr = map.get(it.date) ?? []
      arr.push(it)
      map.set(it.date, arr)
    }
    return map
  }, [items])

  const days = useMemo(() => {
    const first = startOfMonth(month)
    const last = endOfMonth(month)
    let pad = first.getDay() - 1
    if (pad < 0) pad = 6
    const s = new Date(first)
    s.setDate(s.getDate() - pad)
    const e = new Date(last)
    const padEnd = 6 - last.getDay()
    if (padEnd > 0) e.setDate(e.getDate() + padEnd)
    else e.setDate(e.getDate() + 7)
    return eachDayOfInterval({ start: s, end: e })
  }, [month])

  const monthLabel = format(month, 'LLLL yyyy', { locale: ru })

  const openTask = (id: string) => setSelected({ kind: 'task', id })
  const openMeeting = (id: string) => setSelected({ kind: 'meeting', id })

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const meetingById = useMemo(() => new Map(meetings.map((m) => [m.id, m])), [meetings])

  const stageOf = (t: Task): Stage | undefined => (t.stageId != null ? stageById.get(t.stageId) : undefined)
  const projectOf = (t: Task): Project | undefined => projectById.get(t.projectId)

  return (
    <div className="page">
      <div className="cal-head">
        <h1 className="page-title">{monthLabel}</h1>
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} title="Предыдущий месяц">
            ‹
          </button>
          <button className="btn" onClick={() => setMonth(startOfMonth(new Date()))}>
            Сегодня
          </button>
          <button className="icon-btn" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} title="Следующий месяц">
            ›
          </button>
        </div>
      </div>

      <div className="calendar">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
          <div key={d} className="cal-dow">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const key = dayFmt(d)
          const dayItems = byDay.get(key) ?? []
          const inMonth = isSameMonth(d, month)
          const today = isToday(d)
          return (
            <div
              key={key}
              className={'cal-day' + (inMonth ? '' : ' muted') + (today ? ' today' : '')}
              onDoubleClick={() => setQuickDay(key)}
            >
              <div className="cal-day-num">{format(d, 'd')}</div>
              <div className="cal-items">
                {dayItems.map((it) => (
                  <button
                    key={it.kind + '-' + it.id}
                    className={'cal-chip ' + (it.isDone ? 'done' : '')}
                    style={{ '--chip': it.color } as React.CSSProperties}
                    onClick={() => (it.kind === 'task' ? openTask(it.id) : openMeeting(it.id))}
                    title={it.title}
                  >
                    <span className="chip-dot" />
                    <span className="chip-text">{it.title}</span>
                  </button>
                ))}
                <button className="cal-add" title="Добавить на этот день" onClick={() => setQuickDay(key)}>
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {quickDay && (
        <QuickAdd
          date={quickDay}
          onClose={() => setQuickDay(null)}
          onTaskCreated={(id) => {
            setQuickDay(null)
            setSelected({ kind: 'task', id })
          }}
          onMeetingCreated={(id) => {
            setQuickDay(null)
            setSelected({ kind: 'meeting', id })
          }}
        />
      )}

      {selected?.kind === 'task' && taskById.get(selected.id) && (
        <TaskDetail
          task={taskById.get(selected.id)!}
          stage={stageOf(taskById.get(selected.id)!)}
          project={projectOf(taskById.get(selected.id)!)}
          onClose={() => setSelected(null)}
          onOpenProject={() => {
            const t = taskById.get(selected.id)!
            window.dispatchEvent(new CustomEvent('open-project', { detail: t.projectId }))
          }}
        />
      )}

      {selected?.kind === 'meeting' && meetingById.get(selected.id) && (
        <MeetingDetail meeting={meetingById.get(selected.id)!} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
