FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy rest of the code
COPY . .

# Expose port (change if your app uses different port)
EXPOSE 5000

# Start the app
CMD ["npm", "start"]