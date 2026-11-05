# Built from the repo root: docker build -f apps/jobs/Dockerfile .
FROM node:24-slim AS build
RUN npm install -g pnpm@12.15.0
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter "@koach/jobs..." \
 && pnpm --filter @koach/jobs build \
 && pnpm --filter @koach/jobs deploy --prod /out

FROM node:24-slim
ENV NODE_ENV=production MIGRATIONS_DIR=/app/migrations
WORKDIR /app
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/dist ./dist
COPY --from=build --chown=node:node /repo/packages/db/migrations ./migrations
USER node
# The command is set per Cloud Run job (e.g. node dist/migrate.js).
CMD ["node", "--enable-source-maps", "dist/migrate.js"]
