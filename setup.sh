#!/bin/bash

# Setup script for Checkout System
echo "🚀 Setting up Checkout System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo "✅ All dependencies installed successfully!"

# Create environment files
echo "📝 Creating environment files..."

# Backend environment
if [ ! -f backend/.env ]; then
    cp backend/env.example backend/.env
    echo "✅ Created backend/.env file"
    echo "⚠️  Please update backend/.env with your actual values"
else
    echo "ℹ️  backend/.env already exists"
fi

# Frontend environment
if [ ! -f frontend/.env ]; then
    cp frontend/env.example frontend/.env
    echo "✅ Created frontend/.env file"
    echo "⚠️  Please update frontend/.env with your actual values"
else
    echo "ℹ️  frontend/.env already exists"
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Set up a PostgreSQL database"
echo "2. Update backend/.env with your database URL and Stripe keys"
echo "3. Update frontend/.env with your Stripe publishable key"
echo "4. Run database migration: cd backend && npm run migrate"
echo "5. Start the development servers: npm run dev"
echo ""
echo "For more information, see the README.md file."
