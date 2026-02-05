FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
# Use --legacy-peer-deps to avoid potential conflicts with older packages if any
RUN npm install --legacy-peer-deps

COPY . .

# Build the application
RUN npm run build

EXPOSE 3000

# Start server
CMD ["npm", "start"]
