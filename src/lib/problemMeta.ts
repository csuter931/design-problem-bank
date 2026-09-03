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
