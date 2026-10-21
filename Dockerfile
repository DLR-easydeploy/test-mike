FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production DATABASE_PATH=/data/portfolio.db
RUN mkdir -p /data && chown -R node:node /data /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
USER node
CMD ["node","src/index.js"]
