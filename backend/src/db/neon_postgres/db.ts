import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import env from '../../config/env.js'
import * as schema from './schemas/index.ts'

export const pool = new Pool({
    connectionString: env.db.url,
    max: env.db.poolMax,
    idleTimeoutMillis: env.db.idleTimeoutMs,
    connectionTimeoutMillis: env.db.connectionTimeoutMs,
})

// Without this handler, a dropped idle connection (common when Neon suspends
// compute) emits an unhandled 'error' event and crashes the process
pool.on('error', (err: Error) => {
    console.error('Unexpected error on idle database client:', (err as Error).message)
})

export const db = drizzle(pool, { schema })

// Call this on shutdown so connections are released cleanly
export const closeDb = async () => {
    await pool.end()
}