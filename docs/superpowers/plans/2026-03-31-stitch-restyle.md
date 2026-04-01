# Stitch "Academic Curator" Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current blue/orange design system with the Stitch "Academic Curator" system (Deep Indigo + Teal, Manrope + Inter, tonal layering) by extracting all CSS into a shared `styles.css` and linking both HTML files to it.

**Architecture:** Create `styles.css` at project root containing all CSS for both pages. Remove the `<style>` blocks from `index.html` (lines 10–1304) and `admin.html` (lines 11–1021) and replace each with a single `<link rel="stylesheet" href="styles.css">` tag. Zero changes to HTML structure or JavaScript.

**Tech Stack:** Vanilla CSS, Google Fonts (Manrope + Inter), no build tools.

**Design Spec:** `docs/superpowers/specs/2026-03-31-stitch-restyle-design.md`

---

### Task 1: Create `styles.css` with complete shared + page-specific CSS

**Files:**
- Create: `styles.css`

- [ ] **Step 1: Write `styles.css`**

Use the Write tool to create `styles.css` at the project root with the following complete content:

```css
/* ================================================================
   DESIGN PROBLEM BANK — SHARED STYLES
   Design System: "Academic Curator" (Stitch)
   ================================================================ */

@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap');

/* ===== CSS RESET ===== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ===== DESIGN TOKENS ===== */
:root {
    /* Primary — Deep Indigo */
    --primary:            #2b3896;
    --primary-light:      #4551af;
    --primary-dark:       #1e2a7a;

    /* Secondary — Vibrant Teal (replaces orange accent entirely) */
    --secondary:          #006a60;
    --secondary-container:#85f6e5;
    --on-secondary-container: #007166;
    --accent:             #006a60;
    --accent-light:       #008577;

    /* Semantic */
    --success:            #006a60;
    --warning:            #FF9800;
    --danger:             #ba1a1a;
    --error:              #ba1a1a;

    /* Surfaces — tonal layering, no divider lines */
    --bg:                 #f8f9ff;
    --bg-card:            #ffffff;
    --surface-low:        #eff4ff;
    --surface-container:  #e6eeff;
    --surface-dim:        #ccdbf3;

    /* Text — never pure black */
    --text:               #0d1c2e;
    --text-light:         #454652;
    --text-muted:         #757684;

    /* Borders — ghost borders only */
    --outline:            #757684;
    --outline-variant:    #c5c5d4;
    --border:             rgba(197, 197, 212, 0.2);

    /* Elevation — indigo-slate tinted shadows */
    --shadow:             0px 8px 20px rgba(13, 28, 46, 0.05);
    --shadow-lg:          0px 20px 40px rgba(13, 28, 46, 0.07);

    /* Shape */
    --radius:             0.5rem;
    --radius-sm:          0.25rem;
    --radius-lg:          0.75rem;
    --transition:         0.2s ease;
}

/* ===== BASE ===== */
body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    min-height: 100vh;
}

h1, h2, h3, h4, h5, h6 {
    font-family: 'Manrope', sans-serif;
}

/* ===== HEADER — glassmorphism ===== */
.site-header {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: var(--text);
    padding: 0;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: var(--shadow);
}

.header-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.header-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.header-brand .logo { font-size: 1.8rem; }

.header-brand h1 {
    font-family: 'Manrope', sans-serif;
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text);
}

.header-brand .subtitle {
    font-size: 0.75rem;
    opacity: 0.7;
    font-weight: 400;
    color: var(--text-light);
}

.header-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.header-stat {
    text-align: center;
    padding: 0 1rem;
    border-right: 1px solid var(--outline-variant);
}

.header-stat:last-of-type { border-right: none; }

.header-stat .stat-num {
    font-family: 'Manrope', sans-serif;
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--primary);
}

.header-stat .stat-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
}

.team-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--surface-container);
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    font-size: 0.82rem;
    color: var(--text);
}

.team-badge .badge-icon { font-size: 1rem; }

.user-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.82rem;
    color: var(--text-light);
}

.user-avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 2px solid var(--outline-variant);
}

.free-agent-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--surface-container);
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    font-size: 0.82rem;
    font-style: italic;
    color: var(--text-light);
}

.free-agent-badge .badge-icon { font-size: 1rem; }

/* ===== BUTTONS ===== */
.btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.2rem;
    border: none;
    border-radius: var(--radius);
    font-size: 0.9rem;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    transition: all var(--transition);
    text-decoration: none;
    white-space: nowrap;
}

.btn-primary {
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
    color: white;
}

.btn-primary:hover {
    background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary) 100%);
    box-shadow: 0 4px 15px rgba(43, 56, 150, 0.35);
}

.btn-secondary {
    background: var(--secondary-container);
    color: var(--on-secondary-container);
}

.btn-secondary:hover {
    background: #6de0cf;
    box-shadow: var(--shadow);
}

.btn-success {
    background: var(--secondary-container);
    color: var(--on-secondary-container);
}

.btn-success:hover {
    background: #6de0cf;
    box-shadow: var(--shadow);
}

.btn-warning {
    background: var(--warning);
    color: white;
}

.btn-warning:hover { background: #FB8C00; }

.btn-outline {
    background: transparent;
    color: var(--primary);
    border: 1.5px solid var(--outline-variant);
}

.btn-outline:hover {
    background: var(--surface-container);
    border-color: var(--primary);
}

.btn-ghost {
    background: transparent;
    color: var(--text-light);
    padding: 0.4rem 0.8rem;
}

.btn-ghost:hover {
    background: var(--surface-low);
    color: var(--text);
}

.btn-icon {
    width: 36px;
    height: 36px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
}

.btn-sm {
    padding: 0.4rem 0.8rem;
    font-size: 0.82rem;
}

.btn-google {
    background: white;
    color: #333;
    border: 1px solid var(--outline-variant);
    font-size: 1rem;
    padding: 0.8rem 1.5rem;
}

.btn-google:hover {
    background: var(--surface-low);
    box-shadow: var(--shadow);
}

.btn-danger-outline {
    background: transparent;
    color: var(--danger);
    border: 1.5px solid var(--danger);
}

.btn-danger-outline:hover {
    background: var(--danger);
    color: white;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
}

.btn-disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--outline-variant) !important;
    color: var(--bg-card) !important;
}

.btn-disabled:hover {
    background: var(--outline-variant) !important;
    transform: none !important;
}

/* ===== TAGS ===== */
.tag {
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.tag-category         { background: #dde4ff; color: var(--primary); }
.tag-discipline       { background: var(--secondary-container); color: var(--secondary); }
.tag-status-new       { background: #d7f5ee; color: #006a60; }
.tag-status-claimed   { background: #fff3c4; color: #7a5800; }
.tag-status-inprogress { background: #dde4ff; color: var(--primary); }
.tag-status-solved    { background: #ead5ff; color: #6200ea; }
.tag-team             { background: var(--surface-container); color: var(--primary); }

.tag-severity {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    background: var(--secondary-container);
    color: var(--secondary);
}

/* ===== MODAL ===== */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(13, 28, 46, 0.5);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
}

.modal-overlay.active {
    opacity: 1;
    visibility: visible;
}

.modal {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 720px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: var(--shadow-lg);
    transform: translateY(20px);
    transition: transform 0.3s ease;
}

.modal-overlay.active .modal { transform: translateY(0); }

.modal-header {
    padding: 1.5rem 2rem 1rem;
    background: var(--surface-low);
    border-bottom: none;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.modal-header h2 {
    font-family: 'Manrope', sans-serif;
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--text);
}

.modal-header p {
    font-size: 0.85rem;
    color: var(--text-light);
    margin-top: 0.2rem;
}

.modal-close {
    background: none;
    border: none;
    font-size: 1.3rem;
    cursor: pointer;
    color: var(--text-muted);
    padding: 0.2rem;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-close:hover { color: var(--text); }

.modal-body { padding: 1.5rem 2rem; }

.modal-footer {
    padding: 1rem 2rem 1.5rem;
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    background: var(--surface-low);
    border-top: none;
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.modal-section { margin-bottom: 1.5rem; }
.modal-section:last-child { margin-bottom: 0; }

/* ===== FORMS ===== */
.form-group { margin-bottom: 1.5rem; }

.form-group label {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 0.4rem;
    color: var(--text);
    font-family: 'Inter', sans-serif;
}

.form-group label .required { color: var(--danger); margin-left: 2px; }

.form-group label .optional {
    color: var(--text-muted);
    font-weight: 400;
    font-size: 0.8rem;
}

.form-group .helper {
    font-size: 0.78rem;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
}

.form-input, .form-textarea, .form-select {
    width: 100%;
    padding: 0.7rem 1rem;
    background: var(--surface-container);
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: var(--radius-sm);
    font-size: 0.95rem;
    font-family: 'Inter', sans-serif;
    color: var(--text);
    transition: border-color var(--transition), background var(--transition);
}

.form-input:focus, .form-textarea:focus, .form-select:focus {
    outline: none;
    border-bottom-color: var(--primary);
    background: var(--surface-low);
}

.form-input.error, .form-textarea.error {
    border-bottom-color: var(--danger);
}

.form-textarea { resize: vertical; min-height: 100px; }

.error-message {
    font-size: 0.78rem;
    color: var(--danger);
    margin-top: 0.3rem;
    display: none;
}

.form-input.error + .error-message,
.form-textarea.error + .error-message { display: block; }

/* ===== EMPTY STATE ===== */
.empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 4rem 2rem;
    color: var(--text-light);
}

.empty-state .empty-icon { font-size: 4rem; margin-bottom: 1rem; }

.empty-state h3 {
    font-family: 'Manrope', sans-serif;
    font-size: 1.3rem;
    color: var(--text);
    margin-bottom: 0.5rem;
}

.empty-state p {
    color: var(--text-light);
    margin-bottom: 1.5rem;
}

/* ===== LOADING SPINNER ===== */
.spinner {
    width: 24px;
    height: 24px;
    border: 3px solid var(--surface-container);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    margin: 0 auto;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ===== TOAST ===== */
.toast-container {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    z-index: 300;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.toast {
    background: var(--text);
    color: white;
    padding: 0.8rem 1.2rem;
    border-radius: var(--radius-sm);
    font-size: 0.88rem;
    box-shadow: var(--shadow-lg);
    animation: slideInToast 0.3s ease;
}

.toast.success { background: var(--secondary); }
.toast.error   { background: var(--danger); }

@keyframes slideInToast {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0); opacity: 1; }
}

/* ===== TEAM BANNER ===== */
.team-banner {
    background: var(--surface-low);
    padding: 1.2rem;
    border-radius: var(--radius);
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    border-left: 4px solid var(--secondary);
}

.team-banner .banner-icon { font-size: 1.8rem; flex-shrink: 0; }
.team-banner .banner-content { flex: 1; }
.team-banner .banner-message { font-size: 0.95rem; color: var(--text); margin-bottom: 0.75rem; }
.team-banner .banner-buttons { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.team-banner .banner-buttons .btn-sm { padding: 0.5rem 1rem; font-size: 0.82rem; }

/* ===== CONFIG BANNER ===== */
.config-banner {
    background: #FFF3E0;
    border-bottom: 2px solid #FFE0B2;
    padding: 1rem 1.5rem;
    text-align: center;
    font-size: 0.88rem;
    color: #E65100;
}

.config-banner code {
    background: rgba(0,0,0,0.08);
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    font-size: 0.82rem;
}

/* ===== COMMENT BUBBLE BTN ===== */
.comment-bubble-btn {
    cursor: pointer;
    transition: color var(--transition);
}

.comment-bubble-btn:hover { color: var(--primary); }

/* ===================================================================
   INDEX.HTML — STUDENT-FACING PAGE STYLES
   =================================================================== */

/* ===== HERO ===== */
.hero {
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
    color: white;
    padding: 3rem 1.5rem;
    text-align: center;
    position: relative;
    overflow: hidden;
}

.hero::before {
    content: '';
    position: absolute;
    top: -50%; right: -20%;
    width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(133,246,229,0.12) 0%, transparent 70%);
    border-radius: 50%;
}

.hero::after {
    content: '';
    position: absolute;
    bottom: -30%; left: -10%;
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(133,246,229,0.08) 0%, transparent 70%);
    border-radius: 50%;
}

.hero-content { position: relative; z-index: 1; max-width: 700px; margin: 0 auto; }

.hero h2 {
    font-family: 'Manrope', sans-serif;
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: 1rem;
    letter-spacing: -0.03em;
    line-height: 1.2;
}

.hero p { font-size: 1.1rem; opacity: 0.9; margin-bottom: 2rem; line-height: 1.7; }
.hero .btn { font-size: 1.1rem; padding: 0.8rem 2rem; }

/* ===== FILTER BAR ===== */
.filter-bar {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem;
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
}

.search-box { flex: 1; min-width: 200px; position: relative; }

.search-box input {
    width: 100%;
    padding: 0.7rem 1rem 0.7rem 2.5rem;
    background: var(--surface-container);
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: var(--radius-sm);
    font-size: 0.95rem;
    font-family: 'Inter', sans-serif;
    color: var(--text);
    transition: border-color var(--transition);
}

.search-box input:focus { outline: none; border-bottom-color: var(--primary); }

.search-box .search-icon {
    position: absolute;
    left: 0.8rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
}

.filter-chips { display: flex; gap: 0.5rem; flex-wrap: wrap; }

.chip {
    padding: 0.4rem 0.9rem;
    border: 1.5px solid var(--outline-variant);
    border-radius: 20px;
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition);
    background: var(--bg-card);
    color: var(--text-light);
}

.chip:hover, .chip.active {
    border-color: var(--primary);
    background: var(--primary);
    color: white;
}

.sort-select {
    padding: 0.5rem 0.8rem;
    background: var(--surface-container);
    border: none;
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    color: var(--text);
    cursor: pointer;
}

/* ===== GALLERY GRID ===== */
.gallery {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem 3rem;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 2rem;
}

/* ===== PROBLEM CARD ===== */
.problem-card {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow);
    overflow: hidden;
    transition: all var(--transition);
    cursor: pointer;
    display: flex;
    flex-direction: column;
}

.problem-card:hover { box-shadow: var(--shadow-lg); }

.problem-card.highlight { animation: cardHighlight 2s ease; }

@keyframes cardHighlight {
    0%   { box-shadow: 0 0 0 4px var(--secondary-container); }
    100% { box-shadow: var(--shadow); }
}

.card-image {
    width: 100%;
    height: 180px;
    object-fit: cover;
    background: linear-gradient(135deg, var(--surface-container), var(--surface-dim));
    display: flex;
    align-items: center;
    justify-content: center;
}

.card-image img { width: 100%; height: 100%; object-fit: cover; }
.card-image .placeholder-icon { font-size: 3rem; opacity: 0.3; }

.card-body { padding: 1.2rem; flex: 1; display: flex; flex-direction: column; }
.card-tags { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.8rem; }

.card-title {
    font-family: 'Manrope', sans-serif;
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: var(--text);
    line-height: 1.3;
}

.card-description {
    font-size: 0.88rem;
    color: var(--text-light);
    line-height: 1.5;
    margin-bottom: 1rem;
    flex: 1;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.card-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 0.8rem;
    border-top: 1px solid rgba(197, 197, 212, 0.15);
}

.card-submitter { font-size: 0.8rem; color: var(--text-muted); }
.card-actions { display: flex; gap: 0.75rem; align-items: center; }

.card-action {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.82rem;
    color: var(--text-muted);
    cursor: pointer;
    transition: color var(--transition);
    background: none;
    border: none;
    padding: 0.2rem;
}

.card-action:hover { color: var(--primary); }
.card-action.upvoted { color: var(--secondary); }

.severity-indicator { display: flex; align-items: center; gap: 0.3rem; font-size: 0.82rem; }

/* ===== QUICK COMMENT POPUP ===== */
.quick-comment-popup {
    position: fixed;
    z-index: 250;
    background: var(--bg-card);
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg);
    width: 360px;
    max-width: 90vw;
    max-height: 400px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: popIn 0.2s ease;
}

@keyframes popIn {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1); }
}

.quick-comment-popup .qc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: var(--surface-low);
    font-family: 'Manrope', sans-serif;
    font-weight: 600;
    font-size: 0.9rem;
}

.quick-comment-popup .qc-close {
    background: none; border: none; cursor: pointer;
    font-size: 1.1rem; color: var(--text-muted); padding: 0.2rem;
}

.quick-comment-popup .qc-close:hover { color: var(--text); }

.quick-comment-popup .qc-body {
    flex: 1; overflow-y: auto; padding: 0.75rem 1rem; max-height: 220px;
}

.quick-comment-popup .qc-body .comment { margin-bottom: 0.75rem; }

.quick-comment-popup .qc-empty {
    text-align: center; padding: 1.5rem 1rem;
    color: var(--text-muted); font-size: 0.88rem;
}

.quick-comment-popup .qc-input {
    padding: 0.75rem 1rem;
    background: var(--surface-low);
    display: flex; flex-direction: column; gap: 0.5rem;
}

.quick-comment-popup .qc-input-row { display: flex; gap: 0.5rem; }

.quick-comment-popup .qc-input input {
    flex: 1; padding: 0.5rem 0.75rem;
    background: var(--surface-container); border: none;
    border-bottom: 2px solid transparent; border-radius: var(--radius-sm);
    font-size: 0.82rem; font-family: 'Inter', sans-serif;
}

.quick-comment-popup .qc-input input:focus {
    outline: none; border-bottom-color: var(--primary);
}

.quick-comment-popup .qc-input button { padding: 0.5rem 0.8rem; font-size: 0.82rem; }
.quick-comment-overlay { position: fixed; inset: 0; z-index: 240; background: transparent; }

/* ===== WIZARD ===== */
.wizard-header {
    padding: 1.5rem 2rem 1rem;
    background: var(--surface-low);
}

.wizard-header h2 {
    font-family: 'Manrope', sans-serif;
    font-size: 1.4rem; font-weight: 700; margin-bottom: 0.25rem;
}

.wizard-header p { font-size: 0.88rem; color: var(--text-light); }

.wizard-progress { display: flex; align-items: center; padding: 1.5rem 2rem 0; gap: 0; }

.wizard-step-indicator {
    display: flex; align-items: center; gap: 0.5rem;
    font-size: 0.82rem; font-weight: 600; color: var(--text-muted); white-space: nowrap;
}

.wizard-step-indicator.active { color: var(--primary); }
.wizard-step-indicator.completed { color: var(--secondary); }

.step-dot {
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.8rem; font-weight: 700;
    background: var(--surface-container); color: var(--text-muted);
    transition: all var(--transition);
}

.wizard-step-indicator.active .step-dot    { background: var(--primary); color: white; }
.wizard-step-indicator.completed .step-dot { background: var(--secondary); color: white; }

.step-connector {
    flex: 1; height: 2px; background: var(--surface-container);
    margin: 0 0.5rem; min-width: 20px;
}

.step-connector.completed { background: var(--secondary); }

.wizard-body { padding: 1.5rem 2rem; }
.wizard-step { display: none; }
.wizard-step.active { display: block; animation: fadeIn 0.3s ease; }

@keyframes fadeIn {
    from { opacity: 0; transform: translateX(10px); }
    to   { opacity: 1; transform: translateX(0); }
}

.wizard-footer {
    padding: 1rem 2rem 1.5rem;
    display: flex; justify-content: space-between; align-items: center;
    background: var(--surface-low);
}

/* ===== SEVERITY PICKER ===== */
.severity-picker { display: flex; gap: 0.5rem; flex-wrap: wrap; }

.severity-option {
    display: flex; flex-direction: column; align-items: center;
    gap: 0.3rem; padding: 0.7rem 0.9rem;
    background: var(--surface-low);
    border: 2px solid transparent;
    border-radius: var(--radius-sm); cursor: pointer;
    transition: all var(--transition); flex: 1; min-width: 70px; text-align: center;
}

.severity-option:hover { border-color: var(--primary-light); background: var(--surface-container); }
.severity-option.selected { border-color: var(--primary); background: var(--surface-container); }
.severity-option .emoji { font-size: 1.8rem; }
.severity-option .severity-label { font-size: 0.7rem; font-weight: 600; color: var(--text-light); }

/* ===== PHOTO UPLOAD ===== */
.photo-upload-area {
    border: 2px dashed var(--outline-variant);
    border-radius: var(--radius);
    padding: 2rem; text-align: center; cursor: pointer;
    transition: all var(--transition);
    background: var(--surface-low);
}

.photo-upload-area:hover, .photo-upload-area.dragover {
    border-color: var(--primary); background: var(--surface-container);
}

.photo-upload-area .upload-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
.photo-upload-area p { font-size: 0.9rem; color: var(--text-light); }
.photo-upload-area .upload-hint { font-size: 0.78rem; color: var(--text-muted); margin-top: 0.3rem; }

.photo-previews { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 1rem; }

.photo-preview {
    position: relative; width: 100px; height: 100px;
    border-radius: var(--radius-sm); overflow: hidden;
}

.photo-preview img { width: 100%; height: 100%; object-fit: cover; }

.photo-preview .remove-photo {
    position: absolute; top: 4px; right: 4px;
    width: 22px; height: 22px;
    background: rgba(13, 28, 46, 0.65); color: white;
    border: none; border-radius: 50%; cursor: pointer; font-size: 0.7rem;
    display: flex; align-items: center; justify-content: center;
}

/* ===== TAG INPUT ===== */
.tag-input-group { display: flex; flex-wrap: wrap; gap: 0.5rem; }

.tag-option {
    padding: 0.4rem 0.9rem;
    border: 1.5px solid var(--outline-variant);
    border-radius: 20px; font-size: 0.82rem; cursor: pointer;
    transition: all var(--transition); user-select: none;
}

.tag-option:hover { border-color: var(--primary-light); }
.tag-option.selected { background: var(--primary); border-color: var(--primary); color: white; }

/* ===== WILLINGNESS SELECTOR ===== */
.willingness-options { display: flex; flex-direction: column; gap: 0.5rem; }

.willingness-option {
    display: flex; align-items: center; gap: 0.75rem; padding: 0.8rem 1rem;
    background: var(--surface-low);
    border: 2px solid transparent;
    border-radius: var(--radius-sm); cursor: pointer; transition: all var(--transition);
}

.willingness-option:hover { border-color: var(--primary-light); background: var(--surface-container); }
.willingness-option.selected { border-color: var(--primary); background: var(--surface-container); }
.willingness-option .w-icon { font-size: 1.3rem; }
.willingness-option .w-text { flex: 1; }
.willingness-option .w-title { font-size: 0.9rem; font-weight: 600; }
.willingness-option .w-desc { font-size: 0.78rem; color: var(--text-light); }

/* ===== DETAIL MODAL ===== */
.detail-header { position: relative; }

.detail-image {
    width: 100%; height: 250px; object-fit: cover;
    background: linear-gradient(135deg, var(--surface-container), var(--surface-dim));
    display: flex; align-items: center; justify-content: center;
}

.detail-image img { width: 100%; height: 100%; object-fit: cover; }

.detail-close {
    position: absolute; top: 1rem; right: 1rem;
    width: 36px; height: 36px;
    background: rgba(13, 28, 46, 0.55); color: white;
    border: none; border-radius: 50%; cursor: pointer; font-size: 1.1rem;
    display: flex; align-items: center; justify-content: center; z-index: 1;
}

.detail-body { padding: 1.5rem 2rem 2rem; }

.detail-title {
    font-family: 'Manrope', sans-serif;
    font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;
}

.detail-section { margin-top: 1.5rem; }

.detail-section h4 {
    font-size: 0.85rem; text-transform: uppercase;
    letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 0.5rem;
}

.detail-section p { font-size: 0.95rem; color: var(--text); line-height: 1.6; }

.detail-actions {
    display: flex; gap: 0.75rem; margin-top: 1.5rem;
    padding-top: 1.5rem; border-top: 1px solid rgba(197, 197, 212, 0.15);
}

/* ===== COMMENTS (index) ===== */
.comments-section {
    margin-top: 1.5rem; padding-top: 1.5rem;
    border-top: 1px solid rgba(197, 197, 212, 0.15);
}

.comments-section h4 { font-size: 0.95rem; font-weight: 600; margin-bottom: 1rem; }

.comment { display: flex; gap: 0.75rem; margin-bottom: 1rem; }

.comment-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: var(--primary-light); color: white;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.75rem; font-weight: 700; flex-shrink: 0;
}

.comment-body { flex: 1; }
.comment-author { font-size: 0.82rem; font-weight: 600; }
.comment-time { font-size: 0.72rem; color: var(--text-muted); margin-left: 0.5rem; }
.comment-text { font-size: 0.88rem; color: var(--text); margin-top: 0.2rem; }

.comment-input-area { display: flex; gap: 0.75rem; margin-top: 1rem; }

.comment-input-area input {
    flex: 1; padding: 0.6rem 1rem;
    background: var(--surface-container); border: none;
    border-bottom: 2px solid transparent; border-radius: var(--radius-sm);
    font-size: 0.88rem; font-family: 'Inter', sans-serif;
}

.comment-input-area input:focus { outline: none; border-bottom-color: var(--primary); }

/* ===== SUCCESS SCREEN ===== */
.success-screen { text-align: center; padding: 3rem 2rem; }
.success-screen .success-icon { font-size: 4rem; margin-bottom: 1rem; }

.success-screen h2 {
    font-family: 'Manrope', sans-serif;
    font-size: 1.6rem; font-weight: 700; margin-bottom: 0.5rem;
}

.success-screen p { color: var(--text-light); margin-bottom: 2rem; font-size: 1rem; }

/* ===== INDEX RESPONSIVE ===== */
@media (max-width: 768px) {
    .header-content { flex-wrap: wrap; gap: 0.75rem; }
    .header-stat { display: none; }
    .hero h2 { font-size: 1.6rem; }
    .hero p { font-size: 0.95rem; }
    .gallery { grid-template-columns: 1fr; }
    .filter-bar { flex-direction: column; align-items: stretch; }
    .wizard-progress { padding: 1rem; }
    .wizard-step-indicator span:not(.step-dot) { display: none; }
    .wizard-body { padding: 1.5rem 1.2rem; }
    .wizard-header { padding: 1.2rem; }
    .wizard-footer { padding: 1rem 1.2rem 1.5rem; }
    .severity-picker { gap: 0.35rem; }
    .severity-option { min-width: 55px; padding: 0.5rem; }
    .detail-body { padding: 1.2rem; }
    .modal { max-height: 95vh; margin: 0.5rem; }
}

@media (max-width: 480px) {
    .header-brand h1 { font-size: 1.1rem; }
    .severity-option .severity-label { font-size: 0.6rem; }
}

/* ===================================================================
   ADMIN.HTML — TEACHER/ADMIN PAGE STYLES
   =================================================================== */

/* ===== LOGIN CARD ===== */
.login-screen {
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; padding: 2rem; background: var(--bg);
}

.login-card {
    background: var(--bg-card); border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg); padding: 3rem;
    text-align: center; max-width: 440px; width: 100%;
}

.login-card .login-icon { font-size: 3.5rem; margin-bottom: 1rem; }

.login-card h2 {
    font-family: 'Manrope', sans-serif;
    font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--text);
}

.login-card .login-desc { color: var(--text-light); margin-bottom: 2rem; font-size: 0.95rem; }
.login-card .login-note { margin-top: 1.5rem; font-size: 0.78rem; color: var(--text-muted); }
.login-card a { color: var(--primary); text-decoration: none; }
.login-card a:hover { text-decoration: underline; }

/* ===== JOIN TEAM BUTTON ===== */
.join-team-btn {
    display: flex; align-items: center; gap: 0.75rem;
    width: 100%; padding: 0.8rem 1rem;
    background: var(--surface-low);
    border: 1px solid var(--surface-container);
    border-radius: var(--radius-sm); cursor: pointer;
    transition: all var(--transition); text-align: left;
}

.join-team-btn:hover { border-color: var(--primary); background: var(--surface-container); }
.join-team-btn .jt-icon { font-size: 1.3rem; }
.join-team-btn .jt-info { flex: 1; }
.join-team-btn .jt-name { font-size: 0.95rem; font-weight: 600; color: var(--text); }
.join-team-btn .jt-members { font-size: 0.78rem; color: var(--text-muted); }

/* ===== DASHBOARD ===== */
.dashboard { max-width: 1200px; margin: 0 auto; padding: 1.5rem; }

/* ===== TAB NAV ===== */
.tab-nav {
    display: flex; gap: 0;
    background: var(--surface-low);
    border-radius: var(--radius);
    overflow: hidden; margin-bottom: 1.5rem;
}

.tab-btn {
    flex: 1; padding: 0.9rem 1rem;
    border: none; background: none;
    font-size: 0.9rem; font-weight: 600;
    color: var(--text-muted); cursor: pointer;
    transition: all var(--transition);
    border-bottom: 2px solid transparent; text-align: center;
}

.tab-btn:hover { background: var(--surface-container); color: var(--text); }
.tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); background: transparent; }

.tab-count {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 22px; height: 22px; padding: 0 6px;
    background: var(--surface-container); border-radius: 11px;
    font-size: 0.72rem; font-weight: 700;
    margin-left: 0.4rem; color: var(--text-light);
}

.tab-btn.active .tab-count { background: var(--primary); color: white; }
.tab-panel { display: none; }
.tab-panel.active { display: block; }

/* ===== PROBLEM LIST ITEMS ===== */
.problem-list-item {
    background: var(--bg-card);
    border-radius: var(--radius); box-shadow: var(--shadow);
    padding: 1.2rem 1.5rem; margin-bottom: 1rem;
    display: flex; align-items: flex-start; gap: 1.2rem;
    transition: all var(--transition);
}

.problem-list-item:hover { box-shadow: var(--shadow-lg); }

.pli-image {
    width: 80px; height: 80px; border-radius: var(--radius-sm); object-fit: cover;
    background: linear-gradient(135deg, var(--surface-container), var(--surface-dim));
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; overflow: hidden;
}

.pli-image img { width: 100%; height: 100%; object-fit: cover; }
.pli-image .pli-placeholder { font-size: 1.8rem; opacity: 0.3; }
.pli-body { flex: 1; min-width: 0; }

.pli-top {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 1rem; margin-bottom: 0.3rem;
}

.pli-title {
    font-family: 'Manrope', sans-serif;
    font-size: 1.05rem; font-weight: 700; color: var(--text);
}

.pli-tags { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.4rem; }

.pli-desc {
    font-size: 0.85rem; color: var(--text-light); line-height: 1.5; margin-bottom: 0.5rem;
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden;
}

.pli-meta { display: flex; align-items: center; gap: 1rem; font-size: 0.78rem; color: var(--text-muted); }
.pli-actions { display: flex; flex-direction: column; gap: 0.5rem; flex-shrink: 0; }

/* ===== EDIT FORM (admin) ===== */
.edit-section {
    margin: 1.5rem 0 0.25rem; padding-top: 1.25rem;
    border-top: 1px solid rgba(197, 197, 212, 0.2);
}

.edit-section-label {
    font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 1rem;
}

.edit-severity-picker { display: flex; gap: 0.5rem; flex-wrap: wrap; }

.edit-severity-option {
    flex: 1; min-width: 56px; display: flex; flex-direction: column;
    align-items: center; gap: 0.25rem; padding: 0.6rem 0.3rem;
    background: var(--surface-low);
    border: 2px solid transparent;
    border-radius: 8px; cursor: pointer; transition: all 0.15s; text-align: center;
}

.edit-severity-option:hover { border-color: var(--primary-light); }
.edit-severity-option.selected { border-color: var(--primary); background: var(--surface-container); }
.edit-severity-option .sev-emoji { font-size: 1.4rem; line-height: 1; }
.edit-severity-option .sev-label { font-size: 0.62rem; color: var(--text-muted); line-height: 1.2; }

.edit-tag-group { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.4rem; }

.edit-tag-option {
    padding: 0.35rem 0.75rem;
    border: 1.5px solid var(--outline-variant);
    border-radius: 20px; font-size: 0.82rem; cursor: pointer;
    transition: all 0.15s; user-select: none;
}

.edit-tag-option:hover { border-color: var(--primary-light); }
.edit-tag-option.selected { background: var(--primary); color: white; border-color: var(--primary); }

.edit-willingness-options { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.4rem; }

.edit-willingness-option {
    display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem;
    background: var(--surface-low);
    border: 2px solid transparent;
    border-radius: 8px; cursor: pointer; transition: all 0.15s;
}

.edit-willingness-option:hover { border-color: var(--primary-light); }
.edit-willingness-option.selected { border-color: var(--primary); background: var(--surface-container); }
.edit-willingness-option .w-icon { font-size: 1.4rem; flex-shrink: 0; }
.edit-willingness-option .w-title { font-weight: 600; font-size: 0.88rem; }
.edit-willingness-option .w-desc { font-size: 0.76rem; color: var(--text-muted); }

.edit-danger-zone {
    margin-top: 1.5rem; padding: 1rem;
    border: 2px dashed var(--danger); border-radius: 8px;
}

.edit-danger-label {
    font-size: 0.72rem; font-weight: 700;
    text-transform: uppercase; color: var(--danger); margin-bottom: 0.75rem;
}

/* ===== INTERNAL NOTES ===== */
.notes-section {
    margin-top: 1.5rem; padding-top: 1.5rem;
    border-top: 1px solid rgba(197, 197, 212, 0.2);
}

.notes-section h4 {
    font-family: 'Manrope', sans-serif;
    font-size: 0.95rem; font-weight: 600; margin-bottom: 0.75rem;
}

.note {
    display: flex; gap: 0.75rem; margin-bottom: 0.75rem; padding: 0.75rem;
    background: #fffbe6;
    border-radius: var(--radius-sm); border-left: 3px solid var(--warning);
}

.note-body { flex: 1; }
.note-author { font-size: 0.78rem; font-weight: 600; color: var(--text); }
.note-time { font-size: 0.7rem; color: var(--text-muted); margin-left: 0.5rem; }
.note-text { font-size: 0.85rem; color: var(--text); margin-top: 0.2rem; }

.note-input-area { display: flex; gap: 0.5rem; margin-top: 0.75rem; }

.note-input-area input {
    flex: 1; padding: 0.5rem 0.75rem;
    background: var(--surface-container); border: none;
    border-bottom: 2px solid transparent; border-radius: var(--radius-sm);
    font-size: 0.85rem; font-family: 'Inter', sans-serif;
}

.note-input-area input:focus { outline: none; border-bottom-color: var(--primary); }

/* ===== COMMENTS POPUP (admin) ===== */
.comments-popup-overlay { position: fixed; inset: 0; z-index: 240; background: transparent; }

.comments-popup {
    position: fixed; z-index: 250;
    background: var(--bg-card);
    border-radius: var(--radius); box-shadow: var(--shadow-lg);
    width: 380px; max-width: 90vw; max-height: 400px;
    display: flex; flex-direction: column; overflow: hidden;
    animation: popIn 0.2s ease;
}

.comments-popup .cp-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.75rem 1rem;
    background: var(--surface-low);
    font-family: 'Manrope', sans-serif; font-weight: 600; font-size: 0.9rem;
}

.comments-popup .cp-close {
    background: none; border: none; cursor: pointer;
    font-size: 1.1rem; color: var(--text-muted); padding: 0.2rem;
}

.comments-popup .cp-close:hover { color: var(--text); }

.comments-popup .cp-body { flex: 1; overflow-y: auto; padding: 0.75rem 1rem; max-height: 320px; }
.comments-popup .cp-empty { text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.88rem; }
.comments-popup .cp-comment { display: flex; gap: 0.6rem; margin-bottom: 0.75rem; }

.comments-popup .cp-avatar {
    width: 28px; height: 28px; border-radius: 50%;
    background: var(--primary-light); color: white;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; font-weight: 700; flex-shrink: 0;
}

.comments-popup .cp-author { font-size: 0.8rem; font-weight: 600; }
.comments-popup .cp-time { font-size: 0.7rem; color: var(--text-muted); margin-left: 0.4rem; }
.comments-popup .cp-text { font-size: 0.85rem; color: var(--text); margin-top: 0.15rem; line-height: 1.4; }

.comments-popup .cp-hint {
    padding: 0.6rem 1rem;
    background: var(--surface-low);
    font-size: 0.75rem; color: var(--text-muted); text-align: center;
}

/* ===== EMAIL TEMPLATE ===== */
.email-template {
    background: var(--surface-low);
    border-radius: var(--radius-sm); padding: 1.2rem;
    font-size: 0.88rem; line-height: 1.6;
    white-space: pre-wrap; font-family: 'Inter', sans-serif;
    color: var(--text); max-height: 300px; overflow-y: auto;
}

.email-actions { display: flex; gap: 0.75rem; margin-top: 1rem; }

/* ===== ADMIN RESPONSIVE ===== */
@media (max-width: 768px) {
    .header-content { flex-wrap: wrap; gap: 0.75rem; }
    .team-badge { display: none; }
    .stats-row { grid-template-columns: repeat(2, 1fr); }
    .problem-list-item { flex-direction: column; }
    .pli-image { width: 100%; height: 120px; }
    .pli-actions { flex-direction: row; }
    .modal-body { padding: 1.2rem; }
    .tab-btn { font-size: 0.78rem; padding: 0.7rem 0.5rem; }
}
```

- [ ] **Step 2: Verify file was created**

```bash
wc -l styles.css
```

Expected: roughly 600–700 lines. If missing, the Write tool failed — retry Step 1.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: add styles.css with Stitch Academic Curator design system"
```

---

### Task 2: Update `index.html` — replace style block with stylesheet link

**Files:**
- Modify: `index.html` (lines 10–1304)

The current `<style>` block runs from line 10 (`<style>`) to line 1304 (`</style>`). Replace the entire block with a single link tag.

- [ ] **Step 1: Replace the style block**

Use the Edit tool. Find this exact string (the opening of the style tag, from line 10):

```
    <style>
        /* ===== CSS RESET & BASE ===== */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
```

Replace it with:

```
    <link rel="stylesheet" href="styles.css">
    <style>
        /* index.html page-specific overrides — intentionally minimal */
```

Then find the remaining closing tag block. After the responsive media queries end, the file has:

```
        }
    </style>
```

(around line 1302–1304). This closing tag is already in the file — nothing to change there. The approach is: the `<style>` block now contains only the opening comment, and the rest of the original CSS from lines 11 to 1303 needs to be removed.

**Practical approach:** Use the Read tool to read `index.html` lines 1–10 and lines 1295–1310 to confirm exact text, then use Edit to replace from the CSS reset line all the way to just before `</style>` with an empty comment.

Specifically, replace everything from:
```
        /* ===== CSS RESET & BASE ===== */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
```
all the way to just before the `    </style>` closing tag, with just a blank line. The resulting `<style>` block will be:

```html
    <link rel="stylesheet" href="styles.css">
    <style>
        /* index.html page-specific overrides — intentionally minimal */
    </style>
```

**Important:** Because the Edit tool requires a unique match, use a large enough context window. Read lines 9–16 of index.html to get the exact opening text, then read lines 1295–1306 to get the exact closing text. Do one Edit replacing from the CSS reset comment to the last CSS rule before `</style>`.

- [ ] **Step 2: Verify the style block is gone and link is present**

```bash
grep -n "<style>\|<link rel" "index.html" | head -10
```

Expected output includes:
```
10:    <link rel="stylesheet" href="styles.css">
11:    <style>
13:    </style>
```
(line numbers may vary by ±1)

- [ ] **Step 3: Open in browser and do a visual check**

Open `index.html` directly in a browser (File > Open, or use a local server). Verify:
- Header has glassmorphism (light/blurred background, not dark)
- Primary color is Deep Indigo, not the old blue
- No orange anywhere
- Fonts are Manrope (headers) and Inter (body)
- Cards have soft shadows, no hard borders
- Problem cards have more breathing room between them

If the page looks completely unstyled, `styles.css` is not being found — check the relative path.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: link index.html to shared styles.css, remove inline style block"
```

---

### Task 3: Update `admin.html` — replace style block with stylesheet link

**Files:**
- Modify: `admin.html` (lines 11–1021)

Same process as Task 2. The `<style>` block in `admin.html` runs from line 11 to line 1021.

- [ ] **Step 1: Read the opening and closing lines of the style block**

Read `admin.html` lines 9–18 and lines 1013–1025 to get the exact text for the Edit.

- [ ] **Step 2: Replace the style block**

Replace the entire contents of the `<style>` block (from the CSS reset comment to the last rule before `</style>`) with an empty comment, and add the `<link>` tag before `<style>`:

The result should be:
```html
    <link rel="stylesheet" href="styles.css">
    <style>
        /* admin.html page-specific overrides — intentionally minimal */
    </style>
```

Use the same Edit strategy as Task 2: find the unique opening text (`/* ===== SHARED DESIGN SYSTEM =====` or similar — read the file first to confirm the exact comment), and replace from there to just before `</style>`.

- [ ] **Step 3: Verify**

```bash
grep -n "<style>\|<link rel" "admin.html" | head -10
```

Expected: `<link rel="stylesheet" href="styles.css">` on one line and a near-empty `<style>` block.

- [ ] **Step 4: Open admin.html in browser and check**

Open `admin.html` in a browser. The login screen should appear (you can't sign in without the live Firebase config, but the login card styling should be visible). Verify:
- Login card has the Stitch look (Manrope heading, indigo button gradient, soft shadow)
- Background is `#f8f9ff` (very light indigo-tinted white)
- No orange anywhere

- [ ] **Step 5: Commit**

```bash
git add admin.html
git commit -m "feat: link admin.html to shared styles.css, remove inline style block"
```

---

### Task 4: Final verification and cleanup

**Files:** None modified — verification only.

- [ ] **Step 1: Confirm no orphaned CSS variables remain in HTML files**

```bash
grep -n "var(--primary\|var(--accent\|var(--border\|var(--shadow" index.html | head -20
grep -n "var(--primary\|var(--accent\|var(--border\|var(--shadow" admin.html | head -20
```

Expected: zero matches (all CSS has moved to styles.css). If matches appear, they are either in the remaining `<style>` block (fine, that's the empty placeholder) or in inline `style=""` attributes on HTML elements (also fine, leave those alone).

- [ ] **Step 2: Confirm JavaScript files reference no removed CSS classes**

```bash
grep -n "classList\|className\|style\." index.html | grep -v "^[0-9]*:.*<style\|^[0-9]*:.*--" | head -30
```

This is a sanity check — look for any JS that adds/removes classes that no longer exist. The class names are all preserved in `styles.css` so this should be fine.

- [ ] **Step 3: Check .gitignore for .superpowers**

```bash
grep ".superpowers" .gitignore 2>/dev/null || echo "not in .gitignore"
```

If not present, add it:
```bash
echo ".superpowers/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore .superpowers brainstorm dir"
```

- [ ] **Step 4: Final commit**

```bash
git status
git log --oneline -5
```

Confirm all tasks have been committed. The log should show:
1. `chore: ignore .superpowers brainstorm dir`
2. `feat: link admin.html to shared styles.css, remove inline style block`
3. `feat: link index.html to shared styles.css, remove inline style block`
4. `feat: add styles.css with Stitch Academic Curator design system`
