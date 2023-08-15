FROM node:18.12.1-alpine

COPY . .
RUN npm ci

RUN npm install -g forever

CMD ["forever", "-f", "index.js"]