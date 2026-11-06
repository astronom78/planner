import { initializeApp } from 'firebase/app'
import { initializeAuth, browserLocalPersistence, browserPopupRedirectResolver } from 'firebase/auth'
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
// Вход хранится в localStorage: с IndexedDB (по умолчанию) Firebase зависает там, где база не открывается, и экран остаётся пустым
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
})
export const db = getFirestore(app)
export const storage = getStorage(app)

// Данные каждого пользователя лежат в users/{uid}/<коллекция>; экраны с данными видны только после входа.
// Личный планер — сам users/{uid}, остальные планеры (например, «Универ») — users/{uid}/spaces/{spaceId}
export const MAIN_SPACE = 'main'
let currentSpace = MAIN_SPACE

export function setCurrentSpace(id: string): void {
  currentSpace = id
}

function uid(): string {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in')
  return user.uid
}

function spaceBase(space: string): string[] {
  return space === MAIN_SPACE ? ['users', uid()] : ['users', uid(), 'spaces', space]
}

export function userCol(name: string, space = currentSpace) {
  const [first, ...rest] = spaceBase(space)
  return collection(db, first, ...rest, name)
}

export function userDoc(name: string, id: string) {
  const [first, ...rest] = spaceBase(currentSpace)
  return doc(db, first, ...rest, name, id)
}

export function userRootDoc() {
  return doc(db, 'users', uid())
}

export function spacesCol() {
  return collection(db, 'users', uid(), 'spaces')
}

export function userStoragePath(path: string): string {
  return `${spaceBase(currentSpace).join('/')}/${path}`
}
