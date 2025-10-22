#!/bin/bash

echo "🧹 Cleaning up Chat Application for fresh setup..."

# stop Docker containers
echo "Stopping Docker containers..."
docker-compose down 2>/dev/null || true

# remove Docker volumes
echo "Removing Docker volumes..."
docker volume rm chat_postgres_data 2>/dev/null || true

# remove backend artifacts
echo "Cleaning backend..."
rm -rf backend/venv

# remove frontend artifacts
echo "Cleaning frontend..."
rm -rf frontend/node_modules
rm -rf frontend/.next

echo "✅ Cleanup complete! Ready for fresh setup."
echo ""
echo "Run './setup.sh' to set up the project from scratch."
