# MongoDB Cleanup Script
# Run this to clear old data from your database

# Instructions:
# 1. Go to https://cloud.mongodb.com/
# 2. Login to your account
# 3. Click on your cluster (Cluster0)
# 4. Click "Browse Collections"
# 5. Find old/unused databases and delete them

# OR use MongoDB Compass:
# 1. Download MongoDB Compass: https://www.mongodb.com/try/download/compass
# 2. Connect with your connection string
# 3. Browse databases and delete old ones
# 4. Or delete old collections you don't need

# Connection String (from .env):
# mongodb+srv://sdsameer:db786@cluster0.uarb4bf.mongodb.net/

# Steps to Free Up Space:
# =====================

# 1. Check what databases exist:
#    - Go to MongoDB Atlas Dashboard
#    - Click "Browse Collections"
#    - See all databases and their sizes

# 2. Delete old databases:
#    - If you have old test databases, delete them
#    - Keep only "college-messaging" database

# 3. Delete old collections in college-messaging:
#    - If you have old messages, delete them
#    - Keep the schema but clear old data

# 4. Or use a new free cluster:
#    - Create a new MongoDB Atlas cluster (free tier)
#    - Get new connection string
#    - Update .env file

# =====================
# Quick Fix Commands
# =====================

# If you have MongoDB shell access, run:
# use college-messaging
# db.messages.deleteMany({})  # Clear all old messages
# db.students.deleteMany({})  # Clear all old students
# db.admins.deleteMany({})    # Clear all old admins

# This will free up space while keeping the database structure
