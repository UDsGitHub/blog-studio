FROM node:24-slim AS deps

WORKDIR /app
COPY ./package.json ./package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

FROM deps AS dev
COPY . .
CMD ["npm", "run", "start:dev"]

FROM deps AS build
COPY . .
RUN npm run build

FROM deps AS migrate
COPY prisma7.config.ts ./
CMD ["npx", "prisma", "migrate", "deploy", "--config", "./prisma7.config.ts"]

FROM node:24-slim AS prod
WORKDIR /app
RUN apt-get update -y \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/package.json /app/package-lock.json .
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY prisma7.config.ts ./
RUN useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser
CMD ["node", "dist/main.js"]