# Use the official Bun image
FROM oven/bun:1.1-alpine AS base
WORKDIR /usr/src/app

# Install dependencies into temp directory to cache them
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Copy node_modules and files, generate prisma client, and run typecheck
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .
RUN bun run gendb
RUN bun run typecheck

# Final release image
FROM base AS release
COPY --from=prerelease /usr/src/app/node_modules node_modules
COPY --from=prerelease /usr/src/app/src src
COPY --from=prerelease /usr/src/app/prisma prisma
COPY package.json .

# Run the app
USER bun
EXPOSE 4000/tcp
ENTRYPOINT [ "bun", "run", "src/server.ts" ]
