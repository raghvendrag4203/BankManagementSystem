import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const configuredPort = process.env.PORT

if (configuredPort === undefined) {
    console.warn('PORT is not set; defaulting to 3030.')
}

const envSchema = z.object({
    PORT: z.coerce.number({
        error: 'PORT must be a number or a numeric string',
    }).int({
        error: 'PORT must be a whole number',
    }).min(1, {
        error: 'PORT must be at least 1',
    }).max(65535, {
        error: 'PORT must be at most 65535',
    }),
    NODE_ENV: z.enum(['development', 'staging', 'testing', 'production'], {
        error: 'NODE_ENV must be development, staging, testing, or production',
    }).default('development'),
})

const result = envSchema.safeParse({
    ...process.env,
    PORT: configuredPort ?? '3030',
})

if (!result.success) {
    const details = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')
    throw new Error(`Invalid environment configuration: ${details}`)
}

const env = {
    port: result.data.PORT,
    nodeEnv: result.data.NODE_ENV,
} as const

export default env