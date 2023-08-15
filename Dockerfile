FROM node:18.12.1-alpine

COPY . .
RUN npm ci

RUN npm install pm2 -g

CMD ["pm2-runtime", "--instances", "4", "index.js"]