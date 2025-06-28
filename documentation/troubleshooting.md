# Troubleshooting Login Issues

## Invalid Login Credentials Error

If you're getting an "Invalid login credentials" error when trying to log in, follow these steps:

### Step 1: Verify Supabase Project Configuration

1. Go to your Supabase project dashboard at [supabase.com](https://supabase.com)
2. Navigate to **Settings > API**
3. Copy your **Project URL** and **anon/public key**
4. Make sure these match the values in your `.env` file

### Step 2: Create Test Users

The application expects these test users to exist in your Supabase project:

1. Go to **Authentication > Users** in your Supabase dashboard
2. Click **"Add user"** and create these users:

**Administrator:**
- Email: `admin@dermacielo.com`
- Password: `admin123`

**Cashier:**
- Email: `cajero@dermacielo.com`
- Password: `cajero123`

**Cosmetologist:**
- Email: `cosmetologa@dermacielo.com`
- Password: `cosmetologa123`

### Step 3: Disable Email Confirmations

1. Go to **Authentication > Settings**
2. Find **"Enable email confirmations"**
3. **Disable** this setting for development

### Step 4: Check Your Environment File

Make sure your `.env` file contains the correct credentials:

```env
VITE_SUPABASE_URL=your_actual_project_url
VITE_SUPABASE_ANON_KEY=your_actual_anon_key
```

### Step 5: Restart Development Server

After making changes:
1. Stop your development server (Ctrl+C)
2. Restart it with `npm run dev`

### Common Issues

- **Wrong Supabase Project**: Make sure you're using the correct project URL and key
- **Users Not Created**: Test users must be manually created in Supabase Auth panel
- **Email Confirmation Enabled**: This must be disabled for development
- **Cached Environment Variables**: Restart the dev server after changing `.env`

### Test Login

Try logging in with:
- **Email**: `admin@dermacielo.com`
- **Password**: `admin123`

If you continue having issues, double-check that:
1. Your Supabase project is active
2. The database migrations have been run
3. The authentication settings are configured correctly