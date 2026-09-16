import { useState } from 'react'
import Calendar from './components/Calendar'
import Projects from './components/Projects'
import { useTheme } from './hooks'

const themeIcon = (resolved: 'light' | 'dark', choice: string) => {
  if (choice === 'system') return '🖥'
  return resolved === 'dark' ? '🌙' : '☀️'
}

const nextTheme = (current: 'light' | 'dark' | 'system'): 'light' | 'dark' | 'system' => {
  if (current === 'light') return 'dark'
  if (current === 'dark') return 'system'
  return 'light'
}

export default function App() {
  const [tab, setTab] = useState<'calendar' | 'projects'>('calendar')
  const { theme, setTheme, resolved } = useTheme()

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          <span className="brand-name">Planner</span>
        </div>
        <div className="segmented">
          <button className={'seg' + (tab === 'calendar' ? ' active' : '')} onClick={() => setTab('calendar')}>
            Календарь
          </button>
          <button className={'seg' + (tab === 'projects' ? ' active' : '')} onClick={() => setTab('projects')}>
            Проекты
          </button>
        </div>
        <button
          className="theme-btn"
          onClick={() => setTheme(nextTheme(theme))}
          title={theme === 'system' ? 'Системная тема' : theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
        >
          {themeIcon(resolved, theme)}
        </button>
      </header>
      <main className="content">{tab === 'calendar' ? <Calendar /> : <Projects />}</main>
    </div>
  )
}
