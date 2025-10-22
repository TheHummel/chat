#!/bin/bash

# colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# cleanup background processes on exit
cleanup() {
    print_warning "Shutting down services..."
    # Kill all background jobs
    jobs -p | xargs -r kill
    # Stop docker compose
    docker-compose down
    exit 0
}

# set up trap to cleanup on exit
trap cleanup SIGINT SIGTERM EXIT

# Check if required commands exist
command -v docker compose >/dev/null 2>&1 || { print_error "docker compose is required but not installed. Aborting."; exit 1; }


# get directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

print_status "Starting development environment..."

# start Docker Compose in the background
print_status "Starting Docker Compose (PostgreSQL)..."
docker compose up -d
if [ $? -ne 0 ]; then
    print_error "Failed to start Docker Compose"
    exit 1
fi

# wait for PostgreSQL to start
print_status "Waiting for PostgreSQL to be ready..."
sleep 3

# start frontend in background
print_status "Starting frontend (Next.js)..."
(
    cd frontend
    
    # setup Node.js environment
    # try to source shell config for Node version managers (nvm, volta, fnm, etc.)
    if [ -f "$HOME/.zshrc" ]; then
        source "$HOME/.zshrc" 2>/dev/null || true
    elif [ -f "$HOME/.bashrc" ]; then
        source "$HOME/.bashrc" 2>/dev/null || true
    fi

    # Volta setup (if using Volta)
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
    
    # verify node and pnpm are available
    if ! command -v node >/dev/null 2>&1; then
        print_error "Node.js not found. Please install Node.js first."
        exit 1
    fi
    
    if ! command -v pnpm >/dev/null 2>&1; then
        print_error "pnpm not found. Please install pnpm first."
        exit 1
    fi
    
    print_status "Installing frontend dependencies..."
    pnpm install 2>&1 | sed 's/^/[FRONTEND] /'
    print_status "Starting frontend development server..."
    pnpm run dev 2>&1 | sed 's/^/[FRONTEND] /'
) &
FRONTEND_PID=$!

# Start backend in background
print_status "Starting backend (FastAPI)..."
(
    cd backend
    print_status "Installing backend dependencies..."
    pip install --upgrade -r requirements.txt > /dev/null 2>&1
    print_status "Starting backend development server..."
    python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 2>&1 | sed 's/^/[BACKEND] /'
) &
BACKEND_PID=$!

print_status "All services starting..."
print_status "Frontend will be available at: ${BLUE}http://localhost:3000${NC}"
print_status "Backend will be available at: ${BLUE}http://localhost:8000${NC}"
print_status "PostgreSQL is running on: ${BLUE}localhost:5432${NC}"
print_status ""
print_warning "Press Ctrl+C to stop all services"
print_status ""

# Wait for background processes
wait $FRONTEND_PID $BACKEND_PID
