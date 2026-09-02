FROM node:22.14-slim AS build

WORKDIR /frontend

COPY package*.json ./

RUN npm ci

COPY . .

ARG VITE_MAPBOX_ACCESS_TOKEN
ENV VITE_MAPBOX_ACCESS_TOKEN=$VITE_MAPBOX_ACCESS_TOKEN

RUN npm run build 


FROM nginx:alpine

COPY --from=build frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx","-g","daemon off;"]
