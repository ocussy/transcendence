FROM node:20

# 1. Dossier de travail principal
WORKDIR /app

# 2. Installer les dépendances backend
COPY package.json package-lock.json* ./
RUN npm install

# 3. Installer OpenSSL + SQLite
RUN apt-get update && \
    apt-get install -y openssl sqlite3 && \
    rm -rf /var/lib/apt/lists/*

# 6. Construire le frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend ./
RUN npm run build

# 7. Revenir au backend
WORKDIR /app
COPY . .
# 8. Exposer le port HTTPS
EXPOSE 443

# 9. Démarrer le backend
CMD ["npm", "run", "dev"]
