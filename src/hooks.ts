import { useEffect, useState } from 'react'
import { onSnapshot, type Query, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore'

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
