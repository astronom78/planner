import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  doc,
  type WhereFilterOp,
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from './firebase'
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
  const q = query(collection(db, coll), where(field, op, value))
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
}

export async function addProject(title: string, color: string): Promise<Project> {
  const createdAt = Date.now()
  const ref = await addDoc(collection(db, 'projects'), { title, color, notes: '', createdAt })
  return { id: ref.id, title, color, notes: '', createdAt }
}

export function updateProject(id: string, patch: Partial<Project>): Promise<void> {
  return updateDoc(doc(db, 'projects', id), patch)
}

export async function deleteProject(id: string): Promise<void> {
  const taskSnap = await getDocs(query(collection(db, 'tasks'), where('projectId', '==', id)))
  const taskIds = taskSnap.docs.map((d) => d.id)
  const attSnap = await getDocs(query(collection(db, 'attachments'), where('projectId', '==', id)))
  for (const a of attSnap.docs) await deleteAttachment(a.id)
  if (taskIds.length > 0) {
    const attByTask = await getDocs(query(collection(db, 'attachments'), where('taskId', 'in', taskIds)))
    for (const a of attByTask.docs) await deleteAttachment(a.id)
  }
  await Promise.all(taskSnap.docs.map((d) => deleteDoc(d.ref)))
  await deleteWhere('stages', 'projectId', '==', id)
  await deleteDoc(doc(db, 'projects', id))
}

export function addStage(projectId: string, title: string, order: number): Promise<string> {
  return addDoc(collection(db, 'stages'), { projectId, title, order, isDone: false }).then((r) => r.id)
}

export function updateStage(id: string, patch: Partial<Stage>): Promise<void> {
  return updateDoc(doc(db, 'stages', id), patch)
}

export async function deleteStage(id: string): Promise<void> {
  await deleteWhere('tasks', 'stageId', '==', id)
  await deleteDoc(doc(db, 'stages', id))
}

export async function addTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'tasks'), { ...task, createdAt: Date.now() })
  return ref.id
}

export function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  return updateDoc(doc(db, 'tasks', id), patch)
}

export async function deleteTask(id: string): Promise<void> {
  const attSnap = await getDocs(query(collection(db, 'attachments'), where('taskId', '==', id)))
  for (const a of attSnap.docs) await deleteAttachment(a.id)
  await deleteDoc(doc(db, 'tasks', id))
}

export async function addMeeting(m: Omit<Meeting, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'meetings'), { ...m, createdAt: Date.now() })
  return ref.id
}

export function updateMeeting(id: string, patch: Partial<Meeting>): Promise<void> {
  return updateDoc(doc(db, 'meetings', id), patch)
}

export function deleteMeeting(id: string): Promise<void> {
  return deleteDoc(doc(db, 'meetings', id))
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
  const path = `attachments/${id}/${a.name}`
  const fileRef = storageRef(storage, path)
  await uploadBytes(fileRef, a.blob, { contentType: a.mime })
  const url = await getDownloadURL(fileRef)
  await addDoc(collection(db, 'attachments'), {
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
  const ref = doc(db, 'attachments', id)
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
