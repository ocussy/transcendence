import bcrypt from 'bcrypt';


export async function seedDatabase(db) {
  // Utilisateurs fictifs
  const users = [
    { login: 'adem', email: 'adem@example.com' },
    { login: 'geoffrey', email: 'geoffrey@example.com' },
    { login: 'oceane', email: 'oceane@example.com' },
    { login: 'lucie', email: 'lucie@example.com' },
    { login: 'coco', email: 'coco@example.com' },
    { login: 'rydom', email: 'rydom@example.com' },
  ];


  const insertUser = db.prepare(`
    INSERT INTO users (login, email, password, alias)
    VALUES (?, ?, ?, ?)
  `);

  const password = 'Coco1234!';
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  for (const u of users) {
    insertUser.run(u.login, u.email, hash, u.login);
  }

  // Récupérer les IDs
  const getUserId = db.prepare(`SELECT id FROM users WHERE login = ?`);
  const userIds = {};
  for (const u of users) {
    const row = getUserId.get(u.login);
    userIds[u.login] = row.id;
  }

  // Tournoi
//   const insertTournament = db.prepare(`
//     INSERT INTO tournaments (name, organizer, maxPlayers, start_at)
//     VALUES (?, ?, ?, datetime('now', '+1 day'))
//   `);
//   const tournamentName = 'Summer Cup';
//   insertTournament.run(tournamentName, 'oceane', 6);
//   const tournamentId = db.prepare(`SELECT id FROM tournaments WHERE name = ?`).get(tournamentName).id;

  // Matchs
  const insertMatch = db.prepare(`
    INSERT INTO matches (player1, player2, winner, score1, score2, duration, mode)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertMatch.run('adem', 'geoffrey', 'adem', 11, 7, 300, 'normal');
  insertMatch.run('oceane', 'lucie', 'lucie', 9, 11, 290, 'normal');
  insertMatch.run('coco', 'rydom', 'coco', 11, 8, 310, 'tournament');
  insertMatch.run('adem', 'oceane', 'oceane', 10, 12, 260, 'normal');
  insertMatch.run('lucie', 'rydom', 'lucie', 11, 6, 280, 'tournament');
  insertMatch.run('geoffrey', 'coco', 'geoffrey', 11, 9, 295, 'normal');

  // Amitiés
  const insertFriend = db.prepare(`
    INSERT INTO friends (user_id, friend_id)
    VALUES (?, ?)
  `);

  function addFriend(a, b) {
    insertFriend.run(userIds[a], userIds[b]);
    insertFriend.run(userIds[b], userIds[a]);
  }

  addFriend('adem', 'oceane');
  addFriend('adem', 'geoffrey');
  addFriend('geoffrey', 'lucie');
  addFriend('lucie', 'coco');
  addFriend('coco', 'rydom');
  addFriend('rydom', 'oceane');

  console.log('✅ Base de données remplie avec 6 utilisateurs, 6 matchs, 1 tournoi et des amitiés.');
}
