#!/bin/bash

# Navigate to the directory where the script is located
cd "$(dirname "$0")"

echo "Installing production dependencies..."
npm ci --only=production || npm install --omit=dev

echo "Cleaning up old PM2 processes..."
# This ensures any old crashing process is removed before we start fresh
pm2 delete crm-backend || true

echo "Starting CRM Server in production mode using PM2..."
# This runs the "start:prod" script from your package.json
npm run start:prod

echo "Server deployed successfully."
echo "You can monitor it using: pm2 logs crm-backend"
