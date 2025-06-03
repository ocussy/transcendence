FROM node:20

WORKDIR /app

COPY package.json package-lock.json* ./

ENV NODE_ENV=development
RUN npm install

RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*

COPY . .

EXPOSE 8000

ENV ADDRESS=0.0.0.0 PORT=8000

CMD ["npm", "run", "dev"]
