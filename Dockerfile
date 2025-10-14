# Etapa 1: build do Angular SSR
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Etapa 2: runtime leve
FROM node:20-alpine AS runtime
WORKDIR /app

COPY --from=build /app/dist ./dist
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/LisoLaser.FrontEnd/server/server.mjs"]
