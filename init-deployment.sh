#!/bin/bash

echo "🚀 Initializing CO Buddy AI deployment..."

# Step 1: Push database schema
echo "📊 Creating database tables..."
npx drizzle-kit push --force

# Step 2: Run initialization script
echo "📥 Importing rate tables and initial data..."
npx tsx server/scripts/initializeDeployment.ts

echo "✅ Deployment initialization complete!"