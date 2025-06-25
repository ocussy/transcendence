import { getUser, debugDb, verifyUser, updateUser,getStatUser, getFriendsUser } from '../controllers/users.js';
import { type} from 'os'

// const User = {
//   type: "object",
//   properties: {
//     login: { type: "string" },
//     email: { type: "string" },
//     password: { type: "string" },
//   },
// };

const getUserOptions = {
  preHandler: verifyUser,
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          login: { type: 'string' },
          email: { type: 'string' },
          avatarUrl: { type: 'string' },
          alias : { type: 'string' },
          auth_provider: { type: 'string' },
          language: { type: 'string' },
          password: { type: 'string' },
          secure_auth: { type: 'boolean' },
        },
      },
    },
  },
  handler: getUser,
};
const getFriendsOptions = {
  preHandler: verifyUser,
  schema: {
    response: {
      200: {
        type: "array",
        items: {
          type: "object",
          properties: {
            login: { type: "string" },
            avatarUrl: { type: "string" },
          },
        },
      },
    },
  },
  handler: getFriendsUser,
};

const getStatUserOptions = {
  preHandler: verifyUser,
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          matches: { type: "array",
            properties: {
              player1 : { type: "string" },
              player2 : { type: "string" },
              winner : { type: "string" },
              score1 : { type: "number" },
              score2 : { type: "number" },
              created_at : { type: "string" },
              duration: { type: "number" },
              mode: { type: "string" },
            },
          },
        },
      },
    },
  },
  handler: getStatUser,
};


const updateUserOptions = {
  preHandler: verifyUser,
  schema: {
    body: {
      type: "object",
      properties: {
        login: { type: "string" },
        email: { type: "string" },
        avatarUrl: { type: "string" },
        language: { type: "string" },
        password: { type: "string", minLength: 8 },
        secure_auth: { type: "boolean" },
        friend: { type: "string" },
      },
      additionalProperties: false, // refuse les clés inconnues
      minProperties: 1, // exige au moins une propriété à modifier
    },
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
      400: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
    },
  },
  handler: updateUser,
};


// const debugOptions = {
//   schema: {
//     response: {
//       200: {
//         type: "array",
//         items: User,
//       },
//     },
//   },
//   handler: debugDb,
// };

const debugOptions = {
  // pour tt voir
  handler: debugDb,
};
export default async function userRoutes(fastify, options) {
  fastify.get("/user", getUserOptions);
  fastify.get("/friends", getFriendsOptions);
  fastify.put("/user", updateUserOptions);
  fastify.get("/debug/users", debugOptions);
  fastify.get("/stat", getStatUserOptions);
  // fastify.get("/stat/:friendId", getStatFriendOptions); // pour voir les stats d'un ami
}
