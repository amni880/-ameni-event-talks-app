# BigQuery Release Notes Explorer & Twitter Sharer

A modern web application built using Python Flask on the backend and plain vanilla HTML, CSS, and JavaScript on the frontend. The application pulls the official BigQuery Release Notes RSS feed, parses it dynamically on the client, and allows users to read, search, filter, select, and tweet about specific updates.

---

## 🚀 Features

* **Server-Side Feed Proxy (CORS Bypass)**: Uses a Flask endpoint to fetch the release notes XML feed, preventing cross-origin resource sharing (CORS) blocks in the browser.
* **Smart Content Splitting**: Automatically parses daily compound release entries into granular, individual change cards (Features, Changes, Fixes) using JavaScript's native `DOMParser`.
* **Instant Search & Category Filters**: Real-time filtering by search query or categories (All, Features, Changes, Fixes).
* **Multi-Select Tweet Composer**: Select single or multiple updates via checkboxes. A floating action bar tracks selections and launches a custom draft composer.
* **Character limit validation**: Features a character counter that turns amber at 250 characters and red at 280, automatically locking the "Post to X" button if limits are exceeded.
* **Responsive Dark Theme**: Modern dark-mode styling utilizing glassmorphism overlays, custom scrollbars, and fluid animations.

---

## 🛠️ Tech Stack

* **Backend**: Python 3.13+, Flask, `requests`, `feedparser`
* **Frontend**: HTML5, Vanilla CSS3 (Custom properties, grid, transitions), Vanilla JavaScript (ES6+, DOMParser, Clipboard API)
* **Fonts & Icons**: Outfit (Google Fonts), FontAwesome 6

---

## 📦 Directory Structure

```text
├── .gitignore               # Ignored directories (virtual environments, pycache)
├── app.py                   # Flask server application
├── requirements.txt         # Package dependencies list
├── README.md                # Project documentation
├── templates/
│   └── index.html           # Core HTML structure
└── static/
    ├── css/
    │   └── style.css        # Premium custom stylesheet
    └── js/
        └── app.js           # Client-side feed parsing, state management, & sharing logic
```

---

## ⚙️ Installation & Local Setup

### Prerequisites
Make sure you have Python 3 installed.

### 1. Clone the repository
```bash
git clone https://github.com/amni880/-ameni-event-talks-app.git
cd -ameni-event-talks-app
```

### 2. Set up Virtual Environment
Initialize a Python virtual environment and activate it:

```bash
# Initialize venv
python3 -m venv .venv

# Activate venv (macOS/Linux)
source .venv/bin/env/bin/activate

# Activate venv (Windows)
.venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Server
Launch the Flask development server:
```bash
python app.py
```

The application will be running locally at **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

---

## 📖 Usage Instructions

1. **Browsing**: Scroll down to view release notes ordered by date.
2. **Filtering**: Use the search bar to find specific updates (e.g., typing `TimesFM` or `billing`) or click the category buttons (**Features**, **Changes**, **Fixes**).
3. **Copying Notes**: Click **Copy Text** on any card to copy the raw change description directly to your clipboard.
4. **Drafting a Tweet**:
   * Click **Tweet This** on a single card to compose a tweet for that specific update.
   * Or check the checkboxes on multiple cards, then click **Tweet Selected** in the floating action bar to compose a combined tweet list.
5. **Editing & Posting**: Review the draft in the composer modal, customize it as needed, and click **Post to X** to open the Twitter Web Intent page.

---

## 📄 License
This project is open-source and available under the MIT License.
