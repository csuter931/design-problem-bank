import { useState, useRef } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const CLOUDINARY_CLOUD = 'dexhdf03b'
const CLOUDINARY_PRESET = 'problem-bank'

const CATEGORIES = ['Workspace', 'Workflow', 'Communication', 'Accessibility', 'Sustainability', 'Safety', 'Technology', 'Community', 'Other']
const DISCIPLINES = ['Product Design', 'Graphic Design', 'UX / Digital', 'Spatial / Interior', 'Service Design', 'Not sure!']
const SEVERITY = [
  { val: 1, emoji: '😀', label: 'Minor annoyance' },
  { val: 2, emoji: '😕', label: 'Somewhat frustrating' },
  { val: 3, emoji: '😟', label: 'Quite painful' },
  { val: 4, emoji: '😫', label: 'Very serious' },
  { val: 5, emoji: '😱', label: 'Critical / urgent' },
]
const WILLINGNESS = [
  { val: 'full',    icon: '🤝', title: 'All in!',               desc: 'Happy to do interviews, review prototypes, provide access' },
  { val: 'some',    icon: '💬', title: 'Available for questions', desc: 'Can answer emails or do a short interview' },
  { val: 'minimal', icon: '📧', title: 'Email only',             desc: 'Prefer to just answer a few questions by email' },
]

interface WizardProps { onClose: () => void }

export function SubmitWizard({ onClose }: WizardProps) {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [affects, setAffects] = useState('')
  const [severity, setSeverity] = useState(0)
  const [where, setWhere] = useState('')
  const [frequency, setFrequency] = useState('')
  const [duration, setDuration] = useState('')
  const [workaround, setWorkaround] = useState('')
  const [priorAttempts, setPriorAttempts] = useState('')
  const [constraints, setConstraints] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [disciplines, setDisciplines] = useState<string[]>([])
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [contact, setContact] = useState('')
  const [willingness, setWillingness] = useState('')
  const [resources, setResources] = useState('')

  // Errors
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  function addPhotos(files: FileList | null) {
    if (!files) return
    const arr = Array.from(files).slice(0, 5 - photoFiles.length)
    setPhotoFiles(prev => [...prev, ...arr])
    arr.forEach(f => {
      const reader = new FileReader()
      reader.onload = e => setPhotoPreviews(prev => [...prev, e.target?.result as string])
      reader.readAsDataURL(f)
    })
  }

  function removePhoto(i: number) {
    setPhotoFiles(prev => prev.filter((_, idx) => idx !== i))
    setPhotoPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  function toggleTag(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  function validateStep() {
    const e: Record<string, boolean> = {}
    if (step === 1) {
      if (!title.trim()) e.title = true
      if (!description.trim()) e.description = true
      if (!affects.trim()) e.affects = true
    }
    if (step === 3) {
      if (!name.trim()) e.name = true
      if (!contact.trim()) e.contact = true
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (!validateStep()) return
    setStep(s => s + 1)
  }

  async function submit() {
    if (!validateStep()) return
    setSubmitting(true)
    try {
      // Upload photos to Cloudinary
      const photoUrls: string[] = []
      for (const file of photoFiles) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('upload_preset', CLOUDINARY_PRESET)
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: fd })
        const data = await res.json()
        if (data.secure_url) photoUrls.push(data.secure_url)
      }

      await addDoc(collection(db, 'problems'), {
        title: title.trim(),
        description: description.trim(),
        affects: affects.trim(),
        severity,
        where: where.trim(),
        frequency,
        duration: duration.trim(),
        workaround: workaround.trim(),
        priorAttempts: priorAttempts.trim(),
        constraints: constraints.trim(),
        categories,
        disciplines,
        submitterName: name.trim(),
        submitterRole: role.trim(),
        submitterContact: contact.trim(),
        willingness,
        resources: resources.trim(),
        photos: photoUrls,
        status: 'new',
        upvotes: 0,
        comments: [],
        createdAt: Date.now(),
      })
      setDone(true)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = (err?: boolean) =>
    `w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border ${err ? 'border-red-400' : 'border-white/[0.12]'} text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-primary focus:bg-white/[0.09] transition-colors`
  const labelCls = 'block text-sm font-medium text-white/80 mb-1'
  const helperCls = 'text-xs text-white/35 mb-2'

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pt-20" onClick={e => e.target === e.currentTarget && onClose()}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-[#131926] border border-white/[0.1] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {done ? (
          /* Success */
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-8 text-center">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>Problem Submitted!</h2>
            <p className="text-white/55 text-sm leading-relaxed">Thank you for contributing to our design problem bank. A student team may reach out to learn more.</p>
            <button onClick={onClose} className="mt-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
              Back to Gallery
            </button>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="flex items-center gap-2 px-6 pt-5 pb-4 border-b border-white/[0.08]">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                    s < step ? 'bg-primary border-primary text-white' :
                    s === step ? 'border-primary text-primary bg-primary/10' :
                    'border-white/20 text-white/30'
                  }`}>{s < step ? '✓' : s}</div>
                  <span className={`text-xs hidden sm:block ${s === step ? 'text-white/70' : 'text-white/25'}`}>
                    {s === 1 ? 'Describe' : s === 2 ? 'Details' : 'About You'}
                  </span>
                  {s < 3 && <div className={`flex-1 h-px ${s < step ? 'bg-primary' : 'bg-white/10'}`} />}
                </div>
              ))}
              <button onClick={onClose} className="ml-2 text-white/30 hover:text-white/70 text-lg transition-colors">✕</button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

              {step === 1 && (
                <>
                  <div>
                    <h2 className="text-lg font-bold text-white mb-0.5" style={{ fontFamily: 'Manrope, sans-serif' }}>Describe the Problem</h2>
                    <p className="text-white/40 text-xs">Tell us about a real-world problem you've encountered.</p>
                  </div>
                  <div>
                    <label className={labelCls}>Problem Title <span className="text-red-400">*</span></label>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder='e.g., "Cafeteria lunch line is too slow"' maxLength={100} className={inputCls(errors.title)} />
                    {errors.title && <p className="text-red-400 text-xs mt-1">Please enter a title</p>}
                  </div>
                  <div>
                    <label className={labelCls}>What's the problem? <span className="text-red-400">*</span></label>
                    <p className={helperCls}>What happens? Why is it frustrating?</p>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Describe the problem you've observed..." className={`${inputCls(errors.description)} resize-none`} />
                    {errors.description && <p className="text-red-400 text-xs mt-1">Please describe the problem</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Who does this affect? <span className="text-red-400">*</span></label>
                    <input value={affects} onChange={e => setAffects(e.target.value)} placeholder='e.g., "All students and staff"' className={inputCls(errors.affects)} />
                    {errors.affects && <p className="text-red-400 text-xs mt-1">Please describe who is affected</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Photos <span className="text-white/30 font-normal">(optional)</span></label>
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="border border-dashed border-white/20 rounded-xl p-6 text-center cursor-pointer hover:border-white/40 hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="text-2xl mb-1">📷</div>
                      <p className="text-white/40 text-xs">Click to upload photos</p>
                      <p className="text-white/25 text-xs">JPG, PNG · Up to 5MB each</p>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => addPhotos(e.target.files)} />
                    {photoPreviews.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {photoPreviews.map((src, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden">
                            <img src={src} className="w-full h-full object-cover" />
                            <button onClick={() => removePhoto(i)} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 rounded-full text-white text-[10px] flex items-center justify-center">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <h2 className="text-lg font-bold text-white mb-0.5" style={{ fontFamily: 'Manrope, sans-serif' }}>Add Some Details</h2>
                    <p className="text-white/40 text-xs">Everything here is optional — fill in what you can.</p>
                  </div>
                  <div>
                    <label className={labelCls}>How severe is this problem?</label>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {SEVERITY.map(s => (
                        <button
                          key={s.val}
                          onClick={() => setSeverity(s.val)}
                          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-xs transition-all ${
                            severity === s.val ? 'border-primary bg-primary/10 text-white' : 'border-white/10 bg-white/[0.04] text-white/50 hover:border-white/25'
                          }`}
                        >
                          <span className="text-xl">{s.emoji}</span>
                          <span className="text-center leading-tight w-16">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Where does this happen?</label>
                      <input value={where} onChange={e => setWhere(e.target.value)} placeholder='e.g., "Main cafeteria"' className={inputCls()} />
                    </div>
                    <div>
                      <label className={labelCls}>How often?</label>
                      <select value={frequency} onChange={e => setFrequency(e.target.value)} className={`${inputCls()} bg-[#131926]`}>
                        <option value="">Select…</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">A few times a week</option>
                        <option value="monthly">A few times a month</option>
                        <option value="occasionally">Occasionally</option>
                        <option value="seasonal">Seasonally</option>
                        <option value="once">One-time event</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>How long has this been a problem?</label>
                    <input value={duration} onChange={e => setDuration(e.target.value)} placeholder='e.g., "Since the building opened"' className={inputCls()} />
                  </div>
                  <div>
                    <label className={labelCls}>Current workaround</label>
                    <textarea value={workaround} onChange={e => setWorkaround(e.target.value)} rows={2} placeholder="How do people deal with this right now?" className={`${inputCls()} resize-none`} />
                  </div>
                  <div>
                    <label className={labelCls}>Has anyone tried to solve this before?</label>
                    <textarea value={priorAttempts} onChange={e => setPriorAttempts(e.target.value)} rows={2} placeholder="Any past solutions that didn't stick…" className={`${inputCls()} resize-none`} />
                  </div>
                  <div>
                    <label className={labelCls}>Known constraints</label>
                    <textarea value={constraints} onChange={e => setConstraints(e.target.value)} rows={2} placeholder="Regulations, space limits, budget constraints…" className={`${inputCls()} resize-none`} />
                  </div>
                  <div>
                    <label className={labelCls}>Category</label>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {CATEGORIES.map(c => (
                        <button key={c} onClick={() => toggleTag(categories, setCategories, c.toLowerCase())}
                          className={`px-3 py-1 rounded-lg text-xs border transition-all ${categories.includes(c.toLowerCase()) ? 'bg-primary border-primary text-white' : 'bg-white/[0.04] border-white/10 text-white/50 hover:border-white/25'}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Design discipline</label>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {DISCIPLINES.map(d => (
                        <button key={d} onClick={() => toggleTag(disciplines, setDisciplines, d.toLowerCase().replace(/\s*\/\s*/g, '-').replace(/\s+/g, '-'))}
                          className={`px-3 py-1 rounded-lg text-xs border transition-all ${disciplines.includes(d.toLowerCase().replace(/\s*\/\s*/g, '-').replace(/\s+/g, '-')) ? 'bg-primary border-primary text-white' : 'bg-white/[0.04] border-white/10 text-white/50 hover:border-white/25'}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div>
                    <h2 className="text-lg font-bold text-white mb-0.5" style={{ fontFamily: 'Manrope, sans-serif' }}>About You</h2>
                    <p className="text-white/40 text-xs">Let us know who you are so students can follow up.</p>
                  </div>
                  <div>
                    <label className={labelCls}>Your Name <span className="text-red-400">*</span></label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" className={inputCls(errors.name)} />
                    {errors.name && <p className="text-red-400 text-xs mt-1">Please enter your name</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Your Role <span className="text-white/30 font-normal">(optional)</span></label>
                    <input value={role} onChange={e => setRole(e.target.value)} placeholder='e.g., "Science Teacher", "Parent"' className={inputCls()} />
                  </div>
                  <div>
                    <label className={labelCls}>Email or Phone <span className="text-red-400">*</span></label>
                    <p className={helperCls}>How should students contact you?</p>
                    <input value={contact} onChange={e => setContact(e.target.value)} placeholder="your.email@example.com" className={inputCls(errors.contact)} />
                    {errors.contact && <p className="text-red-400 text-xs mt-1">Please provide a contact method</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Are you willing to be a "client" for a student team?</label>
                    <div className="flex flex-col gap-2 mt-1">
                      {WILLINGNESS.map(w => (
                        <button key={w.val} onClick={() => setWillingness(w.val)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${willingness === w.val ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}>
                          <span className="text-2xl">{w.icon}</span>
                          <div>
                            <p className={`text-sm font-medium ${willingness === w.val ? 'text-white' : 'text-white/70'}`}>{w.title}</p>
                            <p className="text-white/35 text-xs">{w.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Can you offer any resources? <span className="text-white/30 font-normal">(optional)</span></label>
                    <textarea value={resources} onChange={e => setResources(e.target.value)} rows={2} placeholder='e.g., "I can give students access to the workshop"' className={`${inputCls()} resize-none`} />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08]">
              <button
                onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
                className="px-4 py-2 text-sm text-white/50 hover:text-white/80 transition-colors"
              >
                {step > 1 ? '← Back' : 'Cancel'}
              </button>
              <div className="flex gap-2">
                {step < 3 ? (
                  <button onClick={next} className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
                    Next →
                  </button>
                ) : (
                  <button onClick={submit} disabled={submitting} className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {submitting ? 'Submitting…' : '🚀 Submit Problem'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
