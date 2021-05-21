FROM node:15-alpine

RUN mkdir -p app

WORKDIR /app

COPY . /app

RUN chmod +x ./startup.sh

RUN apk update

RUN apk add --no-cache bash rsync

ENV PORT=8000

RUN npm install

RUN npm run build

EXPOSE 8000

ENTRYPOINT [ "/app/startup.sh" ]
