FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3050
ENV PORT=3050
ENV NODE_ENV=production
CMD ["npm", "run", "start"]
