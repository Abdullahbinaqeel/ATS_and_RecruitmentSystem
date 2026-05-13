#!/bin/bash
# ============================================================
# run.sh — Start both backend and frontend servers
# Usage: ./run.sh
# ============================================================

# Resolve the absolute path to this script's directory
# This makes the script work no matter where you run it from
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=============================================="
echo "  TalentBridge ATS — Starting All Services"
echo "=============================================="

# Start the backend server in a subshell
echo ""
echo "▶ Starting Backend (Node.js on port 5000)..."
(cd "$ROOT_DIR/backend" && npm run dev) &
BACKEND_PID=$!

# Give the backend 2 seconds to initialize before launching the frontend
sleep 2

# Start the frontend React dev server in a subshell
echo "▶ Starting Frontend (React on port 3000)..."
(cd "$ROOT_DIR/frontend" && npm start) &
FRONTEND_PID=$!

echo ""
echo "=============================================="
echo "  Backend  → http://localhost:5000"
echo "  Frontend → http://localhost:3000"
echo "  Press Ctrl+C to stop both servers."
echo "=============================================="

# Trap Ctrl+C (SIGINT) and terminate signal to cleanly stop both servers
trap 'echo -e "\n\nStopping all servers..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' SIGINT SIGTERM

# Wait for both processes to exit
wait $BACKEND_PID $FRONTEND_PID
