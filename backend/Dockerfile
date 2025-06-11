FROM node:20

WORKDIR /app

# Install backend deps
COPY package.json package-lock.json* ./
RUN npm install

# Install SQLite
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*

# FRONTEND SETUP
WORKDIR /app/frontend

# Copy frontend package.json and install deps
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

# Copy the rest of the frontend sources
COPY frontend .

# Compile the TS (dist is created here)
RUN npm run build && npm install -g typescript && tsc

# Back to backend root
WORKDIR /app

# Copy backend sources
COPY . .

EXPOSE 8000

ENV ADDRESS=0.0.0.0 PORT=8000

CMD ["npm", "run", "dev"]
