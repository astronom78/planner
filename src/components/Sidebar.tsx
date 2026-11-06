import { useEffect, useState } from 'react'
import { query, orderBy, onSnapshot } from 'firebase/firestore'
import { spacesCol, userRootDoc, MAIN_SPACE } from '../firebase'
import { useCollection } from '../hooks'
import type { Space } from '../types'
import {
  addSpace,
  renameSpace,
  deleteSpace,
  setSpaceColor,
  setMainSpaceColor,
  PROJECT_COLORS,
} from '../actions'

interface Props {
  space: string
  onSelect: (id: string) => void
}

const DEFAULT_MAIN_COLOR = '#FF6B3D'

export default function Sidebar({ space, onSelect }: Props) {
  const spaces = useCollection<Space>(query(spacesCol(), orderBy('createdAt')))
  const [mainColor, setMainColor] = useState(DEFAULT_MAIN_COLOR)
  const [coloring, setColoring] = useState<{ id: string; title: string; color: string } | null>(null)

  useEffect(
    () =>
      onSnapshot(userRootDoc(), (snap) => {
        const c = snap.get('mainColor')
        setMainColor(typeof c === 'string' ? c : DEFAULT_MAIN_COLOR)
      }),
    [],
  )

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

  const pickColor = (color: string) => {
    if (!coloring) return
    if (coloring.id === MAIN_SPACE) setMainSpaceColor(color)
    else setSpaceColor(coloring.id, color)
    setColoring(null)
  }

  const colorButton = (id: string, title: string, color: string) => (
    <button
      className="icon-btn small"
      title="Цвет планера"
      onClick={(e) => {
        e.stopPropagation()
        setColoring({ id, title, color })
      }}
    >
      🎨
    </button>
  )

  return (
    <nav className="sidebar">
      <div className="side-label">Планеры</div>
      <div className={'side-item' + (space === MAIN_SPACE ? ' active' : '')} onClick={() => onSelect(MAIN_SPACE)}>
        <span className="side-dot" style={{ background: mainColor }} />
        <span className="side-title">Личный</span>
        {space === MAIN_SPACE && <span className="side-actions">{colorButton(MAIN_SPACE, 'Личный', mainColor)}</span>}
      </div>
      {(spaces ?? []).map((s) => (
        <div key={s.id} className={'side-item' + (space === s.id ? ' active' : '')} onClick={() => onSelect(s.id)}>
          <span className="side-dot" style={{ background: s.color }} />
          <span className="side-title">{s.title}</span>
          {space === s.id && (
            <span className="side-actions">
              {colorButton(s.id, s.title, s.color)}
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

      {coloring && (
        <div className="overlay" onClick={() => setColoring(null)}>
          <div className="sheet small" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <span className="sheet-title">Цвет планера «{coloring.title}»</span>
              <button className="icon-btn" onClick={() => setColoring(null)}>
                ✕
              </button>
            </div>
            <div className="color-row">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  className={'color-dot' + (coloring.color === c ? ' selected' : '')}
                  style={{ background: c }}
                  onClick={() => pickColor(c)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
