import express from 'express'
import cookieParser from 'cookie-parser'
import  { sql } from 'drizzle-orm'
import { db } from './db/neon_postgres/db.js'

const app = express()

app.use(express.json());
app.use(cookieParser());

// Health Route
app.get('/health', async (_req, res) => {
    try {
        await db.execute(sql`select 1`)
        res.status(200).json({
            message: 'Health OK!',
            database: 'connected',
        })
    } catch (error) {
        // Log the details on the server only; never send error text to clients
        console.error('Health check failed:', error)
        res.status(503).json({
            message: 'Service unavailable',
            database: 'unreachable',
        })
    }
})
export default app

