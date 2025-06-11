FROM node:20

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy all frontend sources
COPY . .

# Build Tailwind and TypeScript
RUN npm run build

CMD ["npm", "run", "build"]
