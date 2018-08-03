FROM node:alpine

RUN apk add --no-cache tzdata --repository https://mirrors.aliyun.com/alpine/latest-stable/main/
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /usr/src/app
COPY package.json .
RUN npm i --registry https://registry.npm.taobao.org
COPY . .
RUN npm run babel:build
CMD [ "node", "dist/index.js" ]
