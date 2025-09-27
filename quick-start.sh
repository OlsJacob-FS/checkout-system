#!/bin/bash

echo "🚀 Quick Start - Checkout System"
echo "================================"
echo ""

# Check if .env files exist
if [ ! -f "backend/.env" ]; then
    echo "❌ Backend .env file not found. Please run ./setup.sh first."
    exit 1
fi

if [ ! -f "frontend/.env" ]; then
    echo "❌ Frontend .env file not found. Please run ./setup.sh first."
    exit 1
fi

echo "✅ Environment files found"
echo ""

# Check if database URL is set
if grep -q "postgresql://username:password@localhost:5432/checkout_system" backend/.env; then
    echo "⚠️  Database URL needs to be updated in backend/.env"
    echo "   Please follow the DATABASE_SETUP.md guide"
    echo ""
fi

# Check if Stripe keys are set
if grep -q "sk_test_your_stripe_secret_key" backend/.env; then
    echo "⚠️  Stripe secret key needs to be updated in backend/.env"
    echo ""
fi

if grep -q "pk_live_your_publishable_key_here" frontend/.env; then
    echo "⚠️  Stripe publishable key needs to be updated in frontend/.env"
    echo ""
fi

echo "📋 Next Steps:"
echo "1. Set up PostgreSQL database (see DATABASE_SETUP.md)"
echo "2. Update backend/.env with your database URL"
echo "3. Get your Stripe publishable key from dashboard"
echo "4. Update frontend/.env with your Stripe publishable key"
echo "5. Run: cd backend && npm run migrate"
echo "6. Run: npm run dev"
echo ""
echo "🌐 Your app will be available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
