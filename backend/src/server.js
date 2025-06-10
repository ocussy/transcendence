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
import jwt from '@fastify/jwt'
import dotenv from 'dotenv'
import cookie from '@fastify/cookie'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config()

const app = fastify()

await app.register(cors, {
  origin : true
})

await app.register(cookie, {
  secret: process.env.COOKIE_SECRET, // This is used to sign the cookie
  hook: 'onRequest', // This will run on every request
})

console.log('JWT secret:', process.env.JWT_SECRET)


app.register(jwt,  {
  secret: process.env.JWT_SECRET
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

