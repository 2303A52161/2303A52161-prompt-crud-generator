# ⚙️ CRUD Architect — Full-Stack CRUD Generator

> Sign in → describe your app → get entities, REST APIs, database schema & FastAPI code instantly.

---

## 📁 Project Structure

```
crud-architect/
│
├── main.py              ← FastAPI entry point (serves API + frontend)
├── routes.py            ← POST /api/generate  &  GET /api/health
├── models.py            ← Pydantic request/response schemas
├── utils.py             ← Helper functions
│
├── ai_engine/
│   ├── generator.py     ← Core engine (AI → template fallback)
│   ├── prompt_builder.py← Builds AI system + user prompt
│   └── parser.py        ← Validates & normalises AI JSON output
│
├── static/              ← Frontend (served by FastAPI)
│   ├── login.html       ← Sign in / Sign up page
│   ├── index.html       ← Main app (sidebar + chat UI)
│   ├── style.css        ← Shared stylesheet
│   ├── auth.js          ← localStorage-based authentication
│   ├── app.js           ← Sidebar, projects, chats, modals
│   └── chat.js          ← Calls /api/generate, renders output
│
├── render.yaml          ← One-click Render deployment config
├── requirements.txt
├── .gitignore
└── README.md
```

---

## 🚀 Deploy on Render (Step-by-Step)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<your-username>/crud-architect.git
git push -u origin main
```

### 2. Create a new Web Service on Render
1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo
3. Render auto-detects `render.yaml` — confirm these settings:
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Click **Create Web Service**
5. Wait ~2 minutes → your live URL is ready!

### 3. (Optional) Add AI API Key
- In Render dashboard → your service → **Environment**
- Add `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
- The app works **without a key** using built-in templates

---

## 💻 Run Locally

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

Open: http://localhost:8000

---

## 🔑 How Authentication Works

- Sign up / Sign in → stored in **browser localStorage** (no database needed)
- Each user gets their own chats, projects, and artifacts
- Works on any hosting with zero backend auth setup

---

## 🔄 How Generation Works

1. User types a prompt (e.g. *"Build a student management system"*)
2. Frontend `POST /api/generate` → FastAPI backend
3. Backend checks for `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`
   - **Key found** → calls AI API → parses JSON response
   - **No key**    → uses built-in template library (6 apps + dynamic fallback)
4. Returns: entities, REST endpoints, DB schema, suggestions, FastAPI code
5. Frontend renders everything in a rich chat message with copy button

---

## 📡 API Reference

**`POST /api/generate`**
```json
Request:  { "prompt": "Build a student management system" }
Response: {
  "app_name":    "Student Management System",
  "entities":    ["Student", "Course", "Grade"],
  "apis":        [{"method":"GET","path":"/students","desc":"List all students"}, ...],
  "database":    [{"table":"Students","fields":"id INT PK, name VARCHAR, ..."}, ...],
  "suggestions": ["Add GPA calculation", ...],
  "sample_code": "# FastAPI code..."
}
```

**`GET /api/health`** → `{"status":"ok","version":"2.0.0"}`

**`GET /api/docs`** → Swagger UI

---

## 🛠 Built With

| Layer     | Technology                    |
|-----------|-------------------------------|
| Backend   | Python 3.11, FastAPI, Pydantic |
| Frontend  | HTML5, CSS3, Vanilla JS        |
| Auth      | localStorage (browser-side)    |
| AI        | Anthropic Claude / OpenAI GPT  |
| Deploy    | Render                         |
