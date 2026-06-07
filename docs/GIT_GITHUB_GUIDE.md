# Git & GitHub Guide

How to push code to GitHub, manage files, and keep your repos clean.

---

## 1. First-Time Setup (One Time Only)

```bash
# Set your identity
git config --global user.name "Marvin Ohanwe"
git config --global user.email "marvinohanwe07@gmail.com"
```

---

## 2. Pushing a New Project to GitHub

### Step 1: Create an empty repo on GitHub
- Go to github.com/new
- Name it (e.g., `my-project`)
- Do NOT add README or .gitignore (keep it empty)
- Click "Create repository"

### Step 2: Initialize locally and push

```bash
cd /path/to/your/project

# Initialize git
git init

# Create .gitignore (see section 4)
echo "node_modules/
.env
.DS_Store
__pycache__/" > .gitignore

# Stage everything
git add -A

# Commit
git commit -m "feat: initial commit — describe what the project does"

# Connect to GitHub
git remote add origin https://github.com/ooracle100/my-project.git

# Rename branch to main
git branch -M main

# Push
git push -u origin main
```

After the first push, future pushes are just:
```bash
git add -A
git commit -m "your message here"
git push
```

---

## 3. Pushing Changes to an Existing Repo

```bash
cd /path/to/your/project

# Check what changed
git status

# Stage specific files
git add file1.py file2.md

# Or stage everything
git add -A

# Commit with a clear message
git commit -m "fix: correct fee calculation to use gasUsed × gasPrice"

# Push to GitHub
git push
```

---

## 4. The .gitignore File

This tells git which files to NEVER track. Create it at the root of your project.

### Common .gitignore for your projects:

```gitignore
# Dependencies
node_modules/
venv/
.venv/
__pycache__/
*.pyc

# Environment / secrets
.env
.env.*
!.env.example

# Database files (too large for GitHub)
*.db
*.db-shm
*.db-wal

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Logs
*.log

# Build output
/build
/dist
```

### Rules:
- `folder/` → ignores the entire folder
- `*.log` → ignores all files ending in .log
- `!.env.example` → exception: DO track this file even though .env.* is ignored
- `/data/` → ignores only the `data` folder at the root (not `server/data/`)
- `data/` → ignores `data` folders everywhere

### Adding .gitignore AFTER you already pushed files:
```bash
# If you already pushed a file you want to ignore:
git rm --cached secret_file.env    # removes from git but keeps the file locally
echo "secret_file.env" >> .gitignore
git add .gitignore
git commit -m "chore: remove secret from tracking"
git push
```

---

## 5. Commit Messages

Use clear, descriptive messages. Conventional format:

| Prefix | When to use | Example |
|--------|------------|---------|
| `feat:` | New feature | `feat: add DVN search by name` |
| `fix:` | Bug fix | `fix: correct phantom volume from EXTENDED payloads` |
| `docs:` | Documentation | `docs: update README with data scale` |
| `chore:` | Maintenance | `chore: update .gitignore to exclude logs` |
| `refactor:` | Code restructure | `refactor: split search into 5 priority sources` |

---

## 6. Branches

```bash
# Create a new branch
git checkout -b feature/new-search

# Switch between branches
git checkout main
git checkout feature/new-search

# Push a branch to GitHub
git push -u origin feature/new-search

# Merge branch into main
git checkout main
git merge feature/new-search
git push
```

---

## 7. Common Problems & Fixes

### "Updates were rejected because the remote contains work you don't have"
```bash
git pull --rebase origin main
git push
```

### "You have unstaged changes"
```bash
git stash          # temporarily save your changes
git pull           # get latest from GitHub
git stash pop      # re-apply your changes
```

### "I pushed a secret file by mistake"
```bash
git rm --cached .env          # remove from git, keep locally
echo ".env" >> .gitignore
git commit -m "chore: remove .env from tracking"
git push
# NOTE: the file is still in git history. For true removal, use:
# git filter-branch or BFG Repo-Cleaner
```

### "I want to undo my last commit (not pushed yet)"
```bash
git reset --soft HEAD~1    # undo commit, keep changes staged
```

---

## 8. Checking What's Happening

```bash
git status                  # what's changed?
git log --oneline -5        # last 5 commits
git diff                    # see exact changes
git remote -v               # which GitHub repo am I connected to?
git branch                  # which branch am I on?
```

---

## 9. Deleting a Repo from GitHub

1. Go to the repo on github.com
2. Settings (top right tab)
3. Scroll all the way down to "Danger Zone"
4. Click "Delete this repository"
5. Type the repo name to confirm

This ONLY deletes the GitHub copy. Your local files stay.

---

## 10. GitHub Profile README

To show a custom README on your GitHub profile page:
1. Create a repo named exactly `ooracle100` (same as your username)
2. Add a README.md to it
3. Whatever you write in that README appears on github.com/ooracle100

This is what makes your GitHub landing page look professional instead of just a list of repos.
