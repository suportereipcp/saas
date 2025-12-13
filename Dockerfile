# CORREÇÃO CRÍTICA: Mudamos de 18 para 20-alpine
FROM node:20-alpine

WORKDIR /app

# Copia dependências
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia o código
COPY . .

# --- VARIÁVEIS DE AMBIENTE ---
# Removemos a API_URL que não estava sendo usada
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
# -----------------------------

# Build do Next.js
RUN npm run build

# Porta padrão do Next.js (O Easypanel precisa que seja essa)
EXPOSE 3000

# Inicia o servidor
CMD ["npm", "start"]