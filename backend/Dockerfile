FROM node:20

WORKDIR /app

# Install backend deps
COPY package.json package-lock.json* ./
RUN npm install

# Install SQLite (si nécessaire)
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*

# --- FRONTEND BUILD ---

WORKDIR /app/frontend

# Copy frontend package.json and install deps
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

# Copy all frontend sources
COPY frontend .

# Build frontend (génère /app/frontend/dist)
RUN npm run build

# --- BACK TO BACKEND ---

WORKDIR /app

# Copy backend sources
COPY . .

RUN mkdir -p certs && \
    openssl req -nodes -new -x509 \
    -keyout certs/server.key \
    -out certs/server.cert \
    -subj "/C=FR/ST=Ile-de-France/L=Paris/O=42/CN=localhost"

# Expose port
EXPOSE 8000

# Launch backend
CMD ["npm", "run", "dev"]