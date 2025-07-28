FROM node:20

WORKDIR /app

# Étape 1 - backend install
COPY package.json package-lock.json* ./
RUN npm install

# Étape 2 - dépendances système
RUN apt-get update && apt-get install -y sqlite3 openssl && rm -rf /var/lib/apt/lists/*

# Étape 3 - génère certificat avant COPY .
RUN mkdir -p ssl && \
    openssl req -x509 -newkey rsa:4096 -sha256 -nodes \
    -keyout ssl/key.pem -out ssl/cert.pem -days 365 \
    -subj "/CN=localhost"

# Étape 4 - frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend .
RUN npm run build

# Étape 5 - revient au backend et copie le reste (sans écraser ssl/)
WORKDIR /app
COPY . .

# Expose HTTPS port
EXPOSE 443

# Démarre le backend
CMD ["npm", "run", "dev"]
