import {
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  doc,
  setDoc,
  type WhereFilterOp,
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage, userCol, userDoc, userStoragePath, spacesCol, userRootDoc } from './firebase'
import type { Project, Task, Attachment, Stage, Meeting } from './types'

export const PROJECT_COLORS = [
  '#007AFF',
  '#0A84FF',
  '#5AC8FA',
  '#64D2FF',
  '#00C7BE',
  '#34C759',
  '#30D158',
  '#A2E55F',
  '#FFCC00',
  '#FFD60A',
  '#FF9500',
  '#FF9F0A',
  '#FF375F',
  '#FF453A',
  '#FF6B81',
  '#FF8A7A',
  '#AF52DE',
  '#BF5AF2',
  '#5856D6',
  '#5E5CE6',
  '#8E8E93',
  '#AEAEB2',
  '#B8935F',
  '#F2B179',
]

async function deleteWhere(coll: string, field: string, op: WhereFilterOp, value: unknown): Promise<void> {
  const q = query(userCol(coll), where(field, op, value))
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
}

export async function addProject(title: string, color: string): Promise<Project> {
  const createdAt = Date.now()
  const ref = await addDoc(userCol('projects'), { title, color, notes: '', createdAt })
  return { id: ref.id, title, color, notes: '', createdAt }
}

export function updateProject(id: string, patch: Partial<Project>): Promise<void> {
  return updateDoc(userDoc('projects', id), patch)
}

// Закреплённые проекты идут первыми, внутри групп — по order; у старых проектов order нет, их место — по дате создания
export function sortProjects(list: Project[]): Project[] {
  return [...list].sort(
    (a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (a.order ?? a.createdAt) - (b.order ?? b.createdAt),
  )
}

export function setProjectPinned(p: Project, pinned: boolean): Promise<void> {
  // Новый закреплённый — внизу закреплённых, откреплённый — наверху остальных
  return updateDoc(userDoc('projects', p.id), { pinned, order: pinned ? Date.now() : -Date.now() })
}

export async function saveProjectOrder(list: Project[]): Promise<void> {
  await Promise.all(list.map((p, i) => (p.order === i ? null : updateDoc(userDoc('projects', p.id), { order: i }))))
}

export function archiveProject(id: string): Promise<void> {
  return updateDoc(userDoc('projects', id), { archived: true, archivedAt: Date.now() })
}

export function unarchiveProject(id: string): Promise<void> {
  return updateDoc(userDoc('projects', id), { archived: false, archivedAt: null })
}

export async function deleteProject(id: string): Promise<void> {
  const taskSnap = await getDocs(query(userCol('tasks'), where('projectId', '==', id)))
  const taskIds = taskSnap.docs.map((d) => d.id)
  const attSnap = await getDocs(query(userCol('attachments'), where('projectId', '==', id)))
  for (const a of attSnap.docs) await deleteAttachment(a.id)
  if (taskIds.length > 0) {
    const attByTask = await getDocs(query(userCol('attachments'), where('taskId', 'in', taskIds)))
    for (const a of attByTask.docs) await deleteAttachment(a.id)
  }
  await Promise.all(taskSnap.docs.map((d) => deleteDoc(d.ref)))
  await deleteWhere('stages', 'projectId', '==', id)
  await deleteDoc(userDoc('projects', id))
}

export function addStage(projectId: string, title: string, order: number): Promise<string> {
  return addDoc(userCol('stages'), { projectId, title, order, isDone: false }).then((r) => r.id)
}

export function updateStage(id: string, patch: Partial<Stage>): Promise<void> {
  return updateDoc(userDoc('stages', id), patch)
}

export async function deleteStage(id: string): Promise<void> {
  await deleteWhere('tasks', 'stageId', '==', id)
  await deleteDoc(userDoc('stages', id))
}

export async function addTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(userCol('tasks'), { ...task, createdAt: Date.now() })
  return ref.id
}

export function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  return updateDoc(userDoc('tasks', id), patch)
}

export async function deleteTask(id: string): Promise<void> {
  const attSnap = await getDocs(query(userCol('attachments'), where('taskId', '==', id)))
  for (const a of attSnap.docs) await deleteAttachment(a.id)
  await deleteDoc(userDoc('tasks', id))
}

export async function addMeeting(m: Omit<Meeting, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(userCol('meetings'), { ...m, createdAt: Date.now() })
  return ref.id
}

export function updateMeeting(id: string, patch: Partial<Meeting>): Promise<void> {
  return updateDoc(userDoc('meetings', id), patch)
}

export function deleteMeeting(id: string): Promise<void> {
  return deleteDoc(userDoc('meetings', id))
}

export interface NewAttachment {
  taskId: string | null
  projectId: string | null
  name: string
  mime: string
  blob: Blob
}

export async function addAttachment(a: NewAttachment): Promise<void> {
  const id = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  const path = userStoragePath(`attachments/${id}/${a.name}`)
  const fileRef = storageRef(storage, path)
  await uploadBytes(fileRef, a.blob, { contentType: a.mime })
  const url = await getDownloadURL(fileRef)
  await addDoc(userCol('attachments'), {
    taskId: a.taskId,
    projectId: a.projectId,
    name: a.name,
    mime: a.mime,
    size: a.blob.size,
    url,
    storagePath: path,
    createdAt: Date.now(),
  })
}

export async function deleteAttachment(id: string): Promise<void> {
  const ref = userDoc('attachments', id)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    const data = snap.data() as Attachment
    if (data.storagePath) await deleteObject(storageRef(storage, data.storagePath)).catch(() => {})
  }
  await deleteDoc(ref)
}

export function downloadAttachmentUrl(a: Attachment): void {
  window.open(a.url, '_blank')
}

const SPACE_COLLECTIONS = ['projects', 'stages', 'tasks', 'meetings', 'attachments']

export async function addSpace(title: string, color: string): Promise<string> {
  const ref = await addDoc(spacesCol(), { title, color, createdAt: Date.now() })
  return ref.id
}

export function renameSpace(id: string, title: string): Promise<void> {
  return updateDoc(doc(spacesCol(), id), { title })
}

export function setSpaceColor(id: string, color: string): Promise<void> {
  return updateDoc(doc(spacesCol(), id), { color })
}

// Цвет личного планера хранится в самом документе пользователя
export function setMainSpaceColor(color: string): Promise<void> {
  return setDoc(userRootDoc(), { mainColor: color }, { merge: true })
}

export async function deleteSpace(id: string): Promise<void> {
  for (const name of SPACE_COLLECTIONS) {
    const snap = await getDocs(userCol(name, id))
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
  }
  await deleteDoc(doc(spacesCol(), id))
}
