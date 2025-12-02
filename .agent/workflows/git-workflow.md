---
description: Git workflow for Framerr development
---

# Git Workflow for Framerr Development

## Daily Development

### Starting Your Work
```bash
# Switch to develop branch
git checkout develop

# Pull latest changes (after remote is set up)
git pull origin develop
```

### Making Changes
```bash
# Make your code changes
# ... edit files ...

# Check what changed
git status
git diff

# Stage your changes
git add .
# OR stage specific files
git add src/components/MyComponent.jsx

# Commit with conventional commit message
git commit -m "feat(widgets): add new widget feature"

# Push to backup on GitHub (after remote is set up)
git push origin develop
```

### Conventional Commit Messages
Format: `<type>(<scope>): <description>`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting (no logic change)
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance, dependencies
- `build`: Build system changes

**Examples:**
```bash
git commit -m "feat(auth): implement OAuth login"
git commit -m "fix(widgets): resolve clock timezone issue"
git commit -m "docs: update README installation steps"
git commit -m "chore(deps): update React to 18.3.1"
```

---

## Feature Development

### Create Feature Branch
```bash
# Start from develop
git checkout develop
git pull origin develop  # Get latest changes

# Create feature branch
git checkout -b feature/widget-gallery-redesign
```

### Work on Feature
```bash
# Make commits as you work
git add .
git commit -m "feat(gallery): add grid layout"
git commit -m "feat(gallery): add search functionality"
git commit -m "style(gallery): improve mobile responsiveness"
```

### Merge Feature Back
```bash
# Switch back to develop
git checkout develop

# Merge your feature
git merge feature/widget-gallery-redesign

# Push to GitHub
git push origin develop

# Delete feature branch (local)
git branch -d feature/widget-gallery-redesign

# Delete feature branch (remote, if you pushed it)
git push origin --delete feature/widget-gallery-redesign
```

---

## Creating a Release

### Prepare Release
```bash
# Ensure develop is ready
git checkout develop
git pull origin develop

# Test everything thoroughly
npm run build
npm run test  # if you have tests

# Update version in package.json if needed
# ... manual edit ...

# Commit version bump
git add package.json package-lock.json
git commit -m "chore: bump version to 1.1.7"
git push origin develop
```

### Merge to Main (Via Pull Request - Recommended)
1. Go to GitHub.com
2. Create Pull Request: `develop` → `main`
3. Review all changes
4. Add description of what's in this release
5. Merge the PR
6. Tag the release (see below)

### Or Merge Locally
```bash
# Switch to main
git checkout main
git pull origin main

# Merge develop (use --no-ff to create merge commit)
git merge develop --no-ff -m "release: v1.1.7"

# Tag the release
git tag -a v1.1.7 -m "Release version 1.1.7

New features:
- Widget gallery redesign
- OAuth authentication
- Performance improvements

Bug fixes:
- Fixed timezone issues in clock widget
- Resolved Docker entrypoint line endings
"

# Push everything
git push origin main
git push origin --tags

# Switch back to develop for continued work
git checkout develop
```

---

## Emergency Hotfix

### When Production is Broken
```bash
# Branch from main (production)
git checkout main
git pull origin main
git checkout -b hotfix/critical-auth-bug

# Fix the bug
# ... make changes ...
git add .
git commit -m "fix(auth): resolve session timeout issue"

# Merge to main
git checkout main
git merge hotfix/critical-auth-bug
git tag -a v1.1.7-hotfix.1 -m "Hotfix: critical auth bug"

# IMPORTANT: Also merge to develop
git checkout develop
git merge hotfix/critical-auth-bug

# Push everything
git push origin main
git push origin develop
git push origin --tags

# Delete hotfix branch
git branch -d hotfix/critical-auth-bug
```

---

## Viewing History

### Check Current State
```bash
# See what branch you're on and any changes
git status

# View commit history (last 10)
git log --oneline -n 10

# View all branches with graph
git log --oneline --graph --all

# See changes in last commit
git show HEAD
```

### Find Specific Changes
```bash
# Search commits by message
git log --grep="widget"

# See who changed a file
git log --follow src/components/Widget.jsx

# See changes between commits
git diff main..develop
```

---

## Undoing Changes

### Undo Uncommitted Changes
```bash
# Discard changes to a single file
git checkout -- src/components/MyComponent.jsx

# Discard all uncommitted changes (CAREFUL!)
git reset HEAD
```

### Fix Last Commit Message
```bash
# Only if you haven't pushed yet!
git commit --amend -m "fix(auth): correct commit message"
```

### Undo Last Commit (Keep Changes)
```bash
# Remove commit but keep changes staged
git reset --soft HEAD~1

# Remove commit and unstage changes (but keep files)
git reset HEAD~1
```

### 🚫 NEVER USE THESE (Dangerous)
```bash
# These can cause corruption!
git reset --hard <old-commit>  # DANGEROUS
git clean -fd                  # DANGEROUS
git gc --aggressive            # DANGEROUS
git filter-branch              # DANGEROUS
```

---

## Syncing with GitHub

### Daily Sync
```bash
# Download changes from GitHub
git pull origin develop

# Upload your changes to GitHub
git push origin develop
```

### If Push is Rejected
```bash
# Someone else pushed changes
git pull --rebase origin develop
git push origin develop
```

---

## Branch Management

### List All Branches
```bash
# Local branches
git branch

# Include remote branches
git branch -a

# See which branches are merged
git branch --merged develop
```

### Delete Branches
```bash
# Delete local branch (safe, only if merged)
git branch -d feature/old-feature

# Force delete unmerged branch (CAREFUL!)
git branch -D feature/abandoned-feature

# Delete remote branch
git push origin --delete feature/old-feature
```

### Switch Branches
```bash
# Switch to existing branch
git checkout develop

# Create and switch to new branch
git checkout -b feature/new-thing
```

---

## Recovery Commands

### See Recent Actions (Reflog)
```bash
# Your safety net - shows ALL local actions
git reflog

# Recover from a bad reset (if you know the commit hash)
git reset --hard abc1234
```

### Stash Changes Temporarily
```bash
# Save work-in-progress without committing
git stash save "WIP: working on widget"

# List stashes
git stash list

# Apply most recent stash
git stash pop

# Apply specific stash
git stash apply stash@{0}
```

---

## Troubleshooting

### Merge Conflicts
```bash
# When merge has conflicts
# 1. Git will tell you which files conflict
# 2. Open conflicted files and look for:
#    <<<<<<< HEAD
#    your changes
#    =======
#    their changes
#    >>>>>>>
# 3. Manually resolve conflicts
# 4. Mark as resolved:
git add <resolved-file>
# 5. Complete the merge:
git commit
```

### Accidentally Committed to Wrong Branch
```bash
# You're on main but meant to be on develop
# (Haven't pushed yet)

# Note the commit hash
git log --oneline -n 1

# Undo the commit (keep changes)
git reset --soft HEAD~1

# Switch to correct branch
git checkout develop

# Commit there instead
git commit -m "your message"
```

### Forgot to Pull Before Commit
```bash
# You committed but need to pull first
git pull --rebase origin develop
# Resolve any conflicts
git push origin develop
```

---

## Best Practices

### ✅ DO
- Commit frequently on `develop` (messy is OK!)
- Write descriptive commit messages
- Pull before starting work
- Push often to back up your work
- Test before merging to `main`
- Use feature branches for big changes
- Tag all releases

### ❌ DON'T
- Force push to `main` (ever!)
- Commit directly to `main` (use develop)
- Use `git reset --hard` without understanding
- Delete the `.git` folder
- Run Git commands you don't understand
- Commit `node_modules` or build artifacts (use `.gitignore`)
- Rewrite history on shared branches

---

## Quick Reference

### Most Common Commands
```bash
git status                    # What's changed?
git add .                     # Stage everything
git commit -m "message"       # Save snapshot
git push origin develop       # Upload to GitHub
git pull origin develop       # Download from GitHub
git checkout develop          # Switch to develop
git checkout -b feature/name  # New feature branch
git merge feature/name        # Merge feature
git log --oneline -n 10       # Recent commits
git branch                    # List branches
```

### When in Doubt
1. Check status: `git status`
2. Check branch: `git branch`
3. Commit your work: `git add . && git commit -m "WIP: saving work"`
4. Push to GitHub: `git push origin develop`
5. **Then** ask for help!

---

## Getting Help

```bash
# Help for any command
git help <command>
git <command> --help

# Examples
git help commit
git help branch
```

**Remember**: If you're unsure about a command, **DON'T RUN IT**. Your work is backed up on GitHub, so you can always recover!
