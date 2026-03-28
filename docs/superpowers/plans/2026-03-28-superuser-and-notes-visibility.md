# Super User Role + Notes Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a super user role for teachers (stored in Firestore config) and restrict team notes visibility/editing based on claiming team membership and problem status.

**Architecture:** `isSuperUser` boolean flag set at sign-in by reading `config/superusers` from Firestore. Notes section in problem modal conditionally rendered based on team membership and superuser status. Super user controls (edit, delete, unclaim) rendered inline in existing modal.

**Tech Stack:** Plain HTML/JS, Firebase Firestore compat SDK v10.12.0, no build step.

---

### Task 1: Create Firestore config document and update security rules

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Create the `config/superusers` document in Firebase console**

  Go to console.firebase.google.com → dawson-problem-bank-24a9c → Firestore Database → Start collection.
  - Collection ID: `config`
  - Document ID: `superusers`
  - Field: `emails` (type: array)
  - Value: add your email `csupiro@dawsonschool.org`

- [ ] **Step 2: Update `firestore.rules` to allow authenticated users to read config**

  Replace the full contents of `firestore.rules` with:

  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {

      // Config: authenticated users can read (for superuser check), no client writes
      match /config/{document} {
        allow read: if request.auth != null;
        allow write: if false;
      }

      // Problems: fully public read/create/update, only authenticated can delete
      match /problems/{problemId} {
        allow read, create, update: if true;
        allow delete: if request.auth != null;
      }

      // Teams: authenticated users can only read/write their own document
      match /teams/{userId} {
        allow read, write, delete: if request.auth != null && request.auth.uid == userId;
      }

    }
  }
  ```

- [ ] **Step 3: Deploy updated rules**

  Run: `cd "C:/Users/csuter/Google Drive/projects/Problem Bank Web Page" && firebase deploy --only firestore:rules`

  Expected output: `+ firestore: released rules firestore.rules to cloud.firestore`

- [ ] **Step 4: Commit**

  ```bash
  cd "C:/Users/csuter/Google Drive/projects/Problem Bank Web Page"
  git add firestore.rules
  git commit -m "feat: add config collection rules for superuser support"
  ```

---

### Task 2: Add `isSuperUser` flag and load it on sign-in

**Files:**
- Modify: `admin.html` (lines 1163–1167 for variable declaration, lines 1326–1344 for `onSignedIn`)

- [ ] **Step 1: Declare `isSuperUser` variable near other state variables (line 1166)**

  Find this block (lines 1163–1166):
  ```javascript
  let auth = null;
  let useFirebase = false;
  let currentUser = null;
  let currentTeam = null;
  ```

  Replace with:
  ```javascript
  let auth = null;
  let useFirebase = false;
  let currentUser = null;
  let currentTeam = null;
  let isSuperUser = false;
  ```

- [ ] **Step 2: Load superuser status in `onSignedIn()` (lines 1326–1344)**

  Find the full `onSignedIn` function:
  ```javascript
  function onSignedIn() {
      // Check if this user already belongs to a team
      if (useFirebase) {
          db.collection('teams').doc(currentUser.uid).get().then(doc => {
              if (doc.exists) {
                  currentTeam = doc.data();
              } else {
                  currentTeam = null;
              }
              showDashboard();
          }).catch(() => {
              currentTeam = getLocalTeam() || null;
              showDashboard();
          });
      } else {
          currentTeam = getLocalTeam() || null;
          showDashboard();
      }
  }
  ```

  Replace with:
  ```javascript
  function onSignedIn() {
      if (useFirebase) {
          const teamPromise = db.collection('teams').doc(currentUser.uid).get()
              .then(doc => { currentTeam = doc.exists ? doc.data() : null; })
              .catch(() => { currentTeam = getLocalTeam() || null; });

          const superuserPromise = db.collection('config').doc('superusers').get()
              .then(doc => {
                  const emails = (doc.exists && doc.data().emails) ? doc.data().emails : [];
                  isSuperUser = emails.includes(currentUser.email);
              })
              .catch(() => { isSuperUser = false; });

          Promise.all([teamPromise, superuserPromise]).then(() => showDashboard());
      } else {
          currentTeam = getLocalTeam() || null;
          isSuperUser = false;
          showDashboard();
      }
  }
  ```

- [ ] **Step 3: Verify in browser**

  Sign in with `csupiro@dawsonschool.org`. Open browser DevTools console and run:
  ```javascript
  console.log(isSuperUser)
  ```
  Expected: `true`

  Sign in with a non-superuser account. Expected: `false`

- [ ] **Step 4: Commit**

  ```bash
  cd "C:/Users/csuter/Google Drive/projects/Problem Bank Web Page"
  git add admin.html
  git commit -m "feat: load isSuperUser flag from Firestore config on sign-in"
  ```

---

### Task 3: Restrict notes visibility in the problem modal

**Files:**
- Modify: `admin.html` (lines 2058–2077, the notes section inside `openProblemDetail`)

- [ ] **Step 1: Replace the notes section with a conditional version**

  Find this block (lines 2058–2077):
  ```javascript
                  <!-- Internal Notes (class only) -->
                  <div class="notes-section">
                      <h4>&#x1f4dd; Team Notes <span style="font-weight:400;font-size:0.78rem;color:var(--text-muted);">(only visible to the class)</span></h4>
                      <div id="notesList_${problem.id}">
                          ${(problem.internalNotes || []).map(n => `
                              <div class="note">
                                  <div class="note-body">
                                      <span class="note-author">${escapeHtml(n.author)}</span>
                                      <span class="note-time">${timeAgo(n.createdAt)}</span>
                                      <div class="note-text">${escapeHtml(n.text)}</div>
                                  </div>
                              </div>
                          `).join('')}
                          ${(problem.internalNotes || []).length === 0 ? '<p style="font-size:0.85rem;color:var(--text-muted);">No notes yet.</p>' : ''}
                      </div>
                      <div class="note-input-area">
                          <input type="text" id="noteInput_${problem.id}" placeholder="Add a team note..." onkeydown="if(event.key==='Enter') addNote('${problem.id}')">
                          <button class="btn btn-primary btn-sm" onclick="addNote('${problem.id}')">Add</button>
                      </div>
                  </div>
  ```

  Replace with:
  ```javascript
                  <!-- Internal Notes: visible only to claiming team and super users -->
                  ${(isSuperUser || currentTeam?.name === problem.claimedByTeam) ? `
                  <div class="notes-section">
                      <h4>&#x1f4dd; Team Notes <span style="font-weight:400;font-size:0.78rem;color:var(--text-muted);">(only visible to the claiming team)</span></h4>
                      <div id="notesList_${problem.id}">
                          ${(problem.internalNotes || []).map(n => `
                              <div class="note">
                                  <div class="note-body">
                                      <span class="note-author">${escapeHtml(n.author)}</span>
                                      <span class="note-time">${timeAgo(n.createdAt)}</span>
                                      <div class="note-text">${escapeHtml(n.text)}</div>
                                  </div>
                              </div>
                          `).join('')}
                          ${(problem.internalNotes || []).length === 0 ? '<p style="font-size:0.85rem;color:var(--text-muted);">No notes yet.</p>' : ''}
                      </div>
                      ${(isSuperUser || problem.status !== 'solved') ? `
                      <div class="note-input-area">
                          <input type="text" id="noteInput_${problem.id}" placeholder="Add a team note..." onkeydown="if(event.key==='Enter') addNote('${problem.id}')">
                          <button class="btn btn-primary btn-sm" onclick="addNote('${problem.id}')">Add</button>
                      </div>
                      ` : '<p style="font-size:0.8rem;color:var(--text-muted);margin-top:0.5rem;">Notes are locked after a problem is solved.</p>'}
                  </div>
                  ` : ''}
  ```

- [ ] **Step 2: Verify in browser**

  - Sign in as superuser → open any problem modal → notes section should always appear
  - Sign in as a team member → open a problem claimed by your team → notes should appear
  - Sign in as a team member → open a problem claimed by a different team → notes section should be completely absent
  - Open a solved problem as a team member → notes visible but input locked with message
  - Open a solved problem as superuser → notes visible AND input available

- [ ] **Step 3: Commit**

  ```bash
  cd "C:/Users/csuter/Google Drive/projects/Problem Bank Web Page"
  git add admin.html
  git commit -m "feat: restrict notes visibility to claiming team and super users"
  ```

---

### Task 4: Add super user controls to the problem modal

**Files:**
- Modify: `admin.html` (inside `openProblemDetail`, and new functions `deleteProblem`, `editProblem`)

- [ ] **Step 1: Add super user action buttons in the modal**

  In `openProblemDetail`, find the closing `</div>` of the modal content (just before the notes section conditional added in Task 3). Add a super user controls section before the notes section:

  Find this line (which now starts the notes block):
  ```javascript
                  <!-- Internal Notes: visible only to claiming team and super users -->
  ```

  Insert before it:
  ```javascript
                  <!-- Super user controls -->
                  ${isSuperUser ? `
                  <div style="margin:1rem 0;padding:1rem;background:var(--surface);border:2px dashed var(--warning);border-radius:8px;">
                      <div style="font-size:0.75rem;font-weight:600;color:var(--warning);margin-bottom:0.75rem;">&#x1f6e1; SUPER USER CONTROLS</div>
                      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                          <button class="btn btn-outline btn-sm" onclick="startEditProblem('${problem.id}')">&#x270f; Edit</button>
                          ${problem.claimedByTeam ? `<button class="btn btn-outline btn-sm" onclick="unclaimProblem('${problem.id}')">&#x274c; Unclaim</button>` : ''}
                          <button class="btn btn-sm" style="background:#c62828;color:#fff;border:none;" onclick="deleteProblem('${problem.id}')">&#x1f5d1; Delete</button>
                      </div>
                  </div>
                  ` : ''}
  ```

- [ ] **Step 2: Add `deleteProblem()` function**

  Find the `addNote()` function (line 2093) and add this new function immediately before it:

  ```javascript
  async function deleteProblem(id) {
      if (!isSuperUser) return;
      if (!confirm('Permanently delete this problem? This cannot be undone.')) return;

      if (useFirebase) {
          await db.collection('problems').doc(id).delete();
      }
      allProblems = allProblems.filter(p => p.id !== id);
      document.getElementById('actionModal').style.display = 'none';
      renderDashboard();
      showToast('Problem deleted');
  }
  ```

- [ ] **Step 3: Add `startEditProblem()` and `saveEditProblem()` functions**

  Add these two functions immediately after `deleteProblem()`:

  ```javascript
  function startEditProblem(id) {
      if (!isSuperUser) return;
      const problem = allProblems.find(p => p.id === id);
      if (!problem) return;

      const content = document.getElementById('actionModalContent');
      // Replace modal content with edit form
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

- [ ] **Step 4: Verify in browser**

  Sign in as superuser and open any problem modal:
  - A dashed yellow "SUPER USER CONTROLS" box should appear
  - Clicking **Edit** should replace the modal with an edit form; saving should update the problem and return to modal
  - Clicking **Delete** should ask for confirmation, then remove the problem and close the modal
  - For a claimed problem, **Unclaim** button should appear; clicking it should reset the problem to available

  Sign in as a non-superuser:
  - No super user controls box should appear

- [ ] **Step 5: Commit**

  ```bash
  cd "C:/Users/csuter/Google Drive/projects/Problem Bank Web Page"
  git add admin.html
  git commit -m "feat: add super user controls (edit, delete, unclaim) to problem modal"
  ```

---

### Task 5: Push and update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`
- Push to GitHub

- [ ] **Step 1: Update CLAUDE.md to document the super user system**

  In `CLAUDE.md`, find the `## Firestore Data Structure` section and add a new section after it:

  ```markdown
  ## Super User Role
  - Super users are defined by email in Firestore at `config/superusers { emails: [] }`
  - The `isSuperUser` flag is set in `admin.html` during `onSignedIn()` by reading this document
  - Super users can: see all teams' notes, add notes even on solved problems, edit/delete/unclaim any problem
  - To add a new super user: edit the `config/superusers` document in the Firebase console
  - Regular team members: can only see/add notes on problems their team claimed, locked after solved
  ```

- [ ] **Step 2: Push all commits to GitHub**

  ```bash
  cd "C:/Users/csuter/Google Drive/projects/Problem Bank Web Page"
  git add CLAUDE.md
  git commit -m "docs: document super user role in CLAUDE.md"
  git push
  ```

  Expected: all 4 new commits pushed to `main`, GitHub Pages auto-deploys within 30 seconds.
