# ==========================================
# Dockerfile - CRM La Manuela Mezcal
# ==========================================
FROM node:20-alpine

# Directorio de trabajo
WORKDIR /app

# Copiar manifiesto de dependencias
COPY package*.json ./

# Instalar dependencias de producción (mysql2 es 100% JS puro)
RUN npm ci --only=production

# Copiar el código fuente completo de la aplicación
COPY . .

# Exponer el puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Iniciar servidor
CMD ["node", "server.js"]
