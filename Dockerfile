FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy all project files
COPY . .

# Create writable directory for SQLite
RUN mkdir -p /data

ENV NODE_ENV=production
ENV DB_PATH=/data/liberty.sqlite
ENV PORT=8080

EXPOSE 8080

CMD ["node", "backend/server.js"]
