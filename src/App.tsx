import { useState } from 'react'
import Calendar from './components/Calendar'
import Projects from './components/Projects'

export default function App() {
  const [tab, setTab] = useState<'calendar' | 'projects'>('calendar')

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
        <div className="brand-spacer" />
      </header>
      <main className="content">{tab === 'calendar' ? <Calendar /> : <Projects />}</main>
    </div>
  )
}
