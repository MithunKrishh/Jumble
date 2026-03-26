# 🧠 JUMBLE — Academic Intelligence Platform

JUMBLE is a high-fidelity academic intelligence platform designed to help students make **smarter study decisions with limited time**. Instead of overwhelming users with data, JUMBLE focuses on **clarity, prioritization, and explainability**—so students always know:

> **What to study, why it matters, and what to do next.**

---

## ✨ Core Idea

Students often struggle with:

* Too much syllabus, too little time
* No clear prioritization
* Inefficient study planning
* Lack of insight from previous exam trends

JUMBLE solves this using **data-driven insights + adaptive planning**.

---

## 🚀 Key Features

### 📊 1. PYQ → Topic Importance Scoring

* Analyzes Previous Year Questions (PYQs)
* Assigns **importance weightage** to each topic
* Helps identify **high-frequency, high-impact topics**

---

### ⚖️ 2. Effort vs Marks Optimization

* Compares **effort required vs expected marks gain**
* Identifies:

  * High-return topics (low effort, high marks)
  * Time-consuming low-return areas
* Enables **smart decision-making under time pressure**

---

### 📌 3. Topic Priority Ranking

* Ranks topics based on:

  * Importance (from PYQs)
  * Difficulty level
  * Student proficiency
* Produces a **clear “what to study first” list**

---

### 🗓️ 4. Adaptive Daily Schedule

* Generates a **personalized daily study plan**
* Dynamically adjusts based on:

  * Missed tasks
  * Performance changes
  * Time availability
* Ensures continuous alignment with goals

---

### ⚠️ 5. Academic Risk Score

* A simple indicator of preparation risk
* Based on:

  * Coverage
  * Weak topics
  * Time remaining
* Designed to be **informative, not stressful**

---

### 💡 6. Explainable Recommendations

Every insight in JUMBLE includes a **“WHY” explanation**, so users always understand:

* Why a topic is prioritized
* Why something is risky
* Why a schedule changed

---

## 🔐 Authentication & Access

### Public (Unauthenticated Users)

Users can access:

* Landing Page
* How It Works section
* Login / Register pages

> ❌ Dashboard is NOT visible before login

---

### Logged-In Users

Users gain access to:

* Personalized Dashboard
* Study Insights
* Adaptive Planning Tools

---

## 🧭 Navigation Behavior

### 🔓 Not Logged In

* JUMBLE (Logo)
* How It Works
* Log In

---

### 🔒 Logged In

* JUMBLE (Logo)
* Dashboard
* Profile (User Name)
* Log Out

---

## 🖥️ Dashboard Experience

### 🟡 State 1: First-Time User (Setup Mode)

Guided onboarding experience with:

* **Set Exam Context (Required)**

  * Exam name
  * Exam date
  * Subjects

* **Upload PYQs (Optional)**

  * PDF upload
  * Skip option available

* **Confirm Topics / Syllabus**

  * Editable topic list

* **Study Availability (Optional)**

  * Daily time
  * Self-confidence per subject

💬 Supportive UX:

> “You can skip this for now — JUMBLE adapts as you go.”

---

### 🟢 State 2: Active User (Insight Mode)

Displays:

* 📌 Topic Priority Ranking
* 🗓️ Adaptive Daily Plan
* ⚠️ Academic Risk Score
* 📊 Key Insights for Today

Each insight includes:

> ✅ A clear explanation (“WHY”)

---

## 🎨 Design System

### 🌈 Color Palette

* Primary: Soft Indigo / Blue
* Secondary: Muted Teal
* Background: Clean White / Light Gray
* Accent: Subtle Warm Highlights

---

### ✍️ Typography

* Headings: Clean, modern sans-serif
* Body: Highly readable, minimal contrast strain

---

### 🧩 UI Style

* Soft rounded corners
* Spacious layout
* Calm and distraction-free
* Friendly abstract visuals
* No gamification elements

---

## 🏗️ Tech & Architecture

* **Frontend:** React (Component-Based Architecture)
* **Design Approach:** Desktop-first, responsive
* **State Management:** Context / Hooks (or Redux optional)
* **Backend (optional):** Node.js + Express
* **Database (optional):** MongoDB

---

## 📁 Project Structure (Example)

```
/src
 ├── components
 │    ├── Navbar
 │    ├── Cards
 │    ├── Dashboard
 │    └── Forms
 │
 ├── pages
 │    ├── Landing
 │    ├── Login
 │    ├── Register
 │    └── Dashboard
 │
 ├── utils
 ├── hooks
 └── assets
```

---

## 🎯 UX Philosophy

JUMBLE is built on three principles:

### 1. Clarity over Complexity

No overwhelming dashboards. Only meaningful insights.

### 2. Guidance over Control

The system suggests, not forces.

### 3. Explainability over Blind AI

Every recommendation answers:

> “Why should I do this?”

---

## 🧪 Future Enhancements

* Smart revision planner
* Subject-wise deep analytics
* Collaborative study insights
* AI-powered doubt detection

---

## 📌 Final Thought

JUMBLE is not just a study planner.

It is a **decision-support system for students**, designed to reduce confusion and maximize impact.

> **Study less blindly. Study more intelligently.**
