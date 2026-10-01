#!/bin/bash
echo "Starting CRM Application on VPS..."

# 1. Install dependencies (just in case they were updated)
echo "Installing NPM dependencies..."
npm install

# 2. Build the frontend for production
echo "Building the frontend..."
npm run build

# 3. Check if PM2 is installed globally, and install if it is missing
if ! command -v pm2 &> /dev/null
then
    echo "PM2 not found. Installing PM2 globally..."
    sudo npm install -g pm2
fi

# 4. Stop any existing instances of the app to prevent duplicates
echo "Stopping existing PM2 instances..."
pm2 stop ecosystem.config.cjs 2>/dev/null || true

# 5. Start the backend server using PM2 (via the ecosystem file)
echo "Starting backend via PM2..."
pm2 start ecosystem.config.cjs

# 6. Save the PM2 processes so they reboot on server crash
echo "Saving PM2 configuration..."
pm2 save

echo "Setup complete! Your CRM is now running in the background."
