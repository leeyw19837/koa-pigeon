FROM node:alpine
WORKDIR /usr/src/app
COPY package.json .
RUN npm i --registry https://registry.npm.taobao.org
COPY . .
RUN npm run build
CMD [ "node", "dist/index.js" ]
