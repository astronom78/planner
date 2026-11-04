import { useState } from 'react'
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import Calendar from './components/Calendar'
import Projects from './components/Projects'
import Archive from './components/Archive'
import { auth } from './firebase'
import { useTheme, useUser } from './hooks'

const themeIcon = (resolved: 'light' | 'dark', choice: string) => {
  if (choice === 'system') return '🖥'
  return resolved === 'dark' ? '🌙' : '☀️'
}

const nextTheme = (current: 'light' | 'dark' | 'system'): 'light' | 'dark' | 'system' => {
  if (current === 'light') return 'dark'
  if (current === 'dark') return 'system'
  return 'light'
}

function SignIn() {
  const [error, setError] = useState('')

  const signIn = () => {
    setError('')
    signInWithPopup(auth, new GoogleAuthProvider()).catch((err: { code?: string }) => {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return
      setError('Не получилось войти. Попробуйте ещё раз.')
    })
  }

  return (
    <div className="page signin">
      <div className="signin-card">
        <h1 className="page-title">Planner</h1>
        <p className="signin-text">Проекты, этапы и дедлайны. Войдите, чтобы открыть свой планнер.</p>
        <button className="btn primary signin-btn" onClick={signIn}>
          Войти через Google
        </button>
        {error && <p className="signin-error">{error}</p>}
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<'calendar' | 'projects' | 'archive'>('calendar')
  const { theme, setTheme, resolved } = useTheme()
  const user = useUser()

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          <span className="brand-name">Planner</span>
        </div>
        {user && (
          <div className="segmented">
            <button className={'seg' + (tab === 'calendar' ? ' active' : '')} onClick={() => setTab('calendar')}>
              Календарь
            </button>
            <button className={'seg' + (tab === 'projects' ? ' active' : '')} onClick={() => setTab('projects')}>
              Проекты
            </button>
            <button className={'seg' + (tab === 'archive' ? ' active' : '')} onClick={() => setTab('archive')}>
              🗄 Архив
            </button>
          </div>
        )}
        <div className="topbar-actions">
          {user && (
            <button className="btn" onClick={() => signOut(auth)} title={user.email ?? undefined}>
              Выйти
            </button>
          )}
          <button
            className="theme-btn"
            onClick={() => setTheme(nextTheme(theme))}
            title={theme === 'system' ? 'Системная тема' : theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
          >
            {themeIcon(resolved, theme)}
          </button>
        </div>
      </header>
      <main className="content" key={user?.uid}>
        {user === undefined ? null : user === null ? (
          <SignIn />
        ) : tab === 'calendar' ? (
          <Calendar />
        ) : tab === 'projects' ? (
          <Projects />
        ) : (
          <Archive />
        )}
      </main>
    </div>
  )
}
