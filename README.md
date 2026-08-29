# 🛡️ ProctorBuddy — AI-Powered Online Examination & Proctoring Platform

**ProctorBuddy** is a comprehensive, full-stack assessment and automated proctoring platform designed for educational institutions and organizations. It provides end-to-end management of online tests—from exam creation, question palette design, and candidate whitelisting to real-time AI-assisted proctoring, manual grading, dispute resolution, and result publication.

---

## 📑 Table of Contents
- [Key Features](#-key-features)
  - [1. User Roles & Authentication](#1-user-roles--authentication)
  - [2. Examiner Hub & Assessment Management](#2-examiner-hub--assessment-management)
  - [3. Candidate Testing Experience](#3-candidate-testing-experience)
  - [4. AI Proctoring & Anti-Cheating Engine](#4-ai-proctoring--anti-cheating-engine)
  - [5. Evaluation & Manual Grading Studio](#5-evaluation--manual-grading-studio)
  - [6. Two-Way Dispute Resolution System](#6-two-way-dispute-resolution-system)
  - [7. Notifications & SMTP Email Alerts](#7-notifications--smtp-email-alerts)
- [Tech Stack](#-tech-stack)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup-django--drf)
  - [2. Frontend Setup](#2-frontend-setup-react--vite)
- [Proctoring Rules & Warning Policy](#-proctoring-rules--warning-policy)
- [Environment Variables Guide](#-environment-variables-guide)

---

## ✨ Key Features

### 1. User Roles & Authentication
- **Role Selection on Signup**: Users choose their role (**Student / Candidate** or **Examiner / Instructor**) during registration.
- **JWT Authentication**: Secure login, token refresh, and protected private routes.
- **Password Reset**: OTP verification workflow via email (console in development, SMTP in production).
- **Profile Management**: Profile editing, avatar upload, and account deletion.

### 2. Examiner Hub & Assessment Management
- **Exam Creation Wizard**: Step-by-step creation with exam duration, scheduling window, description, and guidelines.
- **Interactive Question Palette Editor**: Add text questions with attached reference images, manage question ordering, and delete items.
- **Candidate Roster Management**: Whitelist candidates by individual email address or bulk CSV upload.
- **Shareable Exam Links**: Generate unique registration links for direct candidate signups.
- **Publish / Draft Toggle**: Control when exams become visible and accessible to candidates.

### 3. Candidate Testing Experience
- **Pre-Exam Device Verification**: Hardware diagnostic checks for camera and microphone access before entering tests.
- **Strict Full-Screen Interface**: Dedicated distraction-free exam mode.
- **Question Palette Sidebar**: Live status tracking for every question (🟢 *Answered*, 🔵 *Current*, ⚪ *Unanswered*).
- **Interactive Digital Whiteboard**: Built-in canvas for drawing diagrams, equations, and sketches saved directly alongside text answers.
- **Real-Time Auto-Save**: Answers and whiteboard drawings are continuously saved to prevent data loss.

### 4. AI Proctoring & Anti-Cheating Engine
- **Face Detection & Head Pose**: MediaPipe vision models detect single face presence, multiple faces, and head turns.
- **Audio Monitoring & Spike Detection**: Web Audio API with RMS baseline monitoring detects background speech, whispers, and sudden noises.
- **Full Session Video & Audio Recording**: Captures candidate webcam and microphone streams in WebM format with metadata duration patching.
- **3-Strike Violation Policy**:
  - **Tab switching**, **Alt-screen / Window blur**, and **Exiting Full-Screen** increment the strike count. Exceeding **3 strikes** triggers automatic exam submission.
  - Environmental notices (audio noise, looking away, multiple faces) trigger advisory on-screen warnings and log video timestamped incidents for examiner review without counting towards the auto-submit limit.

### 5. Evaluation & Manual Grading Studio
- **Detailed Submission Reviews**: View candidate text answers, rendered whiteboard drawings, full-session proctoring video playback, and timestamped incident logs.
- **Question-by-Question Grading**: Assign marks and custom constructive feedback for each answer.
- **Bulk & Individual Result Publishing**: Publish scores to students with automated email notifications.

### 6. Two-Way Dispute Resolution System
- **Raise Disputes**: Candidates can challenge grades or proctoring flags on specific questions or overall submissions.
- **Interactive Dispute Chat**: Live threaded communication between student and examiner to resolve grading concerns directly within the platform.

### 7. Notifications & SMTP Email Alerts
- **In-App Notification Bell**: Real-time unread alerts for exam invitations, published scores, and dispute responses.
- **Production SMTP Support**: Dispatches OTPs and exam notifications to candidate inboxes when SMTP credentials are provided.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Material-UI (MUI v6), Lucide / MUI Icons, Axios, `face-api.js`, `@mediapipe/tasks-vision`, `fix-webm-duration` |
| **Backend** | Python 3.10+, Django 5, Django REST Framework (DRF), SimpleJWT, SQLite / PostgreSQL |
| **Styling & Theme** | Obsidian Black & Ruby Crimson aesthetic (`#09090B`, `#0F172A`, `#E11D48`, `#EF4444`) with responsive typography and glassmorphism accents |

---

## 🏗️ Project Architecture

```
Proctoring_System/
├── backend/
│   ├── config/              # Django settings, WSGI/ASGI, URLs
│   ├── users/               # Custom User model, Auth serializers, OTP logic, Views
│   ├── exams/               # Exam models, Questions, Submissions, Grading, Proctoring logs, Disputes
│   ├── media/               # Uploaded candidate recordings, evidence screenshots, question images
│   ├── requirements.txt     # Python backend dependencies
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios instances and API services (auth, exams, disputes)
│   │   ├── components/
│   │   │   ├── auth/        # Login, Signup, ForgotPassword, Profile
│   │   │   ├── candidate/   # TakeExam, ProctoringMonitor, Whiteboard, CandidateResults, MyTests
│   │   │   ├── exam/        # ExamDashboard, ExamDetail, CreateExamWizard, GradingPage, SubmissionsList
│   │   │   └── common/      # Navbar, DisputeChatModal, NotificationBell
│   │   ├── context/         # AuthContext & global state
│   │   ├── App.jsx          # Route declarations & MUI Dark/Light theme configuration
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.x or higher)
- **Python** (v3.10 or higher)
- **Git**

---

### 1. Backend Setup (Django + DRF)

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Create your `.env` configuration file in `backend/` (refer to `.env.example`):
   ```env
   SECRET_KEY=your-django-secret-key
   DEBUG=True
   ALLOWED_HOSTS=localhost,127.0.0.1

   # Optional SMTP credentials for sending live emails:
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_HOST_USER=your_email@gmail.com
   EMAIL_HOST_PASSWORD=your_app_password
   DEFAULT_FROM_EMAIL=ProctorBuddy <your_email@gmail.com>
   ```

5. Apply database migrations:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. Start the Django backend development server:
   ```bash
   python manage.py runserver
   ```
   *The backend API will run at `http://localhost:8000`.*

---

### 2. Frontend Setup (React + Vite)

1. In a new terminal window, navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install Node modules:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend application will be live at `http://localhost:5173`.*

---

## 🚨 Proctoring Rules & Warning Policy

| Violation Type | Severity | Action Taken |
|---|---|---|
| **Tab Switching (`tab_switch`)** | 🔴 Strike | Increments warning counter (1/3, 2/3). Reaching **3 strikes** immediately auto-submits exam. |
| **Alt-Screen / Window Blur (`window_blur`)** | 🔴 Strike | Increments warning counter. Reaching **3 strikes** immediately auto-submits exam. |
| **Exiting Full Screen (`fullscreen_exit`)** | 🔴 Strike | Increments warning counter. Reaching **3 strikes** immediately auto-submits exam. |
| **No Face Visible (`no_face_visible`)** | 🟡 Notice | On-screen warning alert; logs evidence snapshot for examiner review (does **not** increment strikes). |
| **Multiple Faces Detected (`multiple_faces`)** | 🟡 Notice | On-screen warning alert; logs evidence snapshot for examiner review (does **not** increment strikes). |
| **Audio Spikes / Talking (`audio_spike` / `talking`)** | 🟡 Notice | On-screen warning alert; logs audio timestamp for examiner review (does **not** increment strikes). |

---

## ⚙️ Environment Variables Guide

### Backend (`backend/.env`)
```env
# Django Settings
SECRET_KEY=your_secret_key_here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (Leave empty for default SQLite)
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_HOST=
POSTGRES_PORT=

# Email SMTP Setup (Optional - Falls back to console output if omitted)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=ProctorBuddy <no-reply@proctorbuddy.com>
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:8000
```

---

## 📄 License
This project is developed for educational assessment and proctoring purposes. All rights reserved.