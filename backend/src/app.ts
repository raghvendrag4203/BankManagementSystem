import express from 'express'
import cookieParser from 'cookie-parser'

const app = express()

app.use(express.json());
app.use(cookieParser());

// Health Route
app.get('/health', (_req, res) => {
    res.status(201).json({
        message: "Health OK!"
    })
})

export default app

