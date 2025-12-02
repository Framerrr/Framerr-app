# Framerr Documentation

Welcome to the Framerr documentation! This directory contains all project documentation organized for easy navigation.

---

## 🚀 Quick Start

**New to Framerr?** → Start with [`CHATFLOW.md`](CHATFLOW.md)

**For Developers:**
1. Read [`CHATFLOW.md`](CHATFLOW.md) - Overview and getting started
2. Review [`tasks/HANDOFF.md`](tasks/HANDOFF.md) - Current project state
3. Check [`tasks/STATUS.md`](tasks/STATUS.md) - Development status
4. Read [`.agent/rules.md`](../.agent/rules.md) - Development rules

---

## 📁 Documentation Structure

### [`CHATFLOW.md`](CHATFLOW.md)
Quick start guide and workflow overview. **Start here!**

### [`tasks/`](tasks/)
**Task tracking and project management**
- [`HANDOFF.md`](tasks/HANDOFF.md) - Critical context for agent handoffs
- [`TASK_CURRENT.md`](tasks/TASK_CURRENT.md) - Active session work
- [`STATUS.md`](tasks/STATUS.md) - Overall project status dashboard
- [`TASK_BACKLOG.md`](tasks/TASK_BACKLOG.md) - Future work queue
- [`TASK_COMPLETED.md`](tasks/TASK_COMPLETED.md) - Historical accomplishments

### [`architecture/`](architecture/)
**System design and structure**
- [`ARCHITECTURE.md`](architecture/ARCHITECTURE.md) - File structure and organization
- [`PROJECT_SCOPE.md`](architecture/PROJECT_SCOPE.md) - Vision, features, and tech stack

### [`development/`](development/)
**Developer guides and references**
- [`WIDGET_DEVELOPMENT_GUIDE.md`](development/WIDGET_DEVELOPMENT_GUIDE.md) - Create custom widgets
- [`LOGGING_REFERENCE.md`](development/LOGGING_REFERENCE.md) - Logging system usage
- [`DOCKER_BUILDS.md`](development/DOCKER_BUILDS.md) - Docker build types and debugging

### [`theming/`](theming/)
**Theming system documentation** (if available)
- Theme engine architecture
- Developer guides
- CSS variable reference
- Component patterns

### [`recovery/`](recovery/)
**Historical recovery documentation**
- Archive of v1.1.6 source code recovery process
- File inventories and selection logs
- Recovery strategy and decisions
- **Reference only** - not needed for current development

### [`versions/`](versions/)
**Version-specific documentation**
- [`1.1.6-recovered.md`](versions/1.1.6-recovered.md) - v1.1.6 recovery notes

---

## 🔗 Related Documentation

### Agent Rules
Location: [`../.agent/rules/`](../.agent/rules/)
- [`rules.md`](../.agent/rules.md) - Quick reference
- [`git-rules.md`](../.agent/rules/git-rules.md) - Git safety rules
- [`development-rules.md`](../.agent/rules/development-rules.md) - Development standards
- [`theming-rules.md`](../.agent/rules/theming-rules.md) - UI theming compliance

### Workflows
Location: [`../.agent/workflows/`](../.agent/workflows/)
- `/start-session` - Initialize work session
- `/end-session` - Session handoff
- `/checkpoint` - Context verification
- `/code-audit` - Code quality cleanup
- `/git-workflow` - Git operations guide
- `/build-develop` - Development deployment
- `/build-production` - Production release
- `/recover-session` - Emergency recovery

---

## 📖 Documentation Conventions

### Markdown Features
- **GitHub Flavored Markdown** with alerts
- **File links:** `[display](file:///absolute/path)`  
- **Line ranges:** `[code](file:///path#L10-L20)`
- **Images/Videos:** `![caption](/absolute/path)`

### Link Formats
- Internal docs: Relative paths (`./tasks/STATUS.md`)
- Agent rules: `../.agent/rules/file.md`
- Workflows: `../.agent/workflows/file.md`
- Source code: Absolute paths with `file://` protocol

### Document Types
- **Guides:** Step-by-step instructions
- **References:** Lookup information
- **Architecture:** Design decisions
- **Tasks:** Project management

---

## 🔄 Keeping Documentation Current

### When to Update

**Always update:**
- [`tasks/HANDOFF.md`](tasks/HANDOFF.md) - After major changes
- [`tasks/TASK_CURRENT.md`](tasks/TASK_CURRENT.md) - During active work
- [`tasks/STATUS.md`](tasks/STATUS.md) - At session end

**Periodically:**
- [`CHATFLOW.md`](CHATFLOW.md) - When workflows change
- [`tasks/TASK_BACKLOG.md`](tasks/TASK_BACKLOG.md) - As priorities shift

**As needed:**
- Architecture docs - When design changes
- Development guides - When processes change

### Workflow Integration

Use `/end-session` workflow which automatically:
- Updates task tracking documents
- Adds session summary to TASK_COMPLETED
- Verifies documentation consistency

---

## 🎯 Documentation Goals

1. **Agent Continuity:** Any agent can resume work across sessions
2. **Developer Onboarding:** Clear guides for new contributors
3. **Project History:** Preserve decisions and context
4. **Reference Material:** Quick lookup for common tasks

---

## 📞 Questions?

- **Getting started:** Read [`CHATFLOW.md`](CHATFLOW.md)
- **Current status:** Check [`tasks/STATUS.md`](tasks/STATUS.md)
- **Task progress:** See [`tasks/TASK_CURRENT.md`](tasks/TASK_CURRENT.md)
- **Rules:** Review [`../.agent/rules.md`](../.agent/rules.md)

---

**Last Updated:** 2025-12-02  
**Documentation Version:** 2.0
