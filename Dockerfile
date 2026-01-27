# ==========================================
# ETAPA 1: BUILDER (Constrói o projeto)
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copia dependências
COPY package*.json ./
RUN npm ci
RUN ls -la node_modules/nodemailer

# Copia o código fonte
COPY . .

# --- VARIÁVEIS DE AMBIENTE (Necessárias no Build) ---
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_TLDRAW_LICENSE_KEY
ARG TAVILY_API_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_TLDRAW_LICENSE_KEY=$NEXT_PUBLIC_TLDRAW_LICENSE_KEY
ENV TAVILY_API_KEY=$TAVILY_API_KEY

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ARG NEXT_PUBLIC_DB_SCHEMA
ENV NEXT_PUBLIC_DB_SCHEMA=$NEXT_PUBLIC_DB_SCHEMA

# Kokoro TTS
ARG KOKORO_BASE_URL
ARG KOKORO_API_KEY
ENV KOKORO_BASE_URL=$KOKORO_BASE_URL
ENV KOKORO_API_KEY=$KOKORO_API_KEY
# ----------------------------------------------------

# Cria o build (Gera a pasta .next/standalone)
RUN npm run build

# ==========================================
# ETAPA 2: RUNNER (Roda o projeto leve)
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Cria usuário para segurança (Best Practice)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# --- O SEGREDO DO DESIGN ESTÁ AQUI ---
# 1. Copia a pasta public (Imagens, favicon)
COPY --from=builder /app/public ./public

# 2. Copia a pasta Standalone (O servidor Node puro)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# 3. Copia os Estáticos (CSS, JS) - SEM ISSO O SITE FICA BRANCO
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Define permissões e usuário
USER nextjs

# Expõe a porta e configura Host.
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Inicia direto pelo node (não usa npm start)
CMD ["node", "server.js"]