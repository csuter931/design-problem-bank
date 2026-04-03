# Super User Edit Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal 3-field super user edit form in admin.html with a full scrollable form covering all problem fields, with proper padding and Danger Zone actions.

**Architecture:** All changes are in a single file (`admin.html`). CSS classes are added to the existing `<style>` block. Module-level JS state (`editingPhotos`) and helper functions are added near existing module-level vars. `startEditProblem` and `saveEditProblem` are rewritten in-place; `deleteProblem` gets a one-line fix.

**Tech Stack:** Vanilla HTML/CSS/JS, Firebase Firestore (via existing `saveProblem()` helper)

---

### Task 1: Add CSS for edit form components

**Files:**
- Modify: `admin.html` (inside the `<style>` block, after `.form-textarea { resize: vertical; min-height: 80px; }` at line ~662)

No test infrastructure exists — verify visually after Task 3.

- [ ] **Step 1: Add the CSS block**

Find this line in admin.html:
```css
        .form-textarea { resize: vertical; min-height: 80px; }
```

Insert the following immediately after it:

```css

        /* ===== EDIT FORM ===== */
        .edit-section {
            margin: 1.5rem 0 0.25rem;
            padding-top: 1.25rem;
            border-top: 2px solid var(--border);
        }
        .edit-section-label {
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--text-muted);
            margin-bottom: 1rem;
        }

        .edit-severity-picker {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }
        .edit-severity-option {
            flex: 1;
            min-width: 56px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.25rem;
            padding: 0.6rem 0.3rem;
            border: 2px solid var(--border);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.15s;
            text-align: center;
        }
        .edit-severity-option:hover { border-color: var(--primary-light); }
        .edit-severity-option.selected { border-color: var(--primary); background: rgba(63,81,181,0.08); }
        .edit-severity-option .sev-emoji { font-size: 1.4rem; line-height: 1; }
        .edit-severity-option .sev-label { font-size: 0.62rem; color: var(--text-muted); line-height: 1.2; }

        .edit-tag-group {
            display: flex;
            flex-wrap: wrap;
            gap: 0.4rem;
            margin-top: 0.4rem;
        }
        .edit-tag-option {
            padding: 0.35rem 0.75rem;
            border: 1.5px solid var(--border);
            border-radius: 20px;
            font-size: 0.82rem;
            cursor: pointer;
            transition: all 0.15s;
            user-select: none;
        }
        .edit-tag-option:hover { border-color: var(--primary-light); }
        .edit-tag-option.selected { background: var(--primary); color: white; border-color: var(--primary); }

        .edit-willingness-options {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            margin-top: 0.4rem;
        }
        .edit-willingness-option {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            border: 2px solid var(--border);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.15s;
        }
        .edit-willingness-option:hover { border-color: var(--primary-light); }
        .edit-willingness-option.selected { border-color: var(--primary); background: rgba(63,81,181,0.08); }
        .edit-willingness-option .w-icon { font-size: 1.4rem; flex-shrink: 0; }
        .edit-willingness-option .w-title { font-weight: 600; font-size: 0.88rem; }
        .edit-willingness-option .w-desc { font-size: 0.76rem; color: var(--text-muted); }

        .edit-danger-zone {
            margin-top: 1.5rem;
            padding: 1rem;
            border: 2px dashed #e53935;
            border-radius: 8px;
        }
        .edit-danger-label {
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            color: #e53935;
            margin-bottom: 0.75rem;
        }
```

- [ ] **Step 2: Commit**

```bash
git add admin.html
git commit -m "style: add CSS classes for super user edit form"
```

---

### Task 2: Add module-level variable and JS helper functions

**Files:**
- Modify: `admin.html`

Add `editingPhotos` near the other module-level `let` declarations (around line 1266, near `let allProblems = [];`).

Add five helper functions after `saveEditProblem` (which is around line 2154). They will be inserted before the `addNote` function.

- [ ] **Step 1: Add `editingPhotos` variable**

Find this line (around line 1266):
```javascript
    let allProblems = [];
```

Add the new variable on the line immediately after it:
```javascript
    let editingPhotos = [];
```

- [ ] **Step 2: Add helper functions**

Find this exact comment block (around line 2169):
```javascript
    async function addNote(problemId) {
```

Insert the following block immediately before it:

```javascript
    function initEditSelectors(problem) {
        if (problem.severity) {
            const el = document.querySelector(`#editSeverityPicker [data-severity="${problem.severity}"]`);
            if (el) el.classList.add('selected');
        }
        (problem.categories || []).forEach(val => {
            const el = document.querySelector(`#editCategoryTags [data-value="${val}"]`);
            if (el) el.classList.add('selected');
        });
        (problem.disciplines || []).forEach(val => {
            const el = document.querySelector(`#editDisciplineTags [data-value="${val}"]`);
            if (el) el.classList.add('selected');
        });
        if (problem.willingness) {
            const el = document.querySelector(`#editWillingnessOptions [data-value="${problem.willingness}"]`);
            if (el) el.classList.add('selected');
        }
        renderEditPhotos();
    }

    function renderEditPhotos() {
        const container = document.getElementById('editPhotoList');
        if (!container) return;
        if (editingPhotos.length === 0) {
            container.innerHTML = '<span style="font-size:0.85rem;color:var(--text-muted);">No photos</span>';
            return;
        }
        container.innerHTML = editingPhotos.map((url, i) => `
            <div style="position:relative;display:inline-block;">
                <img src="${url}" style="width:100px;height:70px;object-fit:cover;border-radius:6px;" alt="Photo">
                <button onclick="removeEditPhoto(${i})" style="position:absolute;top:-6px;right:-6px;background:#e53935;color:white;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:0.7rem;line-height:1;padding:0;">&#x2715;</button>
            </div>
        `).join('');
    }

    function removeEditPhoto(index) {
        editingPhotos.splice(index, 1);
        renderEditPhotos();
    }

    function selectEditSeverity(el) {
        document.querySelectorAll('#editSeverityPicker .edit-severity-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
    }

    function toggleEditTag(el) {
        el.classList.toggle('selected');
    }

    function selectEditWillingness(el) {
        document.querySelectorAll('#editWillingnessOptions .edit-willingness-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
    }

```

- [ ] **Step 3: Commit**

```bash
git add admin.html
git commit -m "feat: add editingPhotos state and edit form helper functions"
```

---

### Task 3: Rewrite `startEditProblem` with full form HTML

**Files:**
- Modify: `admin.html` — replace entire `startEditProblem` function body (lines ~2125–2152)

- [ ] **Step 1: Replace `startEditProblem`**

Find and replace this entire function:
```javascript
    function startEditProblem(id) {
        if (!isSuperUser) return;
        const problem = allProblems.find(p => p.id === id);
        if (!problem) return;

        const content = document.getElementById('actionModalContent');
        content.innerHTML = `
            <h2 style="margin-bottom:1rem;">&#x270f; Edit Problem</h2>
            <div style="display:flex;flex-direction:column;gap:1rem;">
                <div>
                    <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:0.25rem;">Title</label>
                    <input id="editTitle" type="text" class="form-input" value="${escapeHtml(problem.title || '')}">
                </div>
                <div>
                    <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:0.25rem;">Description</label>
                    <textarea id="editDescription" class="form-input" rows="4" style="resize:vertical;">${escapeHtml(problem.description || '')}</textarea>
                </div>
                <div>
                    <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:0.25rem;">Category</label>
                    <input id="editCategory" type="text" class="form-input" value="${escapeHtml(problem.category || '')}">
                </div>
                <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
                    <button class="btn btn-primary" onclick="saveEditProblem('${id}')">&#x2705; Save</button>
                    <button class="btn btn-outline" onclick="openProblemDetail('${id}')">Cancel</button>
                </div>
            </div>
        `;
    }
```

Replace with:

```javascript
    function startEditProblem(id) {
        if (!isSuperUser) return;
        const problem = allProblems.find(p => p.id === id);
        if (!problem) return;

        editingPhotos = [...(problem.photos || [])];

        const content = document.getElementById('actionModalContent');
        content.innerHTML = `
            <div class="modal-header">
                <div><h2>&#x270f; Edit Problem</h2></div>
                <button class="modal-close" onclick="openProblemDetail('${id}')">&#x2715;</button>
            </div>
            <div class="modal-body">

                <div class="edit-section-label">The Problem</div>

                <div class="form-group">
                    <label>Title <span style="color:#e53935">*</span></label>
                    <input type="text" class="form-input" id="editTitle" value="${escapeHtml(problem.title || '')}">
                </div>

                <div class="form-group">
                    <label>Description <span style="color:#e53935">*</span></label>
                    <textarea class="form-textarea" id="editDescription" rows="4">${escapeHtml(problem.description || '')}</textarea>
                </div>

                <div class="form-group">
                    <label>Who It Affects <span style="color:#e53935">*</span></label>
                    <input type="text" class="form-input" id="editAffects" value="${escapeHtml(problem.affects || '')}">
                </div>

                <div class="form-group">
                    <label>Photos</label>
                    <div class="helper">Click &#x2715; to remove a photo. Re-uploading is not available here.</div>
                    <div id="editPhotoList" style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.4rem;"></div>
                </div>

                <div class="edit-section">
                    <div class="edit-section-label">Details</div>
                </div>

                <div class="form-group">
                    <label>Severity</label>
                    <div class="edit-severity-picker" id="editSeverityPicker">
                        <div class="edit-severity-option" data-severity="1" onclick="selectEditSeverity(this)">
                            <span class="sev-emoji">&#x1f600;</span>
                            <span class="sev-label">Minor<br>annoyance</span>
                        </div>
                        <div class="edit-severity-option" data-severity="2" onclick="selectEditSeverity(this)">
                            <span class="sev-emoji">&#x1f615;</span>
                            <span class="sev-label">Somewhat<br>frustrating</span>
                        </div>
                        <div class="edit-severity-option" data-severity="3" onclick="selectEditSeverity(this)">
                            <span class="sev-emoji">&#x1f61f;</span>
                            <span class="sev-label">Quite<br>painful</span>
                        </div>
                        <div class="edit-severity-option" data-severity="4" onclick="selectEditSeverity(this)">
                            <span class="sev-emoji">&#x1f62b;</span>
                            <span class="sev-label">Very<br>serious</span>
                        </div>
                        <div class="edit-severity-option" data-severity="5" onclick="selectEditSeverity(this)">
                            <span class="sev-emoji">&#x1f631;</span>
                            <span class="sev-label">Critical /<br>urgent</span>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Where</label>
                    <input type="text" class="form-input" id="editWhere" value="${escapeHtml(problem.where || '')}">
                </div>

                <div class="form-group">
                    <label>Frequency</label>
                    <select class="form-select" id="editFrequency">
                        <option value="">Select frequency...</option>
                        <option value="daily" ${problem.frequency === 'daily' ? 'selected' : ''}>Daily</option>
                        <option value="weekly" ${problem.frequency === 'weekly' ? 'selected' : ''}>A few times a week</option>
                        <option value="monthly" ${problem.frequency === 'monthly' ? 'selected' : ''}>A few times a month</option>
                        <option value="occasionally" ${problem.frequency === 'occasionally' ? 'selected' : ''}>Occasionally</option>
                        <option value="seasonal" ${problem.frequency === 'seasonal' ? 'selected' : ''}>Seasonally</option>
                        <option value="once" ${problem.frequency === 'once' ? 'selected' : ''}>One-time event</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>How Long</label>
                    <input type="text" class="form-input" id="editDuration" value="${escapeHtml(problem.duration || '')}">
                </div>

                <div class="form-group">
                    <label>Current Workaround</label>
                    <textarea class="form-textarea" id="editWorkaround" rows="2">${escapeHtml(problem.workaround || '')}</textarea>
                </div>

                <div class="form-group">
                    <label>Prior Attempts</label>
                    <textarea class="form-textarea" id="editPriorAttempts" rows="2">${escapeHtml(problem.priorAttempts || '')}</textarea>
                </div>

                <div class="form-group">
                    <label>Constraints</label>
                    <textarea class="form-textarea" id="editConstraints" rows="2">${escapeHtml(problem.constraints || '')}</textarea>
                </div>

                <div class="form-group">
                    <label>Categories</label>
                    <div class="edit-tag-group" id="editCategoryTags">
                        <span class="edit-tag-option" data-value="workspace" onclick="toggleEditTag(this)">Workspace</span>
                        <span class="edit-tag-option" data-value="workflow" onclick="toggleEditTag(this)">Workflow</span>
                        <span class="edit-tag-option" data-value="communication" onclick="toggleEditTag(this)">Communication</span>
                        <span class="edit-tag-option" data-value="accessibility" onclick="toggleEditTag(this)">Accessibility</span>
                        <span class="edit-tag-option" data-value="sustainability" onclick="toggleEditTag(this)">Sustainability</span>
                        <span class="edit-tag-option" data-value="safety" onclick="toggleEditTag(this)">Safety</span>
                        <span class="edit-tag-option" data-value="technology" onclick="toggleEditTag(this)">Technology</span>
                        <span class="edit-tag-option" data-value="community" onclick="toggleEditTag(this)">Community</span>
                        <span class="edit-tag-option" data-value="other" onclick="toggleEditTag(this)">Other</span>
                    </div>
                </div>

                <div class="form-group">
                    <label>Design Disciplines</label>
                    <div class="edit-tag-group" id="editDisciplineTags">
                        <span class="edit-tag-option" data-value="product-design" onclick="toggleEditTag(this)">Product Design</span>
                        <span class="edit-tag-option" data-value="graphic-design" onclick="toggleEditTag(this)">Graphic Design</span>
                        <span class="edit-tag-option" data-value="ux-design" onclick="toggleEditTag(this)">UX / Digital</span>
                        <span class="edit-tag-option" data-value="spatial-design" onclick="toggleEditTag(this)">Spatial / Interior</span>
                        <span class="edit-tag-option" data-value="service-design" onclick="toggleEditTag(this)">Service Design</span>
                        <span class="edit-tag-option" data-value="not-sure" onclick="toggleEditTag(this)">Not sure!</span>
                    </div>
                </div>

                <div class="edit-section">
                    <div class="edit-section-label">Submitter Info</div>
                </div>

                <div class="form-group">
                    <label>Submitter Name</label>
                    <input type="text" class="form-input" id="editSubmitterName" value="${escapeHtml(problem.submitterName || '')}">
                </div>

                <div class="form-group">
                    <label>Submitter Role</label>
                    <input type="text" class="form-input" id="editSubmitterRole" value="${escapeHtml(problem.submitterRole || '')}">
                </div>

                <div class="form-group">
                    <label>Contact</label>
                    <input type="text" class="form-input" id="editSubmitterContact" value="${escapeHtml(problem.submitterContact || '')}">
                </div>

                <div class="form-group">
                    <label>Willingness to engage</label>
                    <div class="edit-willingness-options" id="editWillingnessOptions">
                        <div class="edit-willingness-option" data-value="full" onclick="selectEditWillingness(this)">
                            <span class="w-icon">&#x1f91d;</span>
                            <div>
                                <div class="w-title">All in!</div>
                                <div class="w-desc">Interviews, prototypes, site visits</div>
                            </div>
                        </div>
                        <div class="edit-willingness-option" data-value="some" onclick="selectEditWillingness(this)">
                            <span class="w-icon">&#x1f4ac;</span>
                            <div>
                                <div class="w-title">Available for questions</div>
                                <div class="w-desc">Short interview or a few emails</div>
                            </div>
                        </div>
                        <div class="edit-willingness-option" data-value="minimal" onclick="selectEditWillingness(this)">
                            <span class="w-icon">&#x1f4e7;</span>
                            <div>
                                <div class="w-title">Email only</div>
                                <div class="w-desc">Prefer to answer a few questions by email</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Resources Offered</label>
                    <textarea class="form-textarea" id="editResources" rows="2">${escapeHtml(problem.resources || '')}</textarea>
                </div>

                <div class="edit-danger-zone">
                    <div class="edit-danger-label">&#x26a0; Danger Zone</div>
                    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                        ${problem.claimedByTeam ? `<button class="btn btn-outline btn-sm" onclick="unclaimProblem('${id}')">&#x274c; Unclaim from ${escapeHtml(problem.claimedByTeam)}</button>` : ''}
                        <button class="btn btn-sm" style="background:#c62828;color:#fff;border:none;" onclick="deleteProblem('${id}')">&#x1f5d1; Delete Problem</button>
                    </div>
                </div>

                <div style="display:flex;gap:0.5rem;margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border);">
                    <button class="btn btn-primary" onclick="saveEditProblem('${id}')">&#x2705; Save Changes</button>
                    <button class="btn btn-outline" onclick="openProblemDetail('${id}')">Cancel</button>
                </div>

            </div>
        `;

        initEditSelectors(problem);
    }
```

- [ ] **Step 2: Commit**

```bash
git add admin.html
git commit -m "feat: rewrite startEditProblem with full scrollable edit form"
```

---

### Task 4: Rewrite `saveEditProblem` and fix `deleteProblem` modal close

**Files:**
- Modify: `admin.html` — replace `saveEditProblem` body (~line 2154) and fix one line in `deleteProblem` (~line 2120)

- [ ] **Step 1: Replace `saveEditProblem`**

Find and replace this entire function:
```javascript
    async function saveEditProblem(id) {
        if (!isSuperUser) return;
        const problem = allProblems.find(p => p.id === id);
        if (!problem) return;

        problem.title = document.getElementById('editTitle').value.trim();
        problem.description = document.getElementById('editDescription').value.trim();
        problem.category = document.getElementById('editCategory').value.trim();

        await saveProblem(problem);
        renderDashboard();
        openProblemDetail(id);
        showToast('Problem updated');
    }
```

Replace with:

```javascript
    async function saveEditProblem(id) {
        if (!isSuperUser) return;
        const problem = allProblems.find(p => p.id === id);
        if (!problem) return;

        const title = document.getElementById('editTitle').value.trim();
        const description = document.getElementById('editDescription').value.trim();
        const affects = document.getElementById('editAffects').value.trim();
        if (!title || !description || !affects) {
            showToast('Title, description, and who it affects are required');
            return;
        }

        const sevEl = document.querySelector('#editSeverityPicker .edit-severity-option.selected');
        const willingnessEl = document.querySelector('#editWillingnessOptions .edit-willingness-option.selected');

        problem.title = title;
        problem.description = description;
        problem.affects = affects;
        problem.photos = [...editingPhotos];
        problem.severity = sevEl ? parseInt(sevEl.dataset.severity) : (problem.severity || null);
        problem.where = document.getElementById('editWhere').value.trim();
        problem.frequency = document.getElementById('editFrequency').value;
        problem.duration = document.getElementById('editDuration').value.trim();
        problem.workaround = document.getElementById('editWorkaround').value.trim();
        problem.priorAttempts = document.getElementById('editPriorAttempts').value.trim();
        problem.constraints = document.getElementById('editConstraints').value.trim();
        problem.categories = [...document.querySelectorAll('#editCategoryTags .edit-tag-option.selected')].map(el => el.dataset.value);
        problem.disciplines = [...document.querySelectorAll('#editDisciplineTags .edit-tag-option.selected')].map(el => el.dataset.value);
        problem.submitterName = document.getElementById('editSubmitterName').value.trim();
        problem.submitterRole = document.getElementById('editSubmitterRole').value.trim();
        problem.submitterContact = document.getElementById('editSubmitterContact').value.trim();
        problem.willingness = willingnessEl ? willingnessEl.dataset.value : (problem.willingness || null);
        problem.resources = document.getElementById('editResources').value.trim();

        await saveProblem(problem);
        renderDashboard();
        openProblemDetail(id);
        showToast('Problem updated');
    }
```

- [ ] **Step 2: Fix `deleteProblem` modal close call**

Find this line inside `deleteProblem`:
```javascript
        document.getElementById('actionModal').style.display = 'none';
```

Replace with:
```javascript
        closeActionModal();
```

- [ ] **Step 3: Commit**

```bash
git add admin.html
git commit -m "feat: save all fields in saveEditProblem, fix deleteProblem modal close"
```

- [ ] **Step 4: Verify manually**

Open `admin.html` in a browser (or the live site after pushing). Sign in as a super user and open any problem. Confirm:
1. Super user controls box has proper padding/breathing room
2. Clicking Edit opens a full scrollable form with all fields pre-populated
3. The severity picker, category chips, discipline chips, and willingness cards show the current values as selected
4. Existing photos appear with remove buttons; removing a photo and saving works
5. Changing any field and clicking Save Changes updates the problem in the detail view
6. Cancel returns to the detail view without saving
7. Danger Zone shows Delete (always) and Unclaim (only if claimed)
8. Delete closes the modal after confirming
