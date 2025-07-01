# Database Setup with Drizzle ORM

## Prerequisites

1. You need a PostgreSQL database (Supabase recommended)
2. Set your DATABASE_URL in `.env.local`

## Setting up DATABASE_URL

For Supabase, your DATABASE_URL should look like:
```
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres
```

To find your database password:
1. Go to your Supabase project dashboard
2. Go to Settings > Database
3. Under "Connection string", you'll find your connection details
4. Replace `[YOUR_PASSWORD]` with your database password

## Database Setup Commands

1. **Push schema to database** (creates tables):
   ```bash
   npm run db:push
   ```

2. **Generate migrations** (optional):
   ```bash
   npm run db:generate
   ```

3. **Open Drizzle Studio** (database GUI):
   ```bash
   npm run db:studio
   ```

## Tables Created

- `users` - User accounts linked to Clerk
- `documents` - User documents
- `chats` - Chat messages
- `brain_metrics` - User analytics

## Usage

Once the database is set up, the application will automatically use Drizzle ORM for all database operations.