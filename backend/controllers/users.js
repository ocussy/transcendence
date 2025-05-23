const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database('./data/db.sqlite')

exports.getUser = (req, reply) => {
  db.all('SELECT login FROM users', (err, rows) => {
    if (err) return reply.status(500).send(err)
    reply.send(rows)
  })
}

exports.postUser = (req, reply) => {
  const { login, password } = req.body

  const stmt = db.prepare('INSERT INTO users (login, password) VALUES (?, ?)')
  stmt.run(login, password, function (err) {
    if (err) return reply.status(500).send(err)
    reply.code(201).send({ login, password }) // attention : à ne pas envoyer en prod
  })
}
