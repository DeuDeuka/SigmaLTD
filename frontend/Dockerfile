# Build stage
FROM node:23 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm -g install expo-cli
RUN expo export:web

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/web-build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]