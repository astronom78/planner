import { useEffect } from 'react'
import { query, orderBy } from 'firebase/firestore'
import { spacesCol, MAIN_SPACE } from '../firebase'
import { useCollection } from '../hooks'
import type { Space } from '../types'
import { addSpace, renameSpace, deleteSpace, PROJECT_COLORS } from '../actions'

interface Props {
  space: string
  onSelect: (id: string) => void
}

const MAIN_COLOR = '#FF6B3D'

export default function Sidebar({ space, onSelect }: Props) {
  const spaces = useCollection<Space>(query(spacesCol(), orderBy('createdAt')))

  // Сохранённый планер могли удалить (в том числе на другом устройстве) — возвращаемся в личный
  useEffect(() => {
    if (spaces && space !== MAIN_SPACE && !spaces.some((s) => s.id === space)) onSelect(MAIN_SPACE)
  }, [spaces, space, onSelect])

  const create = () => {
    const title = prompt('Название нового планера', (spaces ?? []).length === 0 ? 'Универ' : '')?.trim()
    if (!title) return
    const color = PROJECT_COLORS[((spaces ?? []).length * 5 + 2) % PROJECT_COLORS.length]
    addSpace(title, color).then(onSelect)
  }

  const rename = (s: Space) => {
    const title = prompt('Новое название планера', s.title)?.trim()
    if (title && title !== s.title) renameSpace(s.id, title)
  }

  const remove = (s: Space) => {
    if (!confirm(`Удалить планер «${s.title}» со всеми его проектами, задачами и встречами?`)) return
    onSelect(MAIN_SPACE)
    deleteSpace(s.id)
  }

  return (
    <nav className="sidebar">
      <div className="side-label">Планеры</div>
      <button
        className={'side-item' + (space === MAIN_SPACE ? ' active' : '')}
        onClick={() => onSelect(MAIN_SPACE)}
      >
        <span className="side-dot" style={{ background: MAIN_COLOR }} />
        <span className="side-title">Личный</span>
      </button>
      {(spaces ?? []).map((s) => (
        <div key={s.id} className={'side-item' + (space === s.id ? ' active' : '')} onClick={() => onSelect(s.id)}>
          <span className="side-dot" style={{ background: s.color }} />
          <span className="side-title">{s.title}</span>
          {space === s.id && (
            <span className="side-actions">
              <button
                className="icon-btn small"
                title="Переименовать"
                onClick={(e) => {
                  e.stopPropagation()
                  rename(s)
                }}
              >
                ✎
              </button>
              <button
                className="icon-btn small"
                title="Удалить планер"
                onClick={(e) => {
                  e.stopPropagation()
                  remove(s)
                }}
              >
                ✕
              </button>
            </span>
          )}
        </div>
      ))}
      <button className="side-add" onClick={create}>
        + Новый планер
      </button>
    </nav>
  )
}
