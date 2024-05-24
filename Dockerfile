FROM node:18-alpine
WORKDIR .
COPY . /app
WORKDIR /app
RUN npm install
RUN npm install -g typescript
RUN tsc
CMD ["node", "/app/dist/index.js"]
