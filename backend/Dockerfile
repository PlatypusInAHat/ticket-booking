FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5000 5101 5102 5103 5104

CMD ["npm", "start"]
