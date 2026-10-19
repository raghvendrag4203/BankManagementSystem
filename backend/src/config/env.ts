import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

// dotenv gives '' for `KEY=` lines; treat blank values as "not set"
const emptyToUndefined = (value: unknown) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value

const intVar = (name: string, min: number, max: number, fallback: number) =>
    z.preprocess(
        emptyToUndefined,
        z.coerce.number({ error: `${name} must be a number or a numeric string` })
            .int({ error: `${name} must be a whole number` })
            .min(min, { error: `${name} must be at least ${min}` })
            .max(max, { error: `${name} must be at most ${max}` })
            .default(fallback),
    )

const postgresUrl = (name: string) =>
    z.string({ error: `${name} is required` })
        .trim()
        .pipe(
            z.url({
                protocol: /^postgres(ql)?$/,
                error: `${name} must be a valid postgres:// or postgresql:// URL`,
            }),
        )
        .refine(
            (value) => {
                const { hostname, pathname } = new URL(value)
                return hostname !== '' && pathname.length > 1
            },
            { error: `${name} must include a host and a database name` },
        )

const SECURE_SSL_MODES = ['require', 'verify-ca', 'verify-full']

const hasSecureSsl = (value: string) =>
    SECURE_SSL_MODES.includes(new URL(value).searchParams.get('sslmode') ?? '')

const envSchema = z
    .object({
        NODE_ENV: z.preprocess(
            emptyToUndefined,
            z.enum(['development', 'staging', 'testing', 'production'], {
                error: 'NODE_ENV must be development, staging, testing, or production',
            }).default('development'),
        ),
        PORT: intVar('PORT', 1, 65535, 3030),
        LOG_LEVEL: z.preprocess(
            emptyToUndefined,
            z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'], {
                error: 'LOG_LEVEL must be fatal, error, warn, info, debug, trace, or silent',
            }).default('info'),
        ),

        // Pooled connection: used by the running app
        DATABASE_URL: postgresUrl('DATABASE_URL'),
        // Direct connection: used only for migrations (drizzle-kit)
        DATABASE_URL_UNPOOLED: z.preprocess(
            emptyToUndefined,
            postgresUrl('DATABASE_URL_UNPOOLED').optional(),
        ),

        // Connection pool tuning
        DB_POOL_MAX: intVar('DB_POOL_MAX', 1, 100, 10),
        DB_IDLE_TIMEOUT_MS: intVar('DB_IDLE_TIMEOUT_MS', 1_000, 600_000, 30_000),
        // Generous default so a Neon cold start doesn't cause spurious failures
        DB_CONNECTION_TIMEOUT_MS: intVar('DB_CONNECTION_TIMEOUT_MS', 1_000, 60_000, 10_000),
    })
    .superRefine((data, ctx) => {
        // Production must never talk to the database without TLS
        if (data.NODE_ENV === 'production') {
            if (!hasSecureSsl(data.DATABASE_URL)) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['DATABASE_URL'],
                    message: 'must include sslmode=require (or verify-ca / verify-full) in production',
                })
            }
            if (data.DATABASE_URL_UNPOOLED && !hasSecureSsl(data.DATABASE_URL_UNPOOLED)) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['DATABASE_URL_UNPOOLED'],
                    message: 'must include sslmode=require (or verify-ca / verify-full) in production',
                })
            }
        }

        // Migrations must use the direct connection, not the pooler
        if (data.DATABASE_URL_UNPOOLED) {
            const { hostname } = new URL(data.DATABASE_URL_UNPOOLED)
            if (hostname.includes('-pooler')) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['DATABASE_URL_UNPOOLED'],
                    message: 'must be the direct connection string, not the pooled (-pooler) one',
                })
            }
        }
    })

const result = envSchema.safeParse(process.env)

if (!result.success) {
    // Only paths and messages are printed, never the received values (no secret leaks)
    const details = result.error.issues
        .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
        .join('\n')
    throw new Error(`Invalid environment configuration:\n${details}`)
}

const { data } = result

const env = Object.freeze({
    nodeEnv: data.NODE_ENV,
    isProduction: data.NODE_ENV === 'production',
    port: data.PORT,
    logLevel: data.LOG_LEVEL,
    db: Object.freeze({
        url: data.DATABASE_URL,
        urlUnpooled: data.DATABASE_URL_UNPOOLED,
        poolMax: data.DB_POOL_MAX,
        idleTimeoutMs: data.DB_IDLE_TIMEOUT_MS,
        connectionTimeoutMs: data.DB_CONNECTION_TIMEOUT_MS,
    }),
})

export default env