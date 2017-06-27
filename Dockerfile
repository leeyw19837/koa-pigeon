FROM node:8.0.0-alpine
WORKDIR /usr/src/app
COPY package.json .
RUN npm i --production
COPY . .
RUN npm run build
CMD [ "node", "dist/index.js" ]