# Stage 1: Build React App
FROM node:20-alpine AS build

WORKDIR /app

# Copy frontend package files
COPY frontend/package*.json ./

RUN npm install

# Copy rest of frontend source
COPY frontend ./

# Build the React project
RUN npm run build

# Stage 2: Nginx to serve the app
FROM nginx:stable-alpine

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom Nginx config
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy the built React files from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
