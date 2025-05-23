FROM node:18

WORKDIR /app

COPY package.json .

RUN npm install
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*

COPY . .

EXPOSE 8000

ENV ADDRES=0.0.0.0 PORT=8000

CMD ["npm", "run", "dev"]