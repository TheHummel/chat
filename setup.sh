#!/bin/bash

echo "Setting up Chat Application with Persistent Memory..."

# Setup backend
echo "Setting up backend..."
cd backend

# create venv if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# activate venv
source venv/bin/activate

# install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create .env file
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "Please edit .env file with your actual database URL and API keys"
fi

cd ..

# Setup frontend
echo "Setting up frontend..."

# setup Node.js environment
if [ -d "$HOME/.volta" ]; then
    export VOLTA_HOME="$HOME/.volta"
    export PATH="$VOLTA_HOME/bin:$PATH"
    # try using Volta's default node directly if available
    if [ -d "$HOME/.volta/tools/image/node" ]; then
        VOLTA_NODE_DEFAULT=$(ls -t "$HOME/.volta/tools/image/node" | head -1)
        if [ -n "$VOLTA_NODE_DEFAULT" ]; then
            export PATH="$HOME/.volta/tools/image/node/$VOLTA_NODE_DEFAULT/bin:$PATH"
        fi
    fi
fi

cd frontend

# verify node and pnpm are available
if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js not found. Please install Node.js first."
    echo "Visit https://nodejs.org/ or use a version manager like nvm, volta, or fnm"
    exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
    echo "pnpm not found. Installing pnpm..."
    npm install -g pnpm
fi

echo "Installing frontend dependencies..."
pnpm install

cd ..

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with database URL and frontend/.env with API keys"
echo "2. Run './start-dev.sh' to start the development servers"
