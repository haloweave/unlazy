# How to Switch from localStorage to Database

Currently the app uses localStorage for document storage during development. When you're ready to switch to database storage, follow these steps:

## 1. Set up your DATABASE_URL

Add your PostgreSQL connection string to `.env.local`:
```bash
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres
```

## 2. Push the schema to your database

```bash
npm run db:push
```

This will create all the necessary tables in your database.

## 3. Uncomment database code

### In `src/app/api/documents/route.ts`:
- Uncomment the database imports at the top
- Uncomment all the database query code (marked with TODO comments)
- Comment out the localStorage simulation code

### In `src/app/write/page.tsx`:
- Uncomment the database version code in `saveDocument`, `loadDocuments`, and `deleteDocument` functions
- Comment out the localStorage code

## 4. Test the migration

The API endpoints are already set up and will work immediately once you uncomment the database code. Your localStorage data won't be migrated automatically - users will start with a clean slate in the database.

## 5. Optional: Data migration

If you want to migrate existing localStorage data, you could create a one-time migration script or add a migration feature to the app that reads localStorage and saves to the database on first login.

## Files to modify:
- `src/app/api/documents/route.ts` - Uncomment database queries
- `src/app/write/page.tsx` - Uncomment database functions

The Drizzle ORM setup is complete and ready to use!