import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(
  '/api/genius',
  createProxyMiddleware({
    target: 'https://api.genius.com',
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq) => {
        proxyReq.setHeader('Authorization', `Bearer ${process.env.VITE_GENIUS_TOKEN}`)
      },
    },
  })
)

app.use(express.static(path.join(__dirname, '../dist')))

app.get('/:path(.*)?', (_req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

app.listen(PORT, () => {
  console.log(`Server on http://localhost:${PORT}`)
})
