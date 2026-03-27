/**
 * static/chat.js — CRUD generation engine
 *
 * Flow when user sends a prompt:
 *   1. POST /api/generate  (real FastAPI backend)
 *   2. If that fails       → use built-in client-side templates
 *   3. Render rich output cards + code block in the chat thread
 *   4. Save chat to localStorage via App module
 *   5. Save artifact to sidebar
 */

"use strict";

/* ================================================================
   CLIENT-SIDE FALLBACK TEMPLATES
   Used when the backend is unreachable (local file:// opening etc.)
================================================================ */
const FALLBACK_TEMPLATES = {
  todo: {
    app_name: "Todo App",
    entities: ["Task", "User", "Category"],
    apis: [
      { method:"GET",    path:"/tasks",            desc:"List all tasks" },
      { method:"POST",   path:"/tasks",            desc:"Create a task" },
      { method:"GET",    path:"/tasks/{id}",       desc:"Get task by ID" },
      { method:"PUT",    path:"/tasks/{id}",       desc:"Update task" },
      { method:"DELETE", path:"/tasks/{id}",       desc:"Delete task" },
      { method:"PATCH",  path:"/tasks/{id}/done",  desc:"Mark complete" },
      { method:"GET",    path:"/categories",       desc:"List categories" },
      { method:"POST",   path:"/categories",       desc:"Create category" },
      { method:"GET",    path:"/users/{id}/tasks", desc:"Tasks by user" },
    ],
    database: [
      { table:"Tasks",      fields:"id INT PK, title VARCHAR, status ENUM(pending,done), due_date DATE, user_id FK" },
      { table:"Users",      fields:"id INT PK, username VARCHAR, email VARCHAR, created_at TIMESTAMP" },
      { table:"Categories", fields:"id INT PK, name VARCHAR, color VARCHAR, user_id FK" },
    ],
    suggestions: [
      "Add due-date reminders with email / push notifications",
      "Implement priority levels — Low, Medium, High, Urgent",
      "Add subtask / checklist items inside each task",
      "Support recurring tasks (daily, weekly, monthly)",
    ],
    sample_code: `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI(title="Todo App API")

class Task(BaseModel):
    title: str
    status: str = "pending"
    category_id: Optional[int] = None

tasks_db: List[dict] = []
counter: int = 1

@app.get("/tasks")
def get_tasks(status: Optional[str] = None):
    if status:
        return [t for t in tasks_db if t["status"] == status]
    return tasks_db

@app.post("/tasks", status_code=201)
def create_task(task: Task):
    global counter
    new = {"id": counter, **task.dict()}
    tasks_db.append(new)
    counter += 1
    return new

@app.patch("/tasks/{task_id}/done")
def mark_done(task_id: int):
    for t in tasks_db:
        if t["id"] == task_id:
            t["status"] = "completed"
            return {"message": "Task marked complete"}
    raise HTTPException(404, "Task not found")

@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int):
    global tasks_db
    tasks_db = [t for t in tasks_db if t["id"] != task_id]`,
  },

  student: {
    app_name: "Student Management System",
    entities: ["Student", "Course", "Grade", "Teacher", "Attendance"],
    apis: [
      { method:"GET",    path:"/students",              desc:"List all students" },
      { method:"POST",   path:"/students",              desc:"Enroll new student" },
      { method:"GET",    path:"/students/{id}",         desc:"Get student profile" },
      { method:"PUT",    path:"/students/{id}",         desc:"Update student info" },
      { method:"DELETE", path:"/students/{id}",         desc:"Remove student" },
      { method:"GET",    path:"/students/{id}/grades",  desc:"Get student grades" },
      { method:"POST",   path:"/students/{id}/grades",  desc:"Add grade entry" },
      { method:"POST",   path:"/attendance",            desc:"Mark attendance" },
      { method:"GET",    path:"/courses",               desc:"List all courses" },
      { method:"POST",   path:"/courses",               desc:"Create a course" },
      { method:"GET",    path:"/courses/{id}/students", desc:"Students in course" },
    ],
    database: [
      { table:"Students",   fields:"id INT PK, name VARCHAR, email VARCHAR, roll_no VARCHAR, department VARCHAR" },
      { table:"Courses",    fields:"id INT PK, name VARCHAR, code VARCHAR, credits INT, teacher_id FK" },
      { table:"Grades",     fields:"id INT PK, student_id FK, course_id FK, marks FLOAT, grade CHAR, semester INT" },
      { table:"Attendance", fields:"id INT PK, student_id FK, course_id FK, date DATE, status ENUM" },
      { table:"Teachers",   fields:"id INT PK, name VARCHAR, email VARCHAR, department VARCHAR" },
    ],
    suggestions: [
      "Add GPA auto-calculation from all semester grades",
      "Filter students by department or semester",
      "Send alerts when attendance drops below 75%",
      "Add performance trend reports per student",
    ],
    sample_code: `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI(title="Student Management System API")

class Student(BaseModel):
    name: str
    email: str
    roll_no: str
    department: str

class Grade(BaseModel):
    course_id: int
    marks: float
    semester: int

students_db: List[dict] = []
grades_db:   List[dict] = []
c = {"s": 1, "g": 1}

@app.get("/students")
def list_students(department: Optional[str] = None):
    if department:
        return [s for s in students_db if s["department"] == department]
    return students_db

@app.post("/students", status_code=201)
def enroll_student(student: Student):
    new = {"id": c["s"], **student.dict()}
    students_db.append(new)
    c["s"] += 1
    return new

@app.post("/students/{sid}/grades", status_code=201)
def add_grade(sid: int, grade: Grade):
    letter = ("A" if grade.marks>=90 else "B" if grade.marks>=80
              else "C" if grade.marks>=70 else "D" if grade.marks>=60 else "F")
    new = {"id": c["g"], "student_id": sid, "grade": letter, **grade.dict()}
    grades_db.append(new)
    c["g"] += 1
    return new`,
  },

  notes: {
    app_name: "Notes App",
    entities: ["Note", "Tag", "User", "Notebook"],
    apis: [
      { method:"GET",    path:"/notes",                    desc:"List all notes" },
      { method:"POST",   path:"/notes",                    desc:"Create a note" },
      { method:"GET",    path:"/notes/{id}",               desc:"Get note by ID" },
      { method:"PUT",    path:"/notes/{id}",               desc:"Update note" },
      { method:"DELETE", path:"/notes/{id}",               desc:"Delete note" },
      { method:"GET",    path:"/notes/search",             desc:"Search notes" },
      { method:"POST",   path:"/notes/{id}/tags",          desc:"Add tag to note" },
      { method:"DELETE", path:"/notes/{id}/tags/{tag_id}", desc:"Remove tag" },
      { method:"GET",    path:"/notebooks",                desc:"List notebooks" },
      { method:"POST",   path:"/notebooks",                desc:"Create notebook" },
    ],
    database: [
      { table:"Notes",     fields:"id INT PK, title VARCHAR, content TEXT, user_id FK, notebook_id FK, created_at TIMESTAMP" },
      { table:"Tags",      fields:"id INT PK, name VARCHAR, color VARCHAR, user_id FK" },
      { table:"NoteTags",  fields:"note_id FK, tag_id FK (composite PK)" },
      { table:"Notebooks", fields:"id INT PK, name VARCHAR, description TEXT, user_id FK" },
    ],
    suggestions: [
      "Add full-text search with keyword highlighting",
      "Support Markdown rendering in note content",
      "Add note pinning and archiving functionality",
      "Generate public share links with read-only access",
    ],
    sample_code: `from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

app = FastAPI(title="Notes App API")

class Note(BaseModel):
    title: str
    content: str
    notebook_id: Optional[int] = None

notes_db: List[dict] = []
c = {"note": 1}

@app.get("/notes")
def list_notes():
    return notes_db

@app.post("/notes", status_code=201)
def create_note(note: Note):
    now = datetime.utcnow().isoformat()
    new = {"id": c["note"], **note.dict(), "tags": [], "created_at": now}
    notes_db.append(new)
    c["note"] += 1
    return new

@app.get("/notes/search")
def search_notes(q: str = Query(..., min_length=1)):
    ql = q.lower()
    return [n for n in notes_db if ql in n["title"].lower() or ql in n["content"].lower()]

@app.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: int):
    global notes_db
    notes_db = [n for n in notes_db if n["id"] != note_id]`,
  },

  ecommerce: {
    app_name: "E-Commerce Catalog",
    entities: ["Product", "Category", "Order", "Customer", "Cart", "Review"],
    apis: [
      { method:"GET",    path:"/products",              desc:"List products with filters" },
      { method:"POST",   path:"/products",              desc:"Add new product" },
      { method:"GET",    path:"/products/{id}",         desc:"Get product details" },
      { method:"PUT",    path:"/products/{id}",         desc:"Update product" },
      { method:"DELETE", path:"/products/{id}",         desc:"Remove product" },
      { method:"GET",    path:"/products/{id}/reviews", desc:"Get reviews" },
      { method:"POST",   path:"/products/{id}/reviews", desc:"Add a review" },
      { method:"GET",    path:"/categories",            desc:"List categories" },
      { method:"POST",   path:"/cart",                  desc:"Add to cart" },
      { method:"GET",    path:"/cart/{user_id}",        desc:"Get user cart" },
      { method:"POST",   path:"/orders",                desc:"Place an order" },
      { method:"GET",    path:"/orders/{id}",           desc:"Get order details" },
    ],
    database: [
      { table:"Products",   fields:"id INT PK, name VARCHAR, price DECIMAL, stock INT, category_id FK" },
      { table:"Categories", fields:"id INT PK, name VARCHAR, parent_id FK" },
      { table:"Orders",     fields:"id INT PK, customer_id FK, total DECIMAL, status ENUM, created_at TIMESTAMP" },
      { table:"OrderItems", fields:"id INT PK, order_id FK, product_id FK, qty INT, price DECIMAL" },
      { table:"Cart",       fields:"id INT PK, user_id FK, product_id FK, qty INT" },
      { table:"Reviews",    fields:"id INT PK, product_id FK, user_id FK, rating INT, comment TEXT" },
    ],
    suggestions: [
      "Add price-range and star-rating filters on /products",
      "Send low-stock inventory alerts automatically",
      "Implement coupon and discount code support",
      "Add product recommendation engine based on purchase history",
    ],
    sample_code: `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI(title="E-Commerce Catalog API")

class Product(BaseModel):
    name: str
    price: float
    stock: int
    category_id: Optional[int] = None

class Review(BaseModel):
    user_id: int
    rating: int
    comment: Optional[str] = None

products_db: List[dict] = []
c = {"p": 1, "r": 1}

@app.get("/products")
def list_products(in_stock: bool = False):
    if in_stock:
        return [p for p in products_db if p["stock"] > 0]
    return products_db

@app.post("/products", status_code=201)
def add_product(product: Product):
    new = {"id": c["p"], **product.dict()}
    products_db.append(new)
    c["p"] += 1
    return new

@app.post("/products/{pid}/reviews", status_code=201)
def add_review(pid: int, review: Review):
    if not 1 <= review.rating <= 5:
        raise HTTPException(400, "Rating must be 1-5")
    new = {"id": c["r"], "product_id": pid, **review.dict()}
    c["r"] += 1
    return new`,
  },

  blog: {
    app_name: "Blog Platform",
    entities: ["Post", "Author", "Comment", "Tag", "Category"],
    apis: [
      { method:"GET",    path:"/posts",               desc:"List published posts" },
      { method:"POST",   path:"/posts",               desc:"Create new post" },
      { method:"GET",    path:"/posts/{id}",          desc:"Get post with comments" },
      { method:"PUT",    path:"/posts/{id}",          desc:"Update post" },
      { method:"DELETE", path:"/posts/{id}",          desc:"Delete post" },
      { method:"POST",   path:"/posts/{id}/publish",  desc:"Publish a draft" },
      { method:"POST",   path:"/posts/{id}/comments", desc:"Add a comment" },
      { method:"DELETE", path:"/comments/{id}",       desc:"Delete comment" },
      { method:"GET",    path:"/tags",                desc:"List all tags" },
      { method:"GET",    path:"/authors/{id}/posts",  desc:"Posts by author" },
    ],
    database: [
      { table:"Posts",    fields:"id INT PK, title VARCHAR, content TEXT, author_id FK, status ENUM(draft,published), slug VARCHAR" },
      { table:"Authors",  fields:"id INT PK, name VARCHAR, email VARCHAR, bio TEXT" },
      { table:"Comments", fields:"id INT PK, post_id FK, author_name VARCHAR, content TEXT, created_at TIMESTAMP" },
      { table:"Tags",     fields:"id INT PK, name VARCHAR, slug VARCHAR" },
      { table:"PostTags", fields:"post_id FK, tag_id FK (composite PK)" },
    ],
    suggestions: [
      "Add SEO fields (meta description, canonical URL) to posts",
      "Track view count per post automatically",
      "Add comment moderation and approval workflow",
      "Add RSS feed endpoint at /feed.xml",
    ],
    sample_code: `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import re

app = FastAPI(title="Blog Platform API")

class Post(BaseModel):
    title: str
    content: str
    author_id: int

class Comment(BaseModel):
    author_name: str
    content: str

posts_db:    List[dict] = []
comments_db: List[dict] = []
c = {"post": 1, "comment": 1}

def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")

@app.get("/posts")
def list_posts(status: str = "published"):
    return [p for p in posts_db if p["status"] == status]

@app.post("/posts", status_code=201)
def create_post(post: Post):
    new = {"id": c["post"], **post.dict(), "slug": slugify(post.title),
           "status": "draft", "view_count": 0, "created_at": datetime.utcnow().isoformat()}
    posts_db.append(new)
    c["post"] += 1
    return new

@app.post("/posts/{post_id}/publish")
def publish_post(post_id: int):
    post = next((p for p in posts_db if p["id"] == post_id), None)
    if not post:
        raise HTTPException(404, "Post not found")
    post["status"] = "published"
    return {"message": "Published", "slug": post["slug"]}`,
  },
};

/* ── Fallback keyword matcher ─────────────────────────────────── */
function _matchFallback(prompt) {
  const p = prompt.toLowerCase();
  if (/\btodo\b|task|checklist/.test(p))                                 return "todo";
  if (/student|school|\bgrade|\bmarks|attendance/.test(p))               return "student";
  if (/\bnote\b|notebook|journal/.test(p))                               return "notes";
  if (/ecommerce|e-commerce|product|shop|catalog|store|cart/.test(p))    return "ecommerce";
  if (/blog|article|\bpost\b|author/.test(p))                            return "blog";
  return null;
}

function _dynamicFallback(prompt) {
  const STOP = new Set(["create","build","make","a","an","the","system","app",
    "application","management","platform","with","and","for","my","our","new"]);
  const words  = prompt.replace(/[^a-zA-Z\s]/g,'').split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w.toLowerCase()));
  const raw    = words[0] || "Item";
  const entity = raw[0].toUpperCase() + raw.slice(1).toLowerCase();
  const res    = entity.toLowerCase() + "s";
  const name   = words.slice(0,3).map(w=>w[0].toUpperCase()+w.slice(1)).join(" ") + " App";
  return {
    app_name: name,
    entities: [entity, "User", "Category"],
    apis: [
      {method:"GET",    path:`/${res}`,       desc:`List all ${res}`},
      {method:"POST",   path:`/${res}`,       desc:`Create ${entity.toLowerCase()}`},
      {method:"GET",    path:`/${res}/{id}`,  desc:`Get ${entity.toLowerCase()} by ID`},
      {method:"PUT",    path:`/${res}/{id}`,  desc:`Update ${entity.toLowerCase()}`},
      {method:"DELETE", path:`/${res}/{id}`,  desc:`Delete ${entity.toLowerCase()}`},
      {method:"GET",    path:`/users`,        desc:"List users"},
      {method:"POST",   path:`/users`,        desc:"Register user"},
    ],
    database: [
      {table:`${entity}s`, fields:`id INT PK, name VARCHAR, description TEXT, user_id FK, created_at TIMESTAMP`},
      {table:"Users",      fields:"id INT PK, username VARCHAR, email VARCHAR, password_hash VARCHAR"},
    ],
    suggestions: [
      `Add search + filter support for ${res}`,
      "Implement JWT authentication and role-based access",
      "Add pagination (limit/offset) to all list endpoints",
      "Use soft delete (is_deleted flag) instead of hard deletes",
    ],
    sample_code: `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

app = FastAPI(title="${name} API")

class ${entity}(BaseModel):
    name: str
    description: Optional[str] = None

items_db: List[dict] = []
counter: int = 1

@app.get("/${res}")
def list_items():
    return items_db

@app.post("/${res}", status_code=201)
def create_item(item: ${entity}):
    global counter
    new = {"id": counter, **item.dict(), "created_at": datetime.utcnow().isoformat()}
    items_db.append(new)
    counter += 1
    return new

@app.get("/${res}/{item_id}")
def get_item(item_id: int):
    item = next((i for i in items_db if i["id"] == item_id), None)
    if not item:
        raise HTTPException(404, "${entity} not found")
    return item

@app.delete("/${res}/{item_id}", status_code=204)
def delete_item(item_id: int):
    global items_db
    items_db = [i for i in items_db if i["id"] != item_id]`,
  };
}

/* ================================================================
   CALL BACKEND API
================================================================ */
async function callBackend(prompt) {
  const response = await fetch("/api/generate", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ prompt }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  // Map backend shape { apis: [{method,path,desc}], database: [{table,fields}] }
  // to frontend shape { apis: [{method,path,desc}], db: [{t,f}] }
  return {
    app_name:    data.app_name,
    entities:    data.entities,
    apis:        data.apis.map(a => ({ method: a.method, path: a.path, desc: a.desc })),
    database:    data.database.map(d => ({ table: d.table, fields: d.fields })),
    suggestions: data.suggestions,
    sample_code: data.sample_code,
  };
}

/* ================================================================
   HTML RENDERING
================================================================ */
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function highlightPython(code) {
  return esc(code)
    .replace(/\b(from|import|def|class|return|if|else|elif|for|in|not|and|or|True|False|None|async|await|with|as|try|except|raise|global|pass)\b/g,'<span class="kw">$1</span>')
    .replace(/(#[^\n]*)/g,'<span class="cm">$1</span>')
    .replace(/(@\w+)/g,'<span class="dec">$1</span>')
    .replace(/\b(\d+)\b/g,'<span class="num">$1</span>')
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,'<span class="str">$1</span>');
}

function renderCRUDOutput(data) {
  const codeId = 'code_' + Date.now();

  const statsHtml = `
    <div class="stats-strip">
      <div class="stat-pill"><b>${data.entities.length}</b> Entities</div>
      <div class="stat-pill"><b>${data.apis.length}</b> Endpoints</div>
      <div class="stat-pill"><b>${data.database.length}</b> DB Tables</div>
      <div class="stat-pill"><b>${data.suggestions.length}</b> Suggestions</div>
    </div>`;

  const entitiesHtml = data.entities.map(e =>
    `<span class="entity-tag">◈ ${esc(e)}</span>`).join('');

  const apisHtml = data.apis.map(a =>
    `<div class="api-row">
      <span class="method ${esc(a.method)}">${esc(a.method)}</span>
      <span class="api-path">${esc(a.path)}</span>
      <span class="api-desc">${esc(a.desc)}</span>
    </div>`).join('');

  const dbHtml = data.database.map(d =>
    `<div class="db-table">${esc(d.table)}</div>
     <div class="db-fields">(${esc(d.fields)})</div>`).join('');

  const sugHtml = data.suggestions.map(s =>
    `<div class="sug-item"><span class="sug-arrow">→</span>${esc(s)}</div>`).join('');

  const codeRaw  = data.sample_code || '';

  return `
    <p style="margin-bottom:12px">
      Here's the complete CRUD structure for <strong>${esc(data.app_name)}</strong>:
    </p>
    ${statsHtml}
    <div class="output-cards">
      <div class="out-card entities">
        <div class="out-card-label"><span class="out-dot"></span>Entities / Models</div>
        ${entitiesHtml}
      </div>
      <div class="out-card database">
        <div class="out-card-label"><span class="out-dot"></span>Database Schema</div>
        ${dbHtml}
      </div>
      <div class="out-card apis">
        <div class="out-card-label"><span class="out-dot"></span>REST API Endpoints</div>
        ${apisHtml}
      </div>
      <div class="out-card suggestions">
        <div class="out-card-label"><span class="out-dot"></span>AI Suggestions</div>
        ${sugHtml}
      </div>
      <div class="code-block-wrap" style="grid-column:span 2">
        <div class="code-block-header">
          <div class="code-dots">
            <div class="code-dot"></div><div class="code-dot"></div><div class="code-dot"></div>
          </div>
          <span class="code-lang-label">Python · FastAPI</span>
          <button class="code-copy" onclick="copyCRUDCode('${codeId}')">📋 Copy</button>
        </div>
        <pre class="code-content" id="${codeId}" data-raw="${esc(codeRaw)}">${highlightPython(codeRaw)}</pre>
      </div>
    </div>`;
}

function copyCRUDCode(preId) {
  const pre = document.getElementById(preId);
  if (!pre) return;
  const text = pre.dataset.raw || pre.innerText;
  navigator.clipboard.writeText(text)
    .then(() => toast('Code copied!'))
    .catch(() => toast('Copy failed'));
}

/* ================================================================
   SEND MESSAGE — main function called from textarea
================================================================ */
async function sendMessage() {
  const ta     = document.getElementById('promptInput');
  const prompt = ta.value.trim();
  if (!prompt) return;

  ta.value = '';
  ta.style.height = 'auto';
  document.getElementById('sendBtn').disabled = true;

  // ── Ensure active chat exists ────────────────────────────────
  let chatId = App.getActiveChatId();
  if (!chatId) {
    const title = prompt.length > 40 ? prompt.slice(0, 40) + '…' : prompt;
    const chat  = App.createChat(title);
    chatId      = chat.id;
    App.setActiveChatId(chatId);

    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('chatThread').style.display    = '';
    document.getElementById('chatThreadTitle').textContent = title;
    document.getElementById('chatProjectBadge').style.display = 'none';
    document.getElementById('messagesArea').innerHTML = '';
  }

  // ── Show user message ────────────────────────────────────────
  App.appendUserMessage(prompt);

  // ── Show typing indicator ────────────────────────────────────
  App.appendTypingIndicator();

  // ── Generate CRUD data ───────────────────────────────────────
  let data;
  try {
    // Try real backend first
    data = await callBackend(prompt);
  } catch (err) {
    console.warn('[chat.js] Backend unavailable, using client fallback:', err.message);
    // Fall back to built-in templates
    const key = _matchFallback(prompt);
    data = key ? FALLBACK_TEMPLATES[key] : _dynamicFallback(prompt);
    // Small delay so typing indicator is visible
    await new Promise(r => setTimeout(r, 800));
  }

  // ── Remove typing indicator + render response ────────────────
  App.removeTypingIndicator();

  const html = renderCRUDOutput(data);
  App.appendBotMessage(html);

  // ── Update chat title if it was auto-set ────────────────────
  const chat = App.getChatById(chatId);
  if (chat) {
    const newTitle = data.app_name || prompt.slice(0, 40);
    App.updateChat(chatId, { title: newTitle });
    document.getElementById('chatThreadTitle').textContent = newTitle;
  }

  // ── Save to Artifacts sidebar ────────────────────────────────
  App.saveArtifact({
    id:        'art_' + Date.now(),
    title:     data.app_name,
    code:      data.sample_code,
    chatId,
    createdAt: new Date().toISOString(),
  });

  App.renderSidebar();

  document.getElementById('sendBtn').disabled = false;
  document.getElementById('promptInput').focus();
}

/* ================================================================
   KEYBOARD + WELCOME CHIPS
================================================================ */
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function setPromptAndSend(text) {
  document.getElementById('promptInput').value = text;
  sendMessage();
}
