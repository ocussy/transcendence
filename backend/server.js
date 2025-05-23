const path = require('path')
const Fastify = require('fastify')
const fastifyStatic = require('@fastify/static')
const sqlite3 = require('sqlite3').verbose()

const fastify = Fastify({ logger: true })

const db = new sqlite3.Database('./data/db.sqlite', (err) => {
  if (err) console.error('Erreur SQLite:', err)
  else console.log('Connecté à SQLite')
})

db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)')

fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'frontend'),
  prefix: '/'
})

const userRoutes = require('./routes/user')
fastify.register(userRoutes)


const start = async () => {
  try {
    await fastify.listen({ port: 8000, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
