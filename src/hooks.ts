import { useEffect, useState, useCallback } from 'react'
import { onSnapshot, type Query, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from './firebase'
import { migrateLegacyData } from './migrate'

export function docsTo<T>(snap: QueryDocumentSnapshot<DocumentData>[]): T[] {
  return snap.map((d) => ({ id: d.id, ...d.data() }) as T)
}

export function useCollection<T>(q: Query<DocumentData> | null, deps: unknown[] = []): T[] | undefined {
  const [data, setData] = useState<T[] | undefined>(undefined)

  useEffect(() => {
    if (!q) {
      setData([])
      return
    }
    const unsub = onSnapshot(q, (snap) => setData(docsTo<T>(snap.docs)))
    return unsub
  }, deps)

  return data
}

// undefined — Firebase ещё проверяет сохранённый вход, null — не вошли
export function useUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        if (u) await migrateLegacyData(u).catch((err) => console.error('Legacy data migration failed', err))
        setUser(u)
      }),
    [],
  )

  return user
}

type ThemeChoice = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'planner-theme'

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStored(): ThemeChoice {
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === 'light' || v === 'dark' || v === 'system') return v
  return 'system'
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(getStored)
  const resolved: ResolvedTheme = choice === 'system' ? getSystemTheme() : choice

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
  }, [resolved])

  useEffect(() => {
    if (choice !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      document.documentElement.dataset.theme = getSystemTheme()
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [choice])

  const setTheme = useCallback((next: ThemeChoice) => {
    setChoice(next)
    localStorage.setItem(STORAGE_KEY, next)
  }, [])

  return { theme: choice, setTheme, resolved }
}
