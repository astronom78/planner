import { useState } from 'react'
import type { Meeting } from '../types'
import { updateMeeting, deleteMeeting } from '../actions'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Props {
  meeting: Meeting
  onClose: () => void
}

export default function MeetingDetail({ meeting, onClose }: Props) {
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(meeting.notes)

  const rename = (title: string) => updateMeeting(meeting.id, { title })

  const saveNotes = () => {
    updateMeeting(meeting.id, { notes })
    setEditingNotes(false)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <button className="icon-btn" onClick={onClose} title="Закрыть">
            ✕
          </button>
        </div>

        <input
          className="title-input"
          value={meeting.title}
          onChange={(e) => rename(e.target.value)}
          placeholder="Название встречи"
        />

        <div className="chips">
          <span className="chip chip-meeting">
            {format(new Date(meeting.date + 'T00:00:00'), 'd MMMM yyyy', { locale: ru })}
          </span>
          {meeting.time && <span className="chip chip-meeting">{meeting.time}</span>}
        </div>

        <div className="sheet-section">
          <div className="section-label">Заметки</div>
          {editingNotes ? (
            <>
              <textarea
                className="plain-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Повестка, вопросы, итоги…"
              />
              <div className="sheet-actions">
                <button className="btn" onClick={() => setEditingNotes(false)}>
                  Отмена
                </button>
                <button className="btn primary" onClick={saveNotes}>
                  Готово
                </button>
              </div>
            </>
          ) : meeting.notes ? (
            <p className="plain-text" onDoubleClick={() => setEditingNotes(true)}>
              {meeting.notes}
            </p>
          ) : (
            <button className="btn" onClick={() => setEditingNotes(true)}>
              + Добавить заметку
            </button>
          )}
        </div>

        <div className="sheet-footer">
          <button
            className="btn danger"
            onClick={() => {
              deleteMeeting(meeting.id)
              onClose()
            }}
          >
            Удалить встречу
          </button>
        </div>
      </div>
    </div>
  )
}
