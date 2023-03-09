FROM node:14.21
WORKDIR /usr/app
COPY package.json .
RUN npm install --quiet
COPY . .