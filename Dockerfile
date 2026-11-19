FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=optional
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build && mkdir -p .local && chown -R node:node .local
USER node
ENV HOST=0.0.0.0
EXPOSE 3000
CMD ["npm","start"]
