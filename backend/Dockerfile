# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Your backend listens on 3000 (adjust if needed)
EXPOSE 3000

CMD ["npm", "start"]
