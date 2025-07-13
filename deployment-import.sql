-- CO Buddy AI Deployment Data Import
-- Run this in your deployment's Database tab

-- Step 1: Create tables (if not exists)
-- Run 'npm run db:push' first in deployment shell

-- Step 2: Import Resource Environmental company
INSERT INTO companies (id, name, domain) 
VALUES (1, 'Resource Environmental', 'resource-env.com') 
ON CONFLICT (id) DO NOTHING;

-- Step 3: Import admin user
INSERT INTO users (id, email, first_name, last_name, role, company_id) 
VALUES ('8c284351-a3ee-4ae6-a17f-f7cbef80400a', 'chase@resource-env.com', 'Chase', 'Tinsley', 'admin', 1) 
ON CONFLICT (id) DO NOTHING;

-- Step 4: Import sample rate tables (you'll need to add the full data)
-- Since rate tables have complex JSON data, you should:
-- 1. Use the app's Rate Tables upload feature after deployment
-- 2. Or export from local database using pg_dump

-- Note: Your deployment needs the actual rate data imported.
-- The easiest way is to:
-- 1. Deploy the app first
-- 2. Log in as admin
-- 3. Upload your rate CSV files through the UI
