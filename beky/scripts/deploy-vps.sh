#!/bin/bash

# Complete VPS Deployment Script for CSMS Application
# Run this script on your Ubuntu VPS after initial setup

set -e

VPS_USER="ubuntu"
APP_DIR="/home/$VPS_USER/csms-app"
SERVICE_NAME="csms"

echo "=== CSMS VPS Deployment Script ==="
echo "Application Directory: $APP_DIR"
echo "Service Name: $SERVICE_NAME"
echo

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Please run this script from your Next.js project directory."
  exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo "❌ Error: .env file not found. Please create it first using beky/config/.env.production as template."
  exit 1
fi

echo "✅ Project files verified."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Build the application
echo "🏗️ Building application..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed! Please fix build errors and try again."
  exit 1
fi

echo "✅ Application built successfully."

# Setup systemd service
if [ -f "beky/config/csms.service" ]; then
  echo "⚙️ Setting up systemd service..."
  sudo cp beky/config/csms.service /etc/systemd/system/
  
  # Update service file with correct user and paths
  sudo sed -i "s|User=ubuntu|User=$VPS_USER|g" /etc/systemd/system/csms.service
  sudo sed -i "s|Group=ubuntu|Group=$VPS_USER|g" /etc/systemd/system/csms.service
  sudo sed -i "s|WorkingDirectory=/home/ubuntu/csms-app|WorkingDirectory=$APP_DIR|g" /etc/systemd/system/csms.service
  sudo sed -i "s|ReadWritePaths=/home/ubuntu/csms-app|ReadWritePaths=$APP_DIR|g" /etc/systemd/system/csms.service
  
  sudo systemctl daemon-reload
  sudo systemctl enable $SERVICE_NAME
  
  echo "✅ Systemd service configured."
fi

# Setup Nginx if config exists
if [ -f "beky/config/nginx.conf" ]; then
  echo "🌐 Setting up Nginx..."
  
  # Install Nginx if not already installed
  if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    sudo apt update
    sudo apt install -y nginx
  fi
  
  # Copy and configure Nginx
  sudo cp beky/config/nginx.conf /etc/nginx/sites-available/$SERVICE_NAME
  
  # Enable site
  sudo ln -sf /etc/nginx/sites-available/$SERVICE_NAME /etc/nginx/sites-enabled/
  
  # Remove default site if it exists
  sudo rm -f /etc/nginx/sites-enabled/default
  
  # Test Nginx configuration
  sudo nginx -t
  
  if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration valid."
  else
    echo "❌ Nginx configuration invalid. Please check the config file."
    exit 1
  fi
fi

# Start services
echo "🚀 Starting services..."

# Start application service
sudo systemctl start $SERVICE_NAME
sleep 5

# Check if service is running
if sudo systemctl is-active --quiet $SERVICE_NAME; then
  echo "✅ $SERVICE_NAME service started successfully."
else
  echo "❌ $SERVICE_NAME service failed to start. Checking logs..."
  sudo journalctl -u $SERVICE_NAME --no-pager -l
  exit 1
fi

# Start Nginx if configured
if [ -f "/etc/nginx/sites-available/$SERVICE_NAME" ]; then
  sudo systemctl enable nginx
  sudo systemctl restart nginx
  
  if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx started successfully."
  else
    echo "❌ Nginx failed to start. Checking logs..."
    sudo journalctl -u nginx --no-pager -l
  fi
fi

# Check if application is responding
echo "🔍 Testing application..."
sleep 10

# Test local connection
if curl -f http://localhost:9002 > /dev/null 2>&1; then
  echo "✅ Application responding on port 9002."
else
  echo "⚠️ Application not responding on port 9002. Check logs:"
  sudo journalctl -u $SERVICE_NAME --no-pager -l
fi

# Final status check
echo
echo "=== Deployment Status ==="
echo "🔧 Service Status:"
sudo systemctl status $SERVICE_NAME --no-pager -l

if command -v nginx &> /dev/null; then
  echo
  echo "🌐 Nginx Status:"
  sudo systemctl status nginx --no-pager -l
fi

echo
echo "=== Deployment Complete! ==="
echo "✅ Application deployed successfully"
echo "✅ Systemd service configured and running"
if [ -f "/etc/nginx/sites-available/$SERVICE_NAME" ]; then
  echo "✅ Nginx configured and running"
fi
echo
echo "📋 Application Information:"
echo "- Local URL: http://localhost:9002"
echo "- Service: $SERVICE_NAME"
echo "- Directory: $APP_DIR"
echo
echo "🔧 Useful Commands:"
echo "- Check logs: sudo journalctl -u $SERVICE_NAME -f"
echo "- Restart app: sudo systemctl restart $SERVICE_NAME"
echo "- Stop app: sudo systemctl stop $SERVICE_NAME"
echo "- View status: sudo systemctl status $SERVICE_NAME"
echo
echo "🔧 Next Steps:"
echo "1. Update your domain DNS to point to this VPS"
echo "2. Update NEXT_PUBLIC_API_URL in .env to use your domain"
echo "3. Setup SSL certificate with: sudo certbot --nginx -d your-domain.com"
echo "4. Test all application features"
echo
echo "🌍 Access your application at:"
if [ -f "/etc/nginx/sites-available/$SERVICE_NAME" ]; then
  echo "- Via Nginx: http://$(curl -s ifconfig.me) (or your domain)"
fi
echo "- Direct: http://$(curl -s ifconfig.me):9002"