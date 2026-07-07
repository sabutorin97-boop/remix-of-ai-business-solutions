# --- Стадия сборки: устанавливаем зависимости и собираем приложение ---
FROM oven/bun:1 AS builder
WORKDIR /app

# Ставим зависимости отдельным слоем — кешируется, пока не изменились манифесты
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Копируем исходники и собираем Node-сервер (Nitro preset: node-server)
COPY . .
RUN bun run build

# --- Стадия запуска: только собранный вывод + node, без исходников и node_modules ---
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# .output самодостаточен (Nitro бандлит все зависимости внутрь)
COPY --from=builder /app/.output ./.output

# Timeweb/хостинг пробрасывает порт через переменную PORT; по умолчанию 3000
ENV PORT=3000
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
