export type ID = string

export interface Project {
  id: ID
  title: string
  color: string
  notes: string
  createdAt: number
}

export interface Stage {
  id: ID
  projectId: ID
  title: string
  order: number
  isDone: boolean
}

export interface Task {
  id: ID
  projectId: ID
  stageId: ID | null
  title: string
  notes: string
  deadline: string | null
  isDone: boolean
  createdAt: number
}

export interface Meeting {
  id: ID
  title: string
  date: string
  time: string | null
  notes: string
  createdAt: number
}

export interface Attachment {
  id: ID
  taskId: ID | null
  projectId: ID | null
  name: string
  mime: string
  size: number
  url: string
  storagePath: string
  createdAt: number
}

export interface CalendarItem {
  kind: 'task' | 'meeting'
  id: ID
  title: string
  date: string
  time: string | null
  isDone: boolean
  color: string
  projectTitle?: string
  stageTitle?: string
}
