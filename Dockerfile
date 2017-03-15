FROM node:7.7.2-alpine
WORKDIR /usr/src/app
# moved package first to enabled package caching in docker build step
COPY package.json .
RUN yarn install --production --no-progress
COPY . .
RUN yarn build
CMD [ "node", "dist/index.js" ]