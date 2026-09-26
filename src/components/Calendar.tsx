import { useMemo, useState, useRef, useEffect } from 'react'
import { collection } from 'firebase/firestore'
import { db } from '../firebase'
import { useCollection } from '../hooks'
import type { CalendarItem, Task, Stage, Project, Meeting } from '../types'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns'
import { ru } from 'date-fns/locale'
import TaskDetail from './TaskDetail'
import MeetingDetail from './MeetingDetail'
import QuickAdd from './QuickAdd'
import { updateTask, updateMeeting } from '../actions'

const dayFmt = (d: Date) => format(d, 'yyyy-MM-dd')

const itemKey = (it: CalendarItem) => it.kind + '-' + it.id

interface DragSession {
  item: CalendarItem
  chip: HTMLElement
  ghost: HTMLElement
  pointerId: number
  startX: number
  startY: number
  armed: boolean
  cancelled: boolean
  timer: number | null
  dropDate: string | null
  move: (e: PointerEvent) => void
  up: (e: PointerEvent) => void
  cancel: (e: PointerEvent) => void
  keydown: (e: KeyboardEvent) => void
}

function DayCell({
  items,
  dateKey,
  inMonth,
  today,
  dropTarget,
  dragKey,
  onOpenTask,
  onOpenMeeting,
  onQuickAdd,
  onChipPointerDown,
}: {
  items: CalendarItem[]
  dateKey: string
  inMonth: boolean
  today: boolean
  dropTarget: boolean
  dragKey: string | null
  onOpenTask: (id: string) => void
  onOpenMeeting: (id: string) => void
  onQuickAdd: (key: string) => void
  onChipPointerDown: (e: React.PointerEvent<HTMLButtonElement>, item: CalendarItem) => void
}) {
  const dayRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(items.length)

  useEffect(() => {
    const dayEl = dayRef.current
    if (!dayEl || items.length === 0) return

    const measure = () => {
      const isMobile = window.innerWidth <= 760
      const dayNum = dayEl.querySelector<HTMLElement>('.cal-day-num')
      const dayNumH = dayNum ? dayNum.offsetHeight + 4 : 0
      const maxH = (isMobile ? 88 : 126) - 12
      const availH = maxH - dayNumH

      const hidden = document.createElement('div')
      hidden.style.cssText = 'position:absolute;visibility:hidden;height:auto;display:flex;flex-direction:column;gap:3px;align-items:stretch;width:' + dayEl.clientWidth + 'px'
      const chipClass = 'cal-chip'
      for (const it of items) {
        const btn = document.createElement('button')
        btn.className = chipClass + (it.isDone ? ' done' : '')
        btn.innerHTML = '<span class="chip-dot"></span><span class="chip-text">' + it.title + '</span>'
        hidden.appendChild(btn)
      }
      dayEl.appendChild(hidden)

      let count = 0
      let used = 0
      const children = hidden.children
      for (let i = 0; i < children.length; i++) {
        const h = (children[i] as HTMLElement).getBoundingClientRect().height
        if (used + h > availH) break
        used += h + 3
        count++
      }
      dayEl.removeChild(hidden)

      if (count < 1 && items.length > 0) count = 1
      if (count >= items.length) count = items.length
      setVisibleCount(count)
    }

    measure()

    const ro = new ResizeObserver(measure)
    ro.observe(dayEl)
    return () => ro.disconnect()
  }, [items])

  const hidden = items.length - visibleCount
  const cls =
    'cal-day' +
    (inMonth ? '' : ' muted') +
    (today ? ' today' : '') +
    (dropTarget ? ' drop-target' : '')

  return (
    <div ref={dayRef} className={cls} data-date={dateKey} onDoubleClick={() => onQuickAdd(dateKey)}>
      <div className="cal-day-num">{format(new Date(dateKey + 'T00:00:00'), 'd')}</div>
      <div className="cal-items">
        {items.slice(0, visibleCount).map((it) => (
          <button
            key={itemKey(it)}
            className={'cal-chip ' + (it.isDone ? 'done' : '') + (dragKey === itemKey(it) ? ' dragging' : '')}
            style={{ '--chip': it.color } as React.CSSProperties}
            onPointerDown={(e) => onChipPointerDown(e, it)}
            onClick={() => (it.kind === 'task' ? onOpenTask(it.id) : onOpenMeeting(it.id))}
            title={it.title}
          >
            <span className="chip-dot" />
            <span className="chip-text">{it.title}</span>
          </button>
        ))}
        {hidden > 0 && (
          <button className="cal-overflow" onClick={() => onQuickAdd(dateKey)}>
            +{hidden} ещё
          </button>
        )}
        <button className="cal-add" title="Добавить на этот день" onClick={() => onQuickAdd(dateKey)}>
          +
        </button>
      </div>
    </div>
  )
}

export default function Calendar() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState<{ kind: 'task' | 'meeting'; id: string } | null>(null)
  const [quickDay, setQuickDay] = useState<string | null>(null)
  const [dragKey, setDragKey] = useState<string | null>(null)
  const [dropDate, setDropDate] = useState<string | null>(null)
  const dragRef = useRef<DragSession | null>(null)
  const suppressClickRef = useRef(false)
  const endDragRef = useRef<() => void>(() => {})

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

  const endDrag = () => {
    const s = dragRef.current
    if (!s) return
    if (s.timer) window.clearTimeout(s.timer)
    window.removeEventListener('pointermove', s.move)
    window.removeEventListener('pointerup', s.up)
    window.removeEventListener('pointercancel', s.cancel)
    window.removeEventListener('keydown', s.keydown)
    s.ghost.remove()
    s.chip.style.touchAction = ''
    s.chip.classList.remove('dragging')
    document.body.style.userSelect = ''
    dragRef.current = null
    setDragKey(null)
    setDropDate(null)
  }
  endDragRef.current = endDrag

  useEffect(() => {
    return () => endDragRef.current()
  }, [])

  const applyDrop = (item: CalendarItem, date: string) => {
    if (item.kind === 'task') updateTask(item.id, { deadline: date })
    else updateMeeting(item.id, { date })
  }

  const onChipPointerDown = (e: React.PointerEvent<HTMLButtonElement>, item: CalendarItem) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    endDrag()
    suppressClickRef.current = false

    const chip = e.currentTarget
    const ghost = chip.cloneNode(true) as HTMLElement
    ghost.classList.add('drag-ghost')
    ghost.style.width = chip.getBoundingClientRect().width + 'px'

    const arm = (x: number, y: number) => {
      const s = dragRef.current
      if (!s || s.armed) return
      s.armed = true
      if (s.timer) window.clearTimeout(s.timer)
      s.timer = null
      s.chip.style.touchAction = 'none'
      s.chip.classList.add('dragging')
      document.body.style.userSelect = 'none'
      suppressClickRef.current = true
      ghost.style.left = x + 'px'
      ghost.style.top = y + 'px'
      document.body.appendChild(ghost)
      try {
        chip.setPointerCapture(s.pointerId)
      } catch {
        /* захват не обязателен */
      }
      setDragKey(itemKey(item))
      navigator.vibrate?.(10)
    }

    const handleMove = (ev: PointerEvent) => {
      const s = dragRef.current
      if (!s || ev.pointerId !== s.pointerId || s.cancelled) return
      const dist = Math.hypot(ev.clientX - s.startX, ev.clientY - s.startY)
      if (!s.armed) {
        if (ev.pointerType === 'mouse') {
          if (dist <= 5) return
          arm(ev.clientX, ev.clientY)
        } else {
          // сенсор: длинное нажатие, а движение — это прокрутка
          if (dist > 10) {
            if (s.timer) window.clearTimeout(s.timer)
            s.timer = null
            s.cancelled = true
          }
          return
        }
      }
      ev.preventDefault()
      ghost.style.left = ev.clientX + 'px'
      ghost.style.top = ev.clientY + 'px'
      const under = document.elementFromPoint(ev.clientX, ev.clientY)
      const day = under instanceof Element ? under.closest('.cal-day') : null
      const date = day instanceof HTMLElement ? (day.dataset.date ?? null) : null
      if (date !== s.dropDate) {
        s.dropDate = date
        setDropDate(date)
      }
    }

    const handleUp = (ev: PointerEvent) => {
      const s = dragRef.current
      if (!s || ev.pointerId !== s.pointerId) return
      const wasArmed = s.armed
      const target = s.dropDate
      const dragged = s.item
      endDrag()
      if (!wasArmed) return
      suppressClickRef.current = true
      if (target && target !== dragged.date) applyDrop(dragged, target)
    }

    const handleCancel = (ev: PointerEvent) => {
      const s = dragRef.current
      if (!s || ev.pointerId !== s.pointerId) return
      if (s.armed) suppressClickRef.current = true
      endDrag()
    }

    const handleKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return
      const s = dragRef.current
      if (!s) return
      if (s.armed) suppressClickRef.current = true
      endDrag()
    }

    const session: DragSession = {
      item,
      chip,
      ghost,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      armed: false,
      cancelled: false,
      timer: null,
      dropDate: null,
      move: handleMove,
      up: handleUp,
      cancel: handleCancel,
      keydown: handleKey,
    }
    dragRef.current = session

    if (e.pointerType !== 'mouse') {
      session.timer = window.setTimeout(() => {
        const s = dragRef.current
        if (s && !s.cancelled) arm(s.startX, s.startY)
      }, 400)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleCancel)
    window.addEventListener('keydown', handleKey)
  }

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

      <div
        className="calendar"
        onClickCapture={(e) => {
          // подавляем клик, который браузер генерирует после перетаскивания
          if (suppressClickRef.current) {
            suppressClickRef.current = false
            e.preventDefault()
            e.stopPropagation()
          }
        }}
      >
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
          <div key={d} className="cal-dow">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const key = dayFmt(d)
          const dayItems = byDay.get(key) ?? []
          const inMonth = isSameMonth(d, month)
          const todayCheck = isToday(d)
          return (
            <DayCell
              key={key}
              items={dayItems}
              dateKey={key}
              inMonth={inMonth}
              today={todayCheck}
              dropTarget={dropDate === key}
              dragKey={dragKey}
              onOpenTask={openTask}
              onOpenMeeting={openMeeting}
              onQuickAdd={setQuickDay}
              onChipPointerDown={onChipPointerDown}
            />
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
