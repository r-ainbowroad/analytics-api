FROM node:18-alpine
WORKDIR .
COPY . /sweetiedrops
WORKDIR /sweetiedrops
RUN npm install
RUN npm install -g typescript
RUN tsc
CMD ["node", "/sweetiedrops/dist/index.js"]
