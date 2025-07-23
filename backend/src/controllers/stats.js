import db from "../db.js";

export function getStats(req, reply) {
  try {
    if (!req.user || !req.user.id) {
      return reply.status(401).send({ error: "User not authenticated" });
    }

    const userId = req.user.id;

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }
    const userLogin = user.login;
    const userStats = {
      games_played: user.games_played || 0,
      games_won: user.games_won || 0,
    };

    const winRate =
      userStats.games_played > 0
        ? Math.round((userStats.games_won / userStats.games_played) * 100)
        : 0;

    const recentMatches = db
      .prepare(
        `
        SELECT winner FROM matches
        WHERE player1 = ? OR player2 = ?
        ORDER BY created_at DESC LIMIT 10
      `,
      )
      .all(userLogin, userLogin);

    let currentStreak = 0;
    for (const match of recentMatches) {
      if (match.winner === userLogin) {
        currentStreak++;
      } else {
        break;
      }
    }

    const allUsers = db
      .prepare(
        `
        SELECT login, games_played, games_won,
        CASE WHEN games_played = 0 THEN 0
             ELSE (games_won * 100.0 / games_played) END as win_rate
        FROM users
        WHERE games_played > 0
        ORDER BY win_rate DESC, games_played DESC
      `,
      )
      .all();

    const ranking = allUsers.findIndex((u) => u.login === userLogin) + 1;

    const result = {
      totalGames: userStats.games_played,
      totalWins: userStats.games_won,
      winRate: winRate,
      currentStreak: currentStreak,
      ranking: ranking || null,
    };

    reply.send(result);
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    reply.status(500).send({ error: "Failed to fetch statistics" });
  }
}

export function getMatchHistory(req, reply) {
  try {
    if (!req.user || !req.user.id) {
      return reply.status(401).send({ error: "User not authenticated" });
    }

    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 5;

    const user = db.prepare("SELECT login FROM users WHERE id = ?").get(userId);
    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    const userLogin = user.login;
    const matches = db
      .prepare(
        `
        SELECT
          *,
          CASE
            WHEN player1 = ? THEN player2
            ELSE player1
          END as opponent,
          CASE
            WHEN winner = ? THEN 'WIN'
            WHEN winner IS NULL THEN 'DRAW'
            ELSE 'LOSS'
          END as result,
          datetime(created_at, 'localtime') as formatted_date
        FROM matches
        WHERE player1 = ? OR player2 = ?
        ORDER BY created_at DESC
        LIMIT ?
      `,
      )
      .all(userLogin, userLogin, userLogin, userLogin, limit);

    reply.send(matches);
  } catch (error) {
    console.error("❌ Error fetching match history:", error);
    reply.status(500).send({ error: "Failed to fetch match history" });
  }
}

export function getPerformanceData(req, reply) {
  try {
    if (!req.user || !req.user.id) {
      return reply.status(401).send({ error: "User not authenticated" });
    }

    const userId = req.user.id;

    const user = db.prepare("SELECT login FROM users WHERE id = ?").get(userId);
    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    const userLogin = user.login;

    const performanceData = db
      .prepare(
        `
        SELECT
          DATE(created_at) as date,
          COUNT(*) as games_played,
          SUM(CASE WHEN winner = ? THEN 1 ELSE 0 END) as games_won
        FROM matches
        WHERE (player1 = ? OR player2 = ?)
          AND created_at >= datetime('now', '-7 days')
          AND score1 IS NOT NULL AND score2 IS NOT NULL
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      )
      .all(userLogin, userLogin, userLogin);

    const chartData = performanceData.map((day) => ({
      date: day.date,
      winRate:
        day.games_played > 0
          ? Math.round((day.games_won / day.games_played) * 100)
          : 0,
      gamesPlayed: day.games_played,
    }));

    reply.send(chartData);
  } catch (error) {
    console.error("❌ Error fetching performance data:", error);
    reply.status(500).send({ error: "Failed to fetch performance data" });
  }
}
