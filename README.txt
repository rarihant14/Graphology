# Graphology AI

AI-powered handwriting analysis system using Gemini AI.

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm
- Git

## Clone the Repository

git clone https://github.com/rarihant14/Graphology.git
cd Graphology

##Backend Setup

- Install dependencies:
pip install -r backend/requirements.txt

- Start the backend server:
cd backend
uvicorn main:app --reload

(Backend runs on http://127.0.0.1:8000)


##Frontend Setup
- Install dependencies:
cd frontend
npm install

- Start the frontend:
npm run dev

(Frontend runs on  http://localhost:5173)

## Tech Stack

- FastAPI
- React + Vite
- Gemini AI
- SQLite
- SQLAlchemy