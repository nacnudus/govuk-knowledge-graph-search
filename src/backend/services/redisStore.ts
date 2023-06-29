import { getClient } from './redis'
import RedisStore from 'connect-redis'
import { REDIS_PREFIX } from '../enums/environments'

const createRedisStore = () => {
  const store = new RedisStore({
    client: getClient(),
    prefix: REDIS_PREFIX.SESSION,
  })

  return store
}

let redisStoreInstance: RedisStore

export const getStore = () => {
  if (!redisStoreInstance) {
    redisStoreInstance = createRedisStore()
  }

  return redisStoreInstance
}

// **
// * Below are Redis utils for managing user sessions with the redis store
// **

export class SessionNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SessionNotFound'
  }
}

export const addSessionToUserSet = async (
  userId: string,
  sessionId: string
) => {
  const redis = getClient()
  const key = `${REDIS_PREFIX.SESSIONS_SET}${userId}`
  try {
    await redis.sadd(key, sessionId)
  } catch (error) {
    console.error(
      `ERROR - could not append session ${sessionId} to user ${userId}`
    )
    throw error
  }
  console.log(`Session ${sessionId} appended to user ${userId}`)
}

export const destroySession = async (sessionId: string) => {
  const store = getStore()
  try {
    await store.destroy(sessionId)
  } catch (error) {
    console.error(`ERROR - could not destroy session ${sessionId}`)
    throw error
  }
  console.log(`Session destroyed: ${sessionId}`)
}

export const destroySessionsForUserId = async (userId: string) => {
  console.log(`Destroying sessions for user ${userId}`)
  const redis = getClient()
  const key = `${REDIS_PREFIX.SESSIONS_SET}${userId}`
  let count = 0
  try {
    let sessionId: string | null
    while ((sessionId = await redis.spop(key))) {
      await destroySession(sessionId)
      count++
    }
  } catch (error) {
    console.error(`ERROR - could not destroy sessions for user ${userId}`)
    throw error
  }
  console.log(`${count} sessions destroyed for user ${userId}`)
}