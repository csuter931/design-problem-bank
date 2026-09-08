// Shared display metadata for problems. Single source of truth — App, ProblemDetail,
// StudentDashboard, SubmitWizard, and EditProblemModal all render from these lists.

export const STATUS_LABELS: Record<string, string> = {
  new: 'NEW', claimed: 'CLAIMED', inprogress: 'IN PROGRESS', solved: 'SOLVED',
}

export const STATUS_COLORS: Record<string, string> = {
  new:        'bg-dawson-seagreen/20 text-dawson-seagreen border-dawson-seagreen/30',
  claimed:    'bg-dawson-orange/20 text-dawson-orange border-dawson-orange/30',
  inprogress: 'bg-dawson-carolina/20 text-dawson-carolina border-dawson-carolina/30',
  solved:     'bg-dawson-purple/60 text-purple-200 border-dawson-purple',
}

// Solid dot colour per status, for the gallery filter pills and the dashboard
// tabs. These were previously the emoji circles for green/yellow/blue/purple,
// whose hues are not in the Dawson palette — a yellow dot sat directly beside
// an Atomic Orange CLAIMED badge meaning the same thing. Solved uses
// purple-300 rather than dawson-purple (#4D1551), which is far too dark to
// read as a small dot on navy; that matches how the gallery header already
// renders its Solved stat.
export const STATUS_DOT: Record<string, string> = {
  new:        'bg-dawson-seagreen',
  claimed:    'bg-dawson-orange',
  inprogress: 'bg-dawson-carolina',
  solved:     'bg-purple-300',
}

export const SEVERITY_EMOJI = ['', '😀', '😕', '😟', '😫', '😱']
export const SEVERITY_LABEL = ['', 'Minor', 'Moderate', 'Painful', 'Serious', 'Critical']

// Canonical tag vocabulary. `value` is what gets stored in Firestore; `label` is
// what the UI shows. Problems may still carry legacy values from older taxonomies —
// editors must render those from the problem itself so they stay visible/removable.
export interface TagOption { value: string; label: string }

export const CATEGORY_OPTIONS: TagOption[] = [
  { value: 'workspace',      label: 'Workspace' },
  { value: 'workflow',       label: 'Workflow' },
  { value: 'communication',  label: 'Communication' },
  { value: 'accessibility',  label: 'Accessibility' },
  { value: 'sustainability', label: 'Sustainability' },
  { value: 'safety',         label: 'Safety' },
  { value: 'technology',     label: 'Technology' },
  { value: 'community',      label: 'Community' },
  { value: 'other',          label: 'Other' },
]

export const DISCIPLINE_OPTIONS: TagOption[] = [
  { value: 'product-design',   label: 'Product Design' },
  { value: 'graphic-design',   label: 'Graphic Design' },
  { value: 'ux-digital',       label: 'UX / Digital' },
  { value: 'spatial-interior', label: 'Spatial / Interior' },
  { value: 'service-design',   label: 'Service Design' },
  { value: 'not-sure!',        label: 'Not sure!' },
]
