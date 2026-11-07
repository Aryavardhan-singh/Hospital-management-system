import { openDB, type IDBPDatabase } from 'idb'

export type QueuedActionType = 'request_ambulance' | 'update_bed_occupancy' | 'update_ambulance'

export interface QueuedAction {
  id?: number
  type: QueuedActionType
  payload: Record<string, unknown>
  createdAt: number
}

const DB_NAME = 'mednet_offline_queue'
const STORE_NAME = 'actions_queue'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
        }
      },
    })
  }
  return dbPromise
}

/**
 * Enqueue an action to be synchronized when back online
 */
export async function queueAction(type: QueuedActionType, payload: Record<string, unknown>): Promise<number> {
  const db = await getDB()
  const id = await db.add(STORE_NAME, {
    type,
    payload,
    createdAt: Date.now(),
  })
  console.log(`[OfflineQueue] Enqueued action #${id} (${type})`)
  return id as number
}

/**
 * Get all queued actions in order
 */
export async function getQueuedActions(): Promise<QueuedAction[]> {
  const db = await getDB()
  return (await db.getAll(STORE_NAME)) as QueuedAction[]
}

/**
 * Remove an action after successful sync
 */
export async function removeQueuedAction(id: number): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, id)
}

/**
 * Clear the entire action queue
 */
export async function clearActionQueue(): Promise<void> {
  const db = await getDB()
  await db.clear(STORE_NAME)
}
