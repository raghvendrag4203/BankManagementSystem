import app from './app.js'
import env from './config/env.js'

const startServer = async() => {
    try {
        app.listen(env.port, () => {
            console.log(`NODE ENVIRONMENT: ${env.nodeEnv}`)
            console.log(`App is running on http://localhost:${env.port}`)
        })
    } catch (err) {
        console.error(`ERROR starting the server: ${(err as Error).message}`)
        process.exit(1)
    }
}

startServer()