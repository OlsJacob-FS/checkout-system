# Database Setup Guide

## Option 1: Local PostgreSQL Installation

### macOS (using Homebrew):
```bash
brew install postgresql
brew services start postgresql
createdb checkout_system
```

### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb checkout_system
```

### Windows:
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Install and create a database named `checkout_system`

## Option 2: Cloud Database (Recommended)

### Supabase (Free tier available):
1. Go to https://supabase.com
2. Create a new project
3. Get your connection string from Settings > Database
4. Update `DB_URL` in backend/.env

### Railway (Free tier available):
1. Go to https://railway.app
2. Create a new PostgreSQL database
3. Get your connection string
4. Update `DB_URL` in backend/.env

### Neon (Free tier available):
1. Go to https://neon.tech
2. Create a new database
3. Get your connection string
4. Update `DB_URL` in backend/.env

## After Database Setup:

1. Update your `backend/.env` file with the correct `DB_URL`
2. Run the migration:
   ```bash
   cd backend
   npm run migrate
   ```

## Example DB_URL formats:
- Local: `postgresql://username:password@localhost:5432/checkout_system`
- Supabase: `postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres`
- Railway: `postgresql://postgres:[password]@[host]:[port]/railway`
- Neon: `postgresql://[user]:[password]@[host]/[database]?sslmode=require`
