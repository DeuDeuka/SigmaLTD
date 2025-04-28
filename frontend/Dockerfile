FROM node:23 AS builder
LABEL authors="deu"

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN expo build:web

FROM nginx:alpine
COPY --from=builder /app/web-build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]