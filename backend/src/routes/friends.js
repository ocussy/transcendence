import { getFriendsWithStats } from "../controllers/friends.js";
import { verifyUser } from "../controllers/users.js";

const getFriendsOptions = {
  preHandler: verifyUser,
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          friends: {
            type: "array",
            items: {
              type: "object",
              properties: {
                login: { type: "string" },
                avatarUrl: { type: "string" },
                friendSince: { type: "string" },
                totalMatches: { type: "number" },
                winrate: { type: "number" },
              },
            },
          },
        },
      },
    },
  },
  handler: getFriendsWithStats,
};
