FROM node:8.9.4-alpine
WORKDIR /usr/src/app
COPY package.json .
RUN yarn
COPY . .
RUN npm run build
CMD [ "node", "dist/index.js" ]
