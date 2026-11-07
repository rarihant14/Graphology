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

## Handwriting observation output

`POST /api/analyze` returns schema version `2.0`: an image assessment and exactly
70 evidence-backed handwriting observations. Each observation includes its
controlled value, confidence, assessability, and concise visual evidence.
Features that cannot be evaluated remain `unknown` (or use the feature's
documented `indeterminate` / `not_assessable` value); they are never guessed.
The analysis output describes visible handwriting only and does not produce
personality or psychological conclusions.

The report page displays all observations grouped by category, and the copy
action exports the complete JSON payload. The PDF download and saved history
use the same observation report.

## Product prompt

See [docs/APP_PROMPT.md](docs/APP_PROMPT.md) for the detailed product, design, data, PDF, and acceptance prompt for Graphology AI.
