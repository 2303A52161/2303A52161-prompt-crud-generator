"""
generator.py — Core CRUD generation engine.

Priority order:
  1. If ANTHROPIC_API_KEY is set → call Claude API → parse response
  2. If OPENAI_API_KEY is set    → call OpenAI API → parse response
  3. Fallback                    → use built-in template library (no key needed)
"""

import os
import re
from typing import Any, Dict

from ai_engine.prompt_builder import build_prompt
from ai_engine.parser import parse_ai_output, ParseError


# ── Built-in template library ─────────────────────────────────────
TEMPLATES: Dict[str, Dict[str, Any]] = {

    "todo": {
        "app_name": "Todo App",
        "entities": ["Task", "User", "Category"],
        "apis": [
            {"method":"GET",    "path":"/tasks",            "desc":"List all tasks"},
            {"method":"POST",   "path":"/tasks",            "desc":"Create a task"},
            {"method":"GET",    "path":"/tasks/{id}",       "desc":"Get task by ID"},
            {"method":"PUT",    "path":"/tasks/{id}",       "desc":"Update task"},
            {"method":"DELETE", "path":"/tasks/{id}",       "desc":"Delete task"},
            {"method":"PATCH",  "path":"/tasks/{id}/done",  "desc":"Mark complete"},
            {"method":"GET",    "path":"/categories",       "desc":"List categories"},
            {"method":"POST",   "path":"/categories",       "desc":"Create category"},
            {"method":"GET",    "path":"/users/{id}/tasks", "desc":"Tasks by user"},
        ],
        "database": [
            {"table":"Tasks",      "fields":"id INT PK, title VARCHAR, status ENUM(pending,done), due_date DATE, user_id FK, category_id FK"},
            {"table":"Users",      "fields":"id INT PK, username VARCHAR, email VARCHAR, created_at TIMESTAMP"},
            {"table":"Categories", "fields":"id INT PK, name VARCHAR, color VARCHAR, user_id FK"},
        ],
        "suggestions": [
            "Add due-date reminders with email/push notifications",
            "Implement priority levels — Low, Medium, High, Urgent",
            "Add subtask/checklist items inside each task",
            "Support recurring tasks (daily, weekly, monthly)",
        ],
        "sample_code": """\
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import date

app = FastAPI(title="Todo App API", version="1.0.0")

class Task(BaseModel):
    title: str
    status: str = "pending"
    due_date: Optional[date] = None
    category_id: Optional[int] = None

class TaskResponse(Task):
    id: int

tasks_db: List[dict] = []
counter: int = 1

@app.get("/tasks", response_model=List[TaskResponse])
def get_tasks(status: Optional[str] = None):
    if status:
        return [t for t in tasks_db if t["status"] == status]
    return tasks_db

@app.post("/tasks", response_model=TaskResponse, status_code=201)
def create_task(task: Task):
    global counter
    new = {"id": counter, **task.dict()}
    tasks_db.append(new)
    counter += 1
    return new

@app.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(task_id: int):
    t = next((t for t in tasks_db if t["id"] == task_id), None)
    if not t:
        raise HTTPException(404, "Task not found")
    return t

@app.put("/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task: Task):
    for i, t in enumerate(tasks_db):
        if t["id"] == task_id:
            tasks_db[i] = {"id": task_id, **task.dict()}
            return tasks_db[i]
    raise HTTPException(404, "Task not found")

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
    tasks_db = [t for t in tasks_db if t["id"] != task_id]
""",
    },

    "student": {
        "app_name": "Student Management System",
        "entities": ["Student", "Course", "Grade", "Teacher", "Attendance"],
        "apis": [
            {"method":"GET",    "path":"/students",                "desc":"List all students"},
            {"method":"POST",   "path":"/students",                "desc":"Enroll new student"},
            {"method":"GET",    "path":"/students/{id}",           "desc":"Get student profile"},
            {"method":"PUT",    "path":"/students/{id}",           "desc":"Update student info"},
            {"method":"DELETE", "path":"/students/{id}",           "desc":"Remove student"},
            {"method":"GET",    "path":"/students/{id}/grades",    "desc":"Get student grades"},
            {"method":"POST",   "path":"/students/{id}/grades",    "desc":"Add grade entry"},
            {"method":"POST",   "path":"/attendance",              "desc":"Mark attendance"},
            {"method":"GET",    "path":"/courses",                 "desc":"List all courses"},
            {"method":"POST",   "path":"/courses",                 "desc":"Create a course"},
            {"method":"GET",    "path":"/courses/{id}/students",   "desc":"Students in course"},
        ],
        "database": [
            {"table":"Students",   "fields":"id INT PK, name VARCHAR, email VARCHAR, roll_no VARCHAR, department VARCHAR, dob DATE"},
            {"table":"Courses",    "fields":"id INT PK, name VARCHAR, code VARCHAR, credits INT, teacher_id FK"},
            {"table":"Grades",     "fields":"id INT PK, student_id FK, course_id FK, marks FLOAT, grade CHAR, semester INT"},
            {"table":"Attendance", "fields":"id INT PK, student_id FK, course_id FK, date DATE, status ENUM(present,absent,late)"},
            {"table":"Teachers",   "fields":"id INT PK, name VARCHAR, email VARCHAR, department VARCHAR"},
        ],
        "suggestions": [
            "Add GPA auto-calculation from all semester grades",
            "Filter students by department or semester",
            "Send alerts when attendance drops below 75%",
            "Add performance trend reports per student",
        ],
        "sample_code": """\
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum

app = FastAPI(title="Student Management System API", version="1.0.0")

class AttendanceStatus(str, Enum):
    present = "present"
    absent  = "absent"
    late    = "late"

class Student(BaseModel):
    name: str
    email: str
    roll_no: str
    department: str
    dob: Optional[str] = None

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

@app.get("/students/{sid}")
def get_student(sid: int):
    s = next((s for s in students_db if s["id"] == sid), None)
    if not s:
        raise HTTPException(404, "Student not found")
    return s

@app.post("/students/{sid}/grades", status_code=201)
def add_grade(sid: int, grade: Grade):
    letter = ("A" if grade.marks>=90 else "B" if grade.marks>=80
              else "C" if grade.marks>=70 else "D" if grade.marks>=60 else "F")
    new = {"id": c["g"], "student_id": sid, "grade": letter, **grade.dict()}
    grades_db.append(new)
    c["g"] += 1
    return new

@app.delete("/students/{sid}", status_code=204)
def remove_student(sid: int):
    global students_db
    students_db = [s for s in students_db if s["id"] != sid]
""",
    },

    "notes": {
        "app_name": "Notes App",
        "entities": ["Note", "Tag", "User", "Notebook"],
        "apis": [
            {"method":"GET",    "path":"/notes",                    "desc":"List all notes"},
            {"method":"POST",   "path":"/notes",                    "desc":"Create a note"},
            {"method":"GET",    "path":"/notes/{id}",               "desc":"Get note by ID"},
            {"method":"PUT",    "path":"/notes/{id}",               "desc":"Update note"},
            {"method":"DELETE", "path":"/notes/{id}",               "desc":"Delete note"},
            {"method":"GET",    "path":"/notes/search",             "desc":"Search notes"},
            {"method":"GET",    "path":"/tags",                     "desc":"List all tags"},
            {"method":"POST",   "path":"/tags",                     "desc":"Create a tag"},
            {"method":"POST",   "path":"/notes/{id}/tags",          "desc":"Add tag to note"},
            {"method":"DELETE", "path":"/notes/{id}/tags/{tag_id}", "desc":"Remove tag"},
            {"method":"GET",    "path":"/notebooks",                "desc":"List notebooks"},
            {"method":"POST",   "path":"/notebooks",                "desc":"Create notebook"},
        ],
        "database": [
            {"table":"Notes",     "fields":"id INT PK, title VARCHAR, content TEXT, user_id FK, notebook_id FK, created_at TIMESTAMP"},
            {"table":"Tags",      "fields":"id INT PK, name VARCHAR, color VARCHAR, user_id FK"},
            {"table":"NoteTags",  "fields":"note_id FK, tag_id FK (composite PK)"},
            {"table":"Notebooks", "fields":"id INT PK, name VARCHAR, description TEXT, user_id FK"},
        ],
        "suggestions": [
            "Add full-text search with keyword highlighting",
            "Support Markdown rendering in note content",
            "Add note pinning and archiving functionality",
            "Generate public share links with read-only access",
        ],
        "sample_code": """\
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

app = FastAPI(title="Notes App API", version="1.0.0")

class Note(BaseModel):
    title: str
    content: str
    notebook_id: Optional[int] = None

notes_db: List[dict] = []
c = {"note": 1}

@app.get("/notes")
def list_notes(notebook_id: Optional[int] = None):
    if notebook_id:
        return [n for n in notes_db if n.get("notebook_id") == notebook_id]
    return notes_db

@app.post("/notes", status_code=201)
def create_note(note: Note):
    now = datetime.utcnow().isoformat()
    new = {"id": c["note"], **note.dict(), "tags": [], "created_at": now, "updated_at": now}
    notes_db.append(new)
    c["note"] += 1
    return new

@app.get("/notes/search")
def search_notes(q: str = Query(..., min_length=1)):
    ql   = q.lower()
    hits = [n for n in notes_db if ql in n["title"].lower() or ql in n["content"].lower()]
    return {"query": q, "count": len(hits), "results": hits}

@app.put("/notes/{note_id}")
def update_note(note_id: int, note: Note):
    for i, n in enumerate(notes_db):
        if n["id"] == note_id:
            notes_db[i].update({**note.dict(), "updated_at": datetime.utcnow().isoformat()})
            return notes_db[i]
    raise HTTPException(404, "Note not found")

@app.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: int):
    global notes_db
    notes_db = [n for n in notes_db if n["id"] != note_id]
""",
    },

    "ecommerce": {
        "app_name": "E-Commerce Catalog",
        "entities": ["Product", "Category", "Order", "Customer", "Cart", "Review"],
        "apis": [
            {"method":"GET",    "path":"/products",               "desc":"List products with filters"},
            {"method":"POST",   "path":"/products",               "desc":"Add new product"},
            {"method":"GET",    "path":"/products/{id}",          "desc":"Get product details"},
            {"method":"PUT",    "path":"/products/{id}",          "desc":"Update product"},
            {"method":"DELETE", "path":"/products/{id}",          "desc":"Remove product"},
            {"method":"GET",    "path":"/products/{id}/reviews",  "desc":"Get reviews"},
            {"method":"POST",   "path":"/products/{id}/reviews",  "desc":"Add a review"},
            {"method":"GET",    "path":"/categories",             "desc":"List categories"},
            {"method":"POST",   "path":"/cart",                   "desc":"Add to cart"},
            {"method":"GET",    "path":"/cart/{user_id}",         "desc":"Get user cart"},
            {"method":"DELETE", "path":"/cart/{item_id}",         "desc":"Remove cart item"},
            {"method":"POST",   "path":"/orders",                 "desc":"Place an order"},
            {"method":"GET",    "path":"/orders/{id}",            "desc":"Get order details"},
        ],
        "database": [
            {"table":"Products",   "fields":"id INT PK, name VARCHAR, price DECIMAL, stock INT, category_id FK, description TEXT"},
            {"table":"Categories", "fields":"id INT PK, name VARCHAR, parent_id FK"},
            {"table":"Orders",     "fields":"id INT PK, customer_id FK, total DECIMAL, status ENUM, created_at TIMESTAMP"},
            {"table":"OrderItems", "fields":"id INT PK, order_id FK, product_id FK, qty INT, price DECIMAL"},
            {"table":"Cart",       "fields":"id INT PK, user_id FK, product_id FK, qty INT"},
            {"table":"Reviews",    "fields":"id INT PK, product_id FK, user_id FK, rating INT, comment TEXT"},
        ],
        "suggestions": [
            "Add price-range and star-rating filters on /products",
            "Send low-stock inventory alerts automatically",
            "Implement coupon and discount code support",
            "Add product recommendation engine based on purchase history",
        ],
        "sample_code": """\
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI(title="E-Commerce Catalog API", version="1.0.0")

class Product(BaseModel):
    name: str
    price: float
    stock: int
    category_id: Optional[int] = None
    description: Optional[str] = None

class Review(BaseModel):
    user_id: int
    rating: int
    comment: Optional[str] = None

class CartItem(BaseModel):
    user_id: int
    product_id: int
    qty: int = 1

products_db: List[dict] = []
reviews_db:  List[dict] = []
cart_db:     List[dict] = []
c = {"p": 1, "r": 1, "cart": 1}

@app.get("/products")
def list_products(category_id: Optional[int] = None,
                  min_price: Optional[float] = None,
                  in_stock: bool = False):
    res = products_db[:]
    if category_id: res = [p for p in res if p.get("category_id") == category_id]
    if min_price:   res = [p for p in res if p["price"] >= min_price]
    if in_stock:    res = [p for p in res if p["stock"] > 0]
    return res

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
    reviews_db.append(new)
    c["r"] += 1
    return new

@app.post("/cart", status_code=201)
def add_to_cart(item: CartItem):
    existing = next((ci for ci in cart_db
                     if ci["user_id"]==item.user_id and ci["product_id"]==item.product_id), None)
    if existing:
        existing["qty"] += item.qty
        return existing
    new = {"id": c["cart"], **item.dict()}
    cart_db.append(new)
    c["cart"] += 1
    return new
""",
    },

    "blog": {
        "app_name": "Blog Platform",
        "entities": ["Post", "Author", "Comment", "Tag", "Category"],
        "apis": [
            {"method":"GET",    "path":"/posts",                 "desc":"List published posts"},
            {"method":"POST",   "path":"/posts",                 "desc":"Create new post"},
            {"method":"GET",    "path":"/posts/{id}",            "desc":"Get post with comments"},
            {"method":"PUT",    "path":"/posts/{id}",            "desc":"Update post"},
            {"method":"DELETE", "path":"/posts/{id}",            "desc":"Delete post"},
            {"method":"POST",   "path":"/posts/{id}/publish",    "desc":"Publish a draft"},
            {"method":"POST",   "path":"/posts/{id}/comments",   "desc":"Add a comment"},
            {"method":"DELETE", "path":"/comments/{id}",         "desc":"Delete comment"},
            {"method":"GET",    "path":"/tags",                  "desc":"List all tags"},
            {"method":"GET",    "path":"/posts/tag/{tag}",       "desc":"Posts by tag"},
            {"method":"GET",    "path":"/authors/{id}/posts",    "desc":"Posts by author"},
        ],
        "database": [
            {"table":"Posts",    "fields":"id INT PK, title VARCHAR, content TEXT, author_id FK, status ENUM(draft,published), slug VARCHAR, published_at TIMESTAMP"},
            {"table":"Authors",  "fields":"id INT PK, name VARCHAR, email VARCHAR, bio TEXT, avatar_url VARCHAR"},
            {"table":"Comments", "fields":"id INT PK, post_id FK, author_name VARCHAR, content TEXT, created_at TIMESTAMP"},
            {"table":"Tags",     "fields":"id INT PK, name VARCHAR, slug VARCHAR"},
            {"table":"PostTags", "fields":"post_id FK, tag_id FK (composite PK)"},
        ],
        "suggestions": [
            "Add SEO fields (meta description, canonical URL) to posts",
            "Track view count per post automatically",
            "Add comment moderation and approval workflow",
            "Add RSS feed endpoint at /feed.xml",
        ],
        "sample_code": """\
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import re

app = FastAPI(title="Blog Platform API", version="1.0.0")

class Post(BaseModel):
    title: str
    content: str
    author_id: int
    tags: List[str] = []

class Comment(BaseModel):
    author_name: str
    content: str

posts_db:    List[dict] = []
comments_db: List[dict] = []
c = {"post": 1, "comment": 1}

def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")

@app.get("/posts")
def list_posts(status: str = "published"):
    return [p for p in posts_db if p["status"] == status]

@app.post("/posts", status_code=201)
def create_post(post: Post):
    new = {"id": c["post"], **post.dict(), "slug": slugify(post.title),
           "status": "draft", "published_at": None, "view_count": 0,
           "created_at": datetime.utcnow().isoformat()}
    posts_db.append(new)
    c["post"] += 1
    return new

@app.post("/posts/{post_id}/publish")
def publish_post(post_id: int):
    post = next((p for p in posts_db if p["id"] == post_id), None)
    if not post:
        raise HTTPException(404, "Post not found")
    post["status"] = "published"
    post["published_at"] = datetime.utcnow().isoformat()
    return {"message": "Post published", "slug": post["slug"]}

@app.post("/posts/{post_id}/comments", status_code=201)
def add_comment(post_id: int, comment: Comment):
    post = next((p for p in posts_db if p["id"] == post_id), None)
    if not post:
        raise HTTPException(404, "Post not found")
    new = {"id": c["comment"], "post_id": post_id, **comment.dict(),
           "created_at": datetime.utcnow().isoformat()}
    comments_db.append(new)
    c["comment"] += 1
    return new
""",
    },

    "library": {
        "app_name": "Library Management System",
        "entities": ["Book", "Member", "BorrowRecord", "Author", "Category"],
        "apis": [
            {"method":"GET",    "path":"/books",                   "desc":"List all books"},
            {"method":"POST",   "path":"/books",                   "desc":"Add new book"},
            {"method":"GET",    "path":"/books/{id}",              "desc":"Get book details"},
            {"method":"PUT",    "path":"/books/{id}",              "desc":"Update book info"},
            {"method":"DELETE", "path":"/books/{id}",              "desc":"Remove book"},
            {"method":"GET",    "path":"/books/search",            "desc":"Search books"},
            {"method":"GET",    "path":"/members",                 "desc":"List all members"},
            {"method":"POST",   "path":"/members",                 "desc":"Register member"},
            {"method":"POST",   "path":"/borrow",                  "desc":"Borrow a book"},
            {"method":"POST",   "path":"/return/{borrow_id}",      "desc":"Return a book"},
            {"method":"GET",    "path":"/members/{id}/borrowed",   "desc":"Borrowed books"},
        ],
        "database": [
            {"table":"Books",         "fields":"id INT PK, title VARCHAR, isbn VARCHAR, author_id FK, category_id FK, copies INT, available INT"},
            {"table":"Members",       "fields":"id INT PK, name VARCHAR, email VARCHAR, phone VARCHAR, joined_date DATE"},
            {"table":"BorrowRecords", "fields":"id INT PK, book_id FK, member_id FK, borrow_date DATE, due_date DATE, return_date DATE, status ENUM"},
            {"table":"Authors",       "fields":"id INT PK, name VARCHAR, bio TEXT"},
            {"table":"Categories",    "fields":"id INT PK, name VARCHAR, description TEXT"},
        ],
        "suggestions": [
            "Send overdue book reminders by email automatically",
            "Add fine calculation for late returns",
            "Add book reservation/waitlist system",
            "Generate monthly borrowing statistics reports",
        ],
        "sample_code": """\
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, timedelta

app = FastAPI(title="Library Management System API", version="1.0.0")

class Book(BaseModel):
    title: str
    isbn: str
    author_id: int
    category_id: Optional[int] = None
    copies: int = 1

class Member(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None

class BorrowRequest(BaseModel):
    book_id: int
    member_id: int
    due_days: int = 14

books_db:   List[dict] = []
members_db: List[dict] = []
borrows_db: List[dict] = []
c = {"b": 1, "m": 1, "br": 1}

@app.get("/books")
def list_books(available_only: bool = False):
    if available_only:
        return [b for b in books_db if b["available"] > 0]
    return books_db

@app.post("/books", status_code=201)
def add_book(book: Book):
    new = {"id": c["b"], **book.dict(), "available": book.copies}
    books_db.append(new)
    c["b"] += 1
    return new

@app.post("/borrow", status_code=201)
def borrow_book(req: BorrowRequest):
    book = next((b for b in books_db if b["id"] == req.book_id), None)
    if not book:
        raise HTTPException(404, "Book not found")
    if book["available"] < 1:
        raise HTTPException(400, "No copies available")
    book["available"] -= 1
    record = {"id": c["br"], "book_id": req.book_id, "member_id": req.member_id,
              "borrow_date": str(date.today()),
              "due_date":    str(date.today() + timedelta(days=req.due_days)),
              "return_date": None, "status": "borrowed"}
    borrows_db.append(record)
    c["br"] += 1
    return record

@app.post("/return/{borrow_id}")
def return_book(borrow_id: int):
    record = next((r for r in borrows_db if r["id"] == borrow_id), None)
    if not record:
        raise HTTPException(404, "Borrow record not found")
    if record["status"] == "returned":
        raise HTTPException(400, "Book already returned")
    record["status"] = "returned"
    record["return_date"] = str(date.today())
    book = next((b for b in books_db if b["id"] == record["book_id"]), None)
    if book:
        book["available"] += 1
    return {"message": "Book returned successfully", "record": record}
""",
    },
}


# ── Keyword matcher ───────────────────────────────────────────────
def _match_key(prompt: str) -> str | None:
    p = prompt.lower()
    if re.search(r'\btodo\b|task|checklist', p):                          return "todo"
    if re.search(r'student|school|\bgrade|\bmarks|attendance', p):        return "student"
    if re.search(r'\bnote\b|notebook|journal', p):                        return "notes"
    if re.search(r'ecommerce|e-commerce|product|shop|catalog|store|cart', p): return "ecommerce"
    if re.search(r'blog|article|\bpost\b|author', p):                     return "blog"
    if re.search(r'library|book|borrow|member|isbn', p):                  return "library"
    return None


# ── Dynamic fallback ──────────────────────────────────────────────
def _dynamic(prompt: str) -> Dict[str, Any]:
    from utils import extract_entity_name, infer_app_name
    entity   = extract_entity_name(prompt)
    resource = entity.lower() + "s"
    app_name = infer_app_name(prompt)
    return {
        "app_name": app_name,
        "entities": [entity, "User", "Category"],
        "apis": [
            {"method":"GET",    "path":f"/{resource}",        "desc":f"List all {resource}"},
            {"method":"POST",   "path":f"/{resource}",        "desc":f"Create {entity.lower()}"},
            {"method":"GET",    "path":f"/{resource}/{{id}}", "desc":f"Get {entity.lower()} by ID"},
            {"method":"PUT",    "path":f"/{resource}/{{id}}", "desc":f"Update {entity.lower()}"},
            {"method":"DELETE", "path":f"/{resource}/{{id}}", "desc":f"Delete {entity.lower()}"},
            {"method":"GET",    "path":"/users",              "desc":"List users"},
            {"method":"POST",   "path":"/users",              "desc":"Register user"},
            {"method":"GET",    "path":"/categories",         "desc":"List categories"},
            {"method":"POST",   "path":"/categories",         "desc":"Create category"},
        ],
        "database": [
            {"table":f"{entity}s", "fields":"id INT PK, name VARCHAR, description TEXT, user_id FK, category_id FK, created_at TIMESTAMP"},
            {"table":"Users",      "fields":"id INT PK, username VARCHAR, email VARCHAR, password_hash VARCHAR"},
            {"table":"Categories", "fields":"id INT PK, name VARCHAR, slug VARCHAR"},
        ],
        "suggestions": [
            f"Add full-text search + filter support for {resource}",
            "Implement JWT authentication and role-based access control",
            "Add pagination (limit/offset) to all list endpoints",
            "Use soft delete (is_deleted flag) instead of hard deletes",
        ],
        "sample_code": f"""\
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

app = FastAPI(title="{app_name} API", version="1.0.0")

class {entity}(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    user_id: Optional[int] = None

items_db: List[dict] = []
counter: int = 1

@app.get("/{resource}")
def list_items(search: Optional[str] = Query(None)):
    if search:
        return [i for i in items_db if search.lower() in i["name"].lower()]
    return items_db

@app.post("/{resource}", status_code=201)
def create_item(item: {entity}):
    global counter
    new = {{"id": counter, **item.dict(), "created_at": datetime.utcnow().isoformat()}}
    items_db.append(new)
    counter += 1
    return new

@app.get("/{resource}/{{item_id}}")
def get_item(item_id: int):
    item = next((i for i in items_db if i["id"] == item_id), None)
    if not item:
        raise HTTPException(404, "{entity} not found")
    return item

@app.put("/{resource}/{{item_id}}")
def update_item(item_id: int, item: {entity}):
    for idx, i in enumerate(items_db):
        if i["id"] == item_id:
            items_db[idx] = {{"id": item_id, **item.dict(), "created_at": i["created_at"]}}
            return items_db[idx]
    raise HTTPException(404, "{entity} not found")

@app.delete("/{resource}/{{item_id}}", status_code=204)
def delete_item(item_id: int):
    global items_db
    items_db = [i for i in items_db if i["id"] != item_id]
""",
    }


# ── AI call ───────────────────────────────────────────────────────
def _call_ai(prompt: str) -> str:
    prompts = build_prompt(prompt)

    # Try Anthropic (Claude)
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if api_key:
        import anthropic
        client  = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            system=prompts["system"],
            messages=[{"role": "user", "content": prompts["user"]}],
        )
        return message.content[0].text

    # Try OpenAI
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        import openai
        client   = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompts["system"]},
                {"role": "user",   "content": prompts["user"]},
            ],
            max_tokens=2000,
            temperature=0.3,
        )
        return response.choices[0].message.content

    raise RuntimeError("No AI API key configured.")


# ── Main entry point ──────────────────────────────────────────────
def generate_crud_app(prompt: str) -> Dict[str, Any]:
    """
    Called by routes.py.
    Returns a dict matching the GenerateResponse schema.
    """
    # 1. Try AI
    try:
        raw    = _call_ai(prompt)
        result = parse_ai_output(raw)
        return result
    except (RuntimeError, ParseError) as exc:
        print(f"[generator] AI unavailable ({exc}). Using template fallback.")

    # 2. Template match
    key = _match_key(prompt)
    if key:
        return TEMPLATES[key]

    # 3. Dynamic generic fallback
    return _dynamic(prompt)
