import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from './firebase'

// До появления входа все данные лежали в общих коллекциях. Они принадлежат владельцу планнера,
// и при его первом входе копируются в users/{uid}/… с теми же id, чтобы ссылки projectId/stageId/taskId не сломались.
const LEGACY_OWNER_EMAIL = 'lizok3546@gmail.com'
const LEGACY_COLLECTIONS = ['projects', 'stages', 'tasks', 'meetings', 'attachments']

export async function migrateLegacyData(user: User): Promise<void> {
  if (user.email !== LEGACY_OWNER_EMAIL) return
  const marker = doc(db, 'users', user.uid)
  if ((await getDoc(marker)).exists()) return

  for (const name of LEGACY_COLLECTIONS) {
    const snap = await getDocs(collection(db, name))
    // Пакет Firestore ограничен 500 операциями
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db)
      for (const d of snap.docs.slice(i, i + 400)) batch.set(doc(db, 'users', user.uid, name, d.id), d.data())
      await batch.commit()
    }
  }
  await setDoc(marker, { email: user.email, migratedAt: Date.now() })
}
