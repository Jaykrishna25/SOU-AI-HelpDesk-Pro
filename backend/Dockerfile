FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json .npmrc* ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npx prisma generate && (npm run build || npx tsc -p tsconfig.json --noEmitOnError false || true)
EXPOSE 5001
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run seed && node dist/index.js"]
