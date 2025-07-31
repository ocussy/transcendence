import bcrypt from 'bcrypt';


export async function seedDatabase(db) {
  // Vérifier si la base de données contient déjà des utilisateurs
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  
  if (userCount.count > 0) {
    console.log(`📊 Base de données déjà initialisée avec ${userCount.count} utilisateurs.`);
    return;
  }

  console.log('🌱 Initialisation de la base de données...');

  // Utilisateurs fictifs
  const users = [
    { login: 'adem', email: 'adem@example.com', games_won: 3, games_played: 5 },
    { login: 'geoffrey', email: 'geoffrey@example.com', games_won: 2, games_played: 4 },
    { login: 'oceane', email: 'oceane@example.com', games_won: 1, games_played: 3 },
    { login: 'lucie', email: 'lucie@example.com', games_won: 4, games_played: 6 },
    { login: 'coco', email: 'coco@example.com', games_won: 5, games_played: 7 },
    { login: 'rydom', email: 'rydom@example.com', games_won: 0, games_played: 2 },
  ];


  const insertUser = db.prepare(`
    INSERT INTO users (login, email, password, alias, games_played, games_won)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const password = 'Coco1234!';
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  for (const u of users) {
    insertUser.run(u.login, u.email, hash, u.login, u.games_played, u.games_won);
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

  insertMatch.run('adem', 'geoffrey', 1, 11, 7, 300, 'normal');
  insertMatch.run('oceane', 'lucie', null, 9, 11, 290, 'normal');
  insertMatch.run('coco', 'rydom', 5, 11, 8, 310, 'tournament');
  insertMatch.run('adem', 'oceane', null, 10, 12, 260, 'normal');
  insertMatch.run('lucie', 'rydom', 4, 11, 6, 280, 'tournament');
  insertMatch.run('geoffrey', 'coco', 2, 11, 9, 295, 'normal');

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

  console.log('✅ Base de données initialisée avec succès : 6 utilisateurs, 6 matchs, 1 tournoi et des amitiés.');
}
