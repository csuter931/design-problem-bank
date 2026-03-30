# Super User Edit Form — Design Spec

Date: 2026-03-30
File affected: `admin.html`

## Problem

Three issues with the current super user experience in `admin.html`:

1. **Tight layout**: Clicking Edit calls `startEditProblem()`, which replaces `#actionModalContent` innerHTML with raw HTML that has no `modal-header`/`modal-body` wrappers — content is flush against the modal edges with no padding.
2. **Incomplete edit**: `saveEditProblem()` only saves title, description, and category. All other fields (severity, affects, where, frequency, duration, workaround, priorAttempts, constraints, categories, disciplines, submitter info) are uneditable.
3. **Delete/Unclaim unreachable from edit view**: Once in edit mode, there is no way to delete or unclaim without cancelling back to the detail view.

## Solution

Replace `startEditProblem()` and `saveEditProblem()` with a full single-scrollable-form implementation that uses proper modal structure, covers all fields, and includes Danger Zone actions.

## Form Structure

### Modal Header (uses `.modal-header` class)
- Title: "Edit Problem"
- Close button (`modal-close`)

### Modal Body (uses `.modal-body` class — scrollable, properly padded)

Organized into labeled sections using a new `.edit-section` divider style.

**Section 1 — The Problem**
- Title (text input, required)
- Description (textarea, required)
- Who it affects (text input, required)
- Existing photos: thumbnails with an X button to remove each (no new upload — Cloudinary upload is out of scope for edit)

**Section 2 — Details**
- Severity (emoji picker: 5 options, matches wizard visually)
- Where (text input, optional)
- Frequency (select dropdown, same options as wizard)
- Duration (text input, optional)
- Workaround (textarea, optional)
- Prior attempts (textarea, optional)
- Constraints (textarea, optional)
- Categories (tag chip multi-select, same values as wizard)
- Disciplines (tag chip multi-select, same values as wizard)

**Section 3 — Submitter Info**
- Submitter name (text input)
- Submitter role (text input, optional)
- Submitter contact (text input)
- Willingness (3-option picker matching wizard style)
- Resources (textarea, optional)

**Danger Zone** (red-bordered box, bottom of form)
- Unclaim button — shown only if `problem.claimedByTeam` is set; calls existing `unclaimProblem()` and closes edit form
- Delete button — calls existing `deleteProblem()`

### Sticky-style footer (bottom of modal body, not fixed)
- "Save Changes" (btn-primary)
- "Cancel" (btn-outline, returns to detail view via `openProblemDetail(id)`)

## CSS Additions (added to `admin.html` `<style>` block)

Use `edit-` prefix throughout to avoid collision with existing classes.

- `.edit-section` — horizontal rule + uppercase label, matches the section divider aesthetic of the wizard
- `.edit-severity-picker` / `.edit-severity-option` — row of 5 emoji buttons, `.selected` state adds highlight border
- `.edit-tag-group` / `.edit-tag-option` — chip-style multi-select; `.selected` state fills background
- `.edit-willingness-options` / `.edit-willingness-option` — card-style 3-option row; `.selected` state adds border highlight
- `.edit-danger-zone` — red dashed border box at bottom

## JS Changes

### `startEditProblem(id)`
Replace current minimal 3-field template with:
1. Build full form HTML with all fields, pre-populated from `problem` object
2. Set `modal-header` + `modal-body` wrapper structure
3. After setting innerHTML, call `initEditSelectors(problem)` to wire up interactive selectors

### `initEditSelectors(problem)`
New function. Runs after innerHTML is set:
- Marks the correct severity option as `.selected` based on `problem.severity`
- Marks correct category chips as `.selected` based on `problem.categories`
- Marks correct discipline chips as `.selected` based on `problem.disciplines`
- Marks correct willingness option as `.selected` based on `problem.willingness`

### `toggleEditTag(el)`
New helper. Toggles `.selected` on a chip when clicked. Used by category and discipline pickers.

### `selectEditSeverity(el)`
New helper. Removes `.selected` from siblings, adds to clicked option.

### `selectEditWillingness(el)`
New helper. Same pattern as severity.

### `saveEditProblem(id)`
Replace current 3-field read with reads for all fields:
- title, description, affects from text inputs/textareas
- photos from `editingPhotos` array (module-level variable tracking removed photos)
- severity from `.edit-severity-option.selected` data attribute
- where, duration from text inputs
- frequency from select
- workaround, priorAttempts, constraints from textareas
- categories from `.edit-tag-option.selected[data-group="category"]`
- disciplines from `.edit-tag-option.selected[data-group="discipline"]`
- submitterName, submitterRole, submitterContact from text inputs
- willingness from `.edit-willingness-option.selected` data attribute
- resources from textarea

After saving, call `openProblemDetail(id)` to return to the detail view.

### `editingPhotos` variable
Module-level array initialized by `startEditProblem` to the current `problem.photos` list. Removing a photo thumbnail splices from this array. `saveEditProblem` writes this array to `problem.photos`.

## What is NOT changing
- `deleteProblem()` — unchanged, called directly from Danger Zone
- `unclaimProblem()` — unchanged, called directly from Danger Zone
- The detail view (`openProblemDetail`) — unchanged
- The super user controls section in the detail view — unchanged (still shows Edit/Unclaim/Delete buttons there too)
- `admin.html` layout outside the modal — unchanged
