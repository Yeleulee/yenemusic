#!/bin/bash

# Make sure Supabase CLI is installed
# npm install -g supabase

# Deploy the YouTube Edge Function
echo "Deploying YouTube Edge Function..."
supabase functions deploy youtube --project-ref your-project-ref

# Set secret for YouTube API Key
echo "Setting up YouTube API Key secret..."
supabase secrets set YOUTUBE_API_KEY=your-youtube-api-key --project-ref your-project-ref

echo "Deployment completed successfully!" 