FROM node:20-alpine
WORKDIR /app
COPY .env AGENTS.md ./
COPY ai-docs/ ./ai-docs/
COPY src/ ./src/
CMD ["node", "src/index.js"]
