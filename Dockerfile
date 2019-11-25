FROM node:12

ENV API_SERVER ""
ENV LISTEN_PORT 80

ENV TINI_VERSION v0.18.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]

RUN apt-get update && apt-get -y upgrade && apt-get -y install gettext-base lighttpd && apt-get clean

WORKDIR /project
COPY lighttpd.tpl.conf package.json  rollup.config.js  tsconfig.json ./

RUN npm install

COPY ts-test ./ts-test
COPY ts-src ./ts-src
COPY src ./src

CMD mkdir -p public && npm run-script build-lighttpd && npm run-script build && npm run-script start
