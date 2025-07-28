import db from '../db.js'

export function createTournament(req, reply) {
    const id = req.user.id;
    const { name, players } = req.body;

    const user = db.prepare('SELECT alias FROM users WHERE id = ?').get(id);

    //verifier les alias tous differents
     const uniquePlayers = [...new Set(players)];
    if (uniquePlayers.length !== players.length) {
        return reply.status(400).send({ error: "Les noms des joueurs doivent être uniques." });
    }

    const tournament = db.prepare(`
        INSERT INTO tournaments (name, maxPlayers, created_at)
        VALUES (?, ?, ?)
    `).run(name, players.length, Date.now());

    console.log("user alias :", user.alias);
    const insertParticipants = db.prepare(`INSERT INTO participants (tournament_id, name) VALUES (?, ?)`);
    insertParticipants.run(tournament.lastInsertRowid, user.alias);
    for (const player of players) {
        insertParticipants.run(tournament.lastInsertRowid, player);
    }

    const allParticipants = db.prepare(`SELECT name, tournament_id FROM participants`).all();
    console.log("all participants :", allParticipants);
    const participants = db.prepare(`SELECT * FROM participants WHERE tournament_id = ?`).all(tournament.lastInsertRowid);

    const player_1 = participants[1].name;
    const player_2 = participants[2].name;

    db.prepare(`DELETE FROM participants WHERE tournament_id = ? AND name = ?`).run(tournament.lastInsertRowid, player_1);
    db.prepare(`DELETE FROM participants WHERE tournament_id = ? AND name = ?`).run(tournament.lastInsertRowid, player_2);

    if (user.alias === player_1 || user.alias === player_2) {
        reply.status(201).send({ id: tournament.lastInsertRowid, status: "in progress", player_id : id, player_1, player_2 });
    } else {
        reply.status(201).send({ id: tournament.lastInsertRowid, status: "in progress", player_id : -1, player_1, player_2 });
    }
}

export function updateTournament(req, reply) {
    const { id } = req.params;
    const { winner } = req.body;

    const tournament = db.prepare(`SELECT * FROM tournaments WHERE id = ?`).get(id);
    if (!tournament) {
        return reply.status(404).send({ error: "Tournoi non trouvé." });
    }

    db.prepare(`INSERT INTO participants (tournament_id, name) VALUES (?, ?)`).run(id, winner);

    const participants = db.prepare(`SELECT * FROM participants WHERE tournament_id = ?`).all(id);

    const user = db.prepare('SELECT alias FROM users WHERE id = ?').get(req.user.id);
    if (participants.length >= 2) {
        const player_1 = participants[0].name;
        const player_2 = participants[1].name;

        db.prepare(`DELETE FROM participants WHERE tournament_id = ? AND name = ?`).run(id, player_1);
        db.prepare(`DELETE FROM participants WHERE tournament_id = ? AND name = ?`).run(id, player_2);
        if (user.alias === player_1 || user.alias === player_2) {
            reply.status(200).send({ id, status: "in progress", player_id: id, player_1, player_2 });
        }
        else {
            reply.status(200).send({ id, status: "in progress", player_id: -1, player_1, player_2 });
        }
    }
    else
    {
        const player_1 = participants[0].name;
        reply.status(200).send({ id, status: "finished", player_id: id, player_1, player_2: null });
    }

}

export function getTournamentById(req, reply) {
    const { id } = req.params;

    const tournament = db.prepare(`SELECT * FROM tournaments WHERE id = ?`).get(id);
    if (!tournament) {
        return reply.status(404).send({ error: "Tournoi non trouvé." });
    }

    const participants = db.prepare(`SELECT name FROM participants WHERE tournament_id = ?`).all(id);
    reply.status(200).send({
        id: tournament.id,
        name: tournament.name,
        maxPlayers: tournament.maxPlayers,
        created_at: new Date(tournament.created_at).toISOString(),
        participants: participants,
    });
}

