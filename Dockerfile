FROM node:7.7.2-alpine
WORKDIR /usr/src/app
COPY . .
RUN yarn install --production --no-progress
RUN yarn build
CMD [ "node", "dist/index.js" ]