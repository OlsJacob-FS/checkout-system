# Checkout System

A professional shopping website with Stripe checkout and personal shops.

## Features

- 🛍️ Personal shop creation and management
- 💳 Stripe payment processing
- 🔐 User authentication
- 📱 Responsive design
- 🎨 Modern UI/UX

## Tech Stack

- **Frontend**: React.js, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Payments**: Stripe
- **Authentication**: JWT

## Quick Start

1. Install dependencies:
```bash
npm run install-all
```

2. Set up environment variables:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Start development servers:
```bash
npm run dev
```

## Environment Variables

### Backend (.env)
```
PORT=5000
DB_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

## Database Setup

1. Create a PostgreSQL database
2. Update the DB_URL in backend/.env
3. Run migrations: `cd backend && npm run migrate`

## Stripe Setup

1. Create a Stripe account
2. Get your API keys from the Stripe dashboard
3. Add them to your environment variables
4. Set up webhook endpoints for payment processing
