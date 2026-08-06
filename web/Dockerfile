# --- Étape build ---
FROM node:20-alpine AS build
WORKDIR /app
# NEXT_PUBLIC_* est inliné dans le bundle client au build — doit être un ARG,
# pas seulement une env de runtime (sinon le code client ne le voit jamais).
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Étape runtime (Next.js "standalone") ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
