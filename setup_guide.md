# School Management System (SMS) Local Setup Guide

This guide will help you complete the setup of the School Management System inside your IDE (e.g., VS Code or PyCharm).

Since the repository is already cloned, the `.env` file is created, and the Python virtual environment (`venv`) has been initialized, you can follow these steps in your IDE terminal.

---

## Part 1: Backend Setup

### 1. Open the Project in your IDE
Open the folder `C:\Users\adeye\Desktop\projects\School_managment_system` in your IDE.

### 2. Open the Terminal in your IDE
Open a new terminal session. By default on Windows, this is usually **PowerShell** or **Command Prompt (CMD)**.

### 3. Activate the Virtual Environment
Activate the environment we created by running the appropriate command:

* **If using PowerShell:**
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
  *(Note: If you get an execution policy error, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first.)*

* **If using Command Prompt (CMD):**
  ```cmd
  venv\Scripts\activate.bat
  ```

You will see `(venv)` prepended to your command prompt line once activated.

### 4. Install Dependencies (if not already completed)
If dependencies aren't fully installed yet, run:
```bash
pip install -r requirements.txt
```

### 5. Run Database Migrations
This command creates all the tables (students, classes, finance, etc.) in your PostgreSQL `sms_db` database:
```bash
alembic upgrade head
```

### 6. Seed the Super Admin Account
Create the initial Super Admin account (`superadmin@school.com` with password `Admin@1234`):
```bash
python seed.py
```

### 7. Run the FastAPI Backend Server
Start the development server:
```bash
uvicorn app.main:app --reload
```
The API documentation will be available at: http://localhost:8000/docs

---

## Part 2: Frontend Setup

Open a **new terminal tab** in your IDE and run these commands to set up the Next.js frontend:

### 1. Navigate to the Frontend Directory
```bash
cd frontend
```

### 2. Install Node Dependencies
```bash
npm install
```

### 3. Create the Local Environment File
Copy the example environment file:
```cmd
copy .env.example .env.local
```
*(By default, this file points `API_PROXY_TARGET` to `http://localhost:8000` which matches your local backend.)*

### 4. Start the Frontend Development Server
```bash
npm run dev
```
The frontend interface will be available at: http://localhost:3000

---

## Default Login Credentials
Once both servers are running, visit http://localhost:3000 and log in with:
* **Email:** `superadmin@school.com`
* **Password:** `Admin@1234`
