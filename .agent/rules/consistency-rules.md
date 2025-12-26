# Code Consistency Rules

**CRITICAL: These rules MUST be followed when creating or modifying systems.**

---

## 🎯 RULE 1: Analyze Before Implementing

**Enforcement:** BLOCKING

Before writing ANY new code:
1. **Search for existing patterns** - Does similar functionality already exist?
2. **Identify reusable components** - Can an existing function be extended?
3. **Check for duplication** - Am I about to recreate something that exists?
4. **Review related systems** - What else will be affected by this change?

---

## 🔄 RULE 2: No Code Duplication

**Enforcement:** BLOCKING

### Anti-Patterns
- ❌ Copy-pasting logic between files
- ❌ Creating parallel implementations of the same feature
- ❌ Hardcoding mappings that exist elsewhere

### Required Patterns
- ✅ Extract shared logic to helper functions
- ✅ Import and reuse existing helpers
- ✅ Single source of truth for mappings/conversions

---

## 📍 RULE 3: Centralized Mappings

**Enforcement:** BLOCKING

Widget types, integration names, and other mappings should live in ONE place and be imported everywhere else.

---

## 🔗 RULE 4: Single API Flow Per Feature

**Enforcement:** BLOCKING

Each feature should have ONE canonical API flow:

| Feature | Canonical Location |
|---------|-------------------|
| Apply template to dashboard | `templates.ts → applyTemplateToUser()` |
| Share integration | `integrationShares.ts → shareIntegration()` |
| Widget-to-dashboard format | `templates.ts → convertTemplateWidgets()` |

---

## 📊 RULE 5: Dev/Production Parity

**Enforcement:** ADVISORY

If dev server and Docker behave differently:
1. Was dev server restarted after TS changes?
2. Was Docker rebuilt after code changes?
3. Are databases at same migration version?

---

## 🚨 Known Issues to Fix in Next Session

1. **Widget integration mapping** - Hardcoded in `users.ts`, should be centralized
2. **Template apply endpoint** - May still have inline conversion (should use helper)
3. **Widget type names** - Inconsistent capitalization
4. **Link widget** - Not working in dev server
5. **System status** - Not sharing via default template

---

**Last Updated:** 2025-12-25
