FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# Use --host to make the server accessible from outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
