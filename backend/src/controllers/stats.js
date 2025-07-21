// controllers/stats.js
import db from '../db.js';

export const getStats = async (request, reply) => {
    try {
        const userLogin = request.user.login; // fo verif middleware auth ajoute user
        
        const userStats = db.prepare(`
            SELECT games_played, games_won 
            FROM users 
            WHERE login = ?
        `).get(userLogin);

        if (!userStats) {
            return reply.status(404).send({ error: 'User not found' });
        }

        const winRate = userStats.games_played > 0 
            ? Math.round((userStats.games_won / userStats.games_played) * 100) 
            : 0;

        const currentStreak = getCurrentWinStreak(userLogin);

        const ranking = getUserRanking(userLogin);

        return {
            totalGames: userStats.games_played || 0,
            totalWins: userStats.games_won || 0,
            winRate: winRate,
            currentStreak: currentStreak,
            ranking: ranking
        };

    } catch (error) {
        console.error('Error fetching stats:', error);
        return reply.status(500).send({ error: 'Failed to fetch statistics' });
    }
};

export const getPerformanceData = async (request, reply) => {
    try {
        const userLogin = request.user.login;
        
        const performanceData = db.prepare(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as games_played,
                SUM(CASE WHEN winner = ? THEN 1 ELSE 0 END) as games_won
            FROM matches 
            WHERE (player1 = ? OR player2 = ?) 
                AND created_at >= datetime('now', '-7 days')
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `).all(userLogin, userLogin, userLogin);

        const chartData = performanceData.map(day => ({
            date: day.date,
            winRate: day.games_played > 0 ? Math.round((day.games_won / day.games_played) * 100) : 0,
            gamesPlayed: day.games_played
        }));

        return chartData;

    } catch (error) {
        console.error('Error fetching performance data:', error);
        return reply.status(500).send({ error: 'Failed to fetch performance data' });
    }
};

function getCurrentWinStreak(userLogin) {
    try {
        const recentMatches = db.prepare(`
            SELECT winner 
            FROM matches 
            WHERE player1 = ? OR player2 = ?
            ORDER BY created_at DESC
            LIMIT 20
        `).all(userLogin, userLogin);

        let streak = 0;
        for (const match of recentMatches) {
            if (match.winner === userLogin) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    } catch (error) {
        console.error('Error calculating win streak:', error);
        return 0;
    }
}

function getUserRanking(userLogin) {
    try {
        const rankings = db.prepare(`
            SELECT 
                login,
                games_played,
                games_won,
                CASE 
                    WHEN games_played = 0 THEN 0 
                    ELSE (games_won * 100.0 / games_played) 
                END as win_rate
            FROM users 
            WHERE games_played > 0
            ORDER BY win_rate DESC, games_played DESC
        `).all();

        const userRank = rankings.findIndex(user => user.login === userLogin) + 1;
        
        return userRank || null;
    } catch (error) {
        console.error('Error calculating user ranking:', error);
        return null;
    }
}