import dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit runs as its own CLI process, outside your app, so it doesn't
// load .env on its own
dotenv.config()

// Migrations must use the direct (non-pooled) connection. Unlike the app,
// there's no sensible fallback here: silently using the pooler can cause
// confusing migration failures, so fail loudly instead.
const databaseUrl = process.env.DATABASE_URL_UNPOOLED?.trim()

if (!databaseUrl) {
    throw new Error(
        'DATABASE_URL_UNPOOLED is not set. drizzle-kit needs the direct (non-pooled) connection string.',
    )
}

let hostname: string
try {
    hostname = new URL(databaseUrl).hostname
} catch {
    throw new Error('DATABASE_URL_UNPOOLED is not a valid URL.')
}

if (hostname.includes('-pooler')) {
    throw new Error(
        'DATABASE_URL_UNPOOLED points to the pooled (-pooler) host. Use the direct connection string for migrations.',
    )
}

export default defineConfig({
    dialect: 'postgresql',
    schema: './src/db/neon_postgres/schemas/index.ts',
    out: './drizzle',
    dbCredentials: {
        url: databaseUrl,
    },
    // Ask for confirmation before destructive changes
    strict: true,
    // Print the SQL being executed so you can see exactly what happens
    verbose: true,
})