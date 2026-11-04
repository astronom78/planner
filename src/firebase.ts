import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, collection, doc } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyCLaZs-SH3nBN51tybBhZUxLGT6Kr-mAXs',
  authDomain: 'planner-796fa.firebaseapp.com',
  projectId: 'planner-796fa',
  storageBucket: 'planner-796fa.firebasestorage.app',
  messagingSenderId: '649815464005',
  appId: '1:649815464005:web:f0a0aa0ab641ac44cdeb2c',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Данные каждого пользователя лежат в users/{uid}/<коллекция>; экраны с данными видны только после входа
function uid(): string {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in')
  return user.uid
}

export function userCol(name: string) {
  return collection(db, 'users', uid(), name)
}

export function userDoc(name: string, id: string) {
  return doc(db, 'users', uid(), name, id)
}

export function userStoragePath(path: string): string {
  return `users/${uid()}/${path}`
}
