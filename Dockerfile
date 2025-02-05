FROM oven/bun:1.2.2-alpine

WORKDIR /app

COPY . .
RUN bun install

CMD ["bun", "run", "src/index.ts"]