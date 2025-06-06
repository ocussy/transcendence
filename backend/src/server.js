import fastify from 'fastify'
import path from 'path'
import fastifyStatic from '@fastify/static'
import { fileURLToPath } from 'url'
import db from './db.js'
import userRoutes from './routes/user.js'
import matchRoutes from './routes/matches.js'
import formbody from '@fastify/formbody'
import cors from '@fastify/cors'
import authRoutes from './routes/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = fastify()

await app.register(cors, {
  origin : true
})

app.register(fastifyStatic, {
  root: path.join(__dirname, '../frontend'),
  prefix: '/'
})


app.register(formbody)
app.register(userRoutes)
app.register(matchRoutes)
app.register(authRoutes)

const start = async () => {
  try {
    await app.listen({ port: 8000, host: '0.0.0.0' })
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}
start()

