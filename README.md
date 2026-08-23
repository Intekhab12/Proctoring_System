# Proctoring System - Authentication and Profile Management

This is the foundational layer for the Proctoring System, featuring user authentication, role management (Examiner/Candidate), and profile management.

## Tech Stack
- **Backend**: Django, Django REST Framework, SQLite (configurable to PostgreSQL via `.env`), simplejwt.
- **Frontend**: React (Vite), React Router, Material-UI, Axios.

## Prerequisites
- Node.js (v18+)
- Python (3.10+)

## Setup Instructions

### 1. Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. (Optional) Database Setup:
   By default, it uses SQLite. To use PostgreSQL, create a `.env` file in the `backend/config` directory (or next to `manage.py`) with:
   ```env
   POSTGRES_DB=your_db_name
   POSTGRES_USER=your_db_user
   POSTGRES_PASSWORD=your_db_password
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   ```
   And make sure to install `psycopg` via `pip install psycopg[binary]`.
5. Run migrations:
   ```bash
   python manage.py makemigrations users
   python manage.py migrate
   ```
6. Start the server:
   ```bash
   python manage.py runserver
   ```
   The backend will be running at `http://localhost:8000`.

### 2. Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure `.env` exists in the `frontend` root with:
   ```env
   VITE_API_URL=http://localhost:8000
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will be running at `http://localhost:5173`.

## Features
- **JWT Authentication**: Login, Signup, Token Refresh.
- **Forgot Password**: Simulates OTP sent via email (printed to the backend console).
- **Profile Management**: View/Update profile details, upload profile picture.
- **Account Deletion**: Soft delete functionality requiring password confirmation.
- **Roles**: Dashboard displays if a user is an Examiner or Candidate.