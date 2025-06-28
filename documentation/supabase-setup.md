# Supabase Setup Guide for Dermacielo

## Prerequisites

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project in Supabase

## Database Setup

### Step 1: Run Database Migrations

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the content from `supabase/migrations/001_initial_schema.sql`
4. Click "Run" to execute the migration
5. Copy and paste the content from `supabase/migrations/002_sample_data.sql`
6. Click "Run" to execute the sample data migration

### Step 2: Configure Authentication

1. Go to Authentication > Settings in your Supabase dashboard
2. Disable "Enable email confirmations" for development
3. Set the Site URL to your application URL (e.g., `http://localhost:5173` for development)

### Step 3: Create Test Users

Since we're using Supabase Auth, you need to create users through the Authentication panel:

1. Go to Authentication > Users
2. Click "Add user"
3. Create the following test users:

**Administrator:**
- Email: `admin@dermacielo.com`
- Password: `admin123`
- Confirm password: `admin123`

**Cashier:**
- Email: `cajero@dermacielo.com`
- Password: `cajero123`
- Confirm password: `cajero123`

**Cosmetologist:**
- Email: `cosmetologa@dermacielo.com`
- Password: `cosmetologa123`
- Confirm password: `cosmetologa123`

### Step 4: Get Your Project Credentials

1. Go to Settings > API in your Supabase dashboard
2. Copy your Project URL
3. Copy your anon/public API key

### Step 5: Update Environment Variables

Create a `.env.local` file in your project root with:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Database Schema Overview

The database includes the following tables:

### Core Tables
- **users**: System users with role-based access
- **patients**: Patient records and treatment information
- **services**: Available laser hair removal services
- **appointments**: Scheduled appointments and sessions
- **payments**: Payment records and transactions

### Supporting Tables
- **roles**: User roles and permissions (deprecated in favor of simple role field)
- **patient_treatments**: Treatment history tracking
- **monthly_status**: Monthly patient status tracking
- **sucursales**: Clinic branches
- **promotions**: Available promotions and discounts

### Key Features
- **Row Level Security (RLS)**: Enabled on all tables for data security
- **Automatic Timestamps**: Created/updated timestamps on relevant tables
- **Optimized Indexes**: For fast searches and queries
- **Foreign Key Constraints**: Maintaining data integrity

## Sample Data

The migration includes sample data for:
- 10 realistic patient records
- 10 laser hair removal services
- 20 sample appointments
- Payment records for completed appointments
- Treatment history records
- Monthly status tracking
- 3 active promotions

## Testing the Setup

1. Start your development server: `npm run dev`
2. Navigate to the login page
3. Use any of the test user credentials to log in
4. Verify that you can see the sample data in the dashboard

## Troubleshooting

### Common Issues

1. **RLS Policies**: If you get permission errors, check that RLS policies are properly configured
2. **User Profile Creation**: The app automatically creates user profiles when users first log in
3. **Sample Data**: If sample data doesn't appear, ensure both migration files were executed successfully

### Useful SQL Queries

Check if tables were created:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Check sample data:
```sql
SELECT COUNT(*) as patient_count FROM patients;
SELECT COUNT(*) as appointment_count FROM appointments;
SELECT COUNT(*) as payment_count FROM payments;
```

Verify RLS is enabled:
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
```

## Production Considerations

1. **Environment Variables**: Use production Supabase credentials
2. **Email Confirmations**: Enable email confirmations in production
3. **Rate Limiting**: Configure appropriate rate limits
4. **Backup Strategy**: Set up automated backups
5. **Monitoring**: Enable logging and monitoring