# Git Blob Decompression Plan

**Date:** 2025-12-02  
**Target:** 2,517 compressed git blob objects  
**Output:** `NO_EXTENSION/decompressed/`

---

## Decompression Strategy

### Phase 1: Test Decompression (5 files)
1. Test decompression on 5 sample blobs
2. Verify git object format parsing
3. Confirm file type detection works
4. Validate output

### Phase 2: Batch Decompression (All 2,517)
1. Process all hex-named files
2. Decompress zlib content
3. Parse git blob format
4. Detect file type from content
5. Save with appropriate extension
6. Log results

### Phase 3: Analysis & Organization
1. Catalog extracted files by type
2. Identify missing source files (Login, Setup, TabView, etc.)
3. Compare with existing recovered files
4. Create extraction report

---

## Git Blob Format

### Structure
```
<type> <size>\0<content>
```

**Example:**
```
blob 347\0import React from 'react';...
```

### Types
- `blob` - File content (what we want)
- `tree` - Directory listing (skip)
- `commit` - Commit metadata (skip)
- `tag` - Tag object (skip)

---

## File Type Detection

After extracting content, detect type by analyzing first few lines:

### JavaScript/JSX Detection
```
- Starts with: import, export, const, function, class
- Contains: React, jsx, tsx
- File extension clue in imports
```

### CSS Detection
```
- Contains: {, }, :, ;
- CSS selectors like .class, #id
- Properties like color:, margin:, etc.
```

### JSON Detection
```
- Starts with { or [
- Valid JSON structure
```

### HTML Detection
```
- Starts with <!DOCTYPE, <html>, <div>
- Contains HTML tags
```

### Text/Config Detection
```
- Plain text patterns
- Config file syntax
```

---

## Script Logic

```
For each hex-named file in NO_EXTENSION:
  1. Read file bytes
  2. Check first 2 bytes (78 9C = zlib)
  3. If compressed:
     a. Decompress using DeflateStream
     b. Parse git object header (type, size)
     c. If type == "blob":
        - Extract content after \0
        - Detect file type from content
        - Determine extension
        - Save to decompressed/<type>/<hash>.<ext>
  4. Log: hash, size, type, detected extension
  5. Handle errors gracefully
```

---

## Output Structure

```
NO_EXTENSION/decompressed/
├── jsx/                # React components
│   ├── a1b2c3d4.jsx
│   └── ...
├── js/                 # JavaScript files
├── css/                # Stylesheets
├── json/               # Config files
├── html/               # HTML files
├── txt/                # Text/unknown
├── unknown/            # Couldn't detect type
└── decompression.log   # Extraction log
```

---

## Progress Tracking

Script will output:
- Files processed: X / 2517
- Successfully decompressed: X
- Failed: X
- By type:
  - JSX: X
  - JS: X
  - CSS: X
  - JSON: X
  - Other: X

---

## Error Handling

- Skip non-blob objects (trees, commits)
- Handle decompression failures
- Skip already-processed files
- Log all errors for review

---

## Expected Results

Based on file inventory:
- **Missing pages:** Login.jsx, Setup.jsx, TabView.jsx (~3 files)
- **Missing contexts:** AuthContext.jsx, ThemeContext.jsx (~2 files)
- **Additional components:** Unknown count
- **Old versions:** May find older versions of existing files
- **Other assets:** CSS, JSON configs, etc.

---

## Dependencies

✅ **Built-in (No installation needed):**
- System.IO.Compression.DeflateStream (.NET)
- System.Text.Encoding (.NET)
- PowerShell 5.0+

---

## Estimated Time

- **Test phase:** 5 minutes
- **Full decompression:** 10-15 minutes (2,517 files)
- **Analysis:** 5-10 minutes
- **Total:** ~20-30 minutes

---

## Next Steps

1. ✅ Create decompression script
2. 🔄 Test on 5 sample files
3. ⏸️ Review test results
4. ⏸️ Run full batch decompression
5. ⏸️ Analyze extracted files
6. ⏸️ Identify recovered missing files
