import { useRef, useState } from 'react'
import { useStore } from '../hooks'
import { KV, Section } from '../components'
import { EducationEntry, WorkEntry, uid } from '../../lib/types'
import { runExtractProfile } from '../../ai/run'
import { extractPdfTextFromFile } from '../../lib/pdfText'

export function ProfileTab() {
  const [profile, saveProfile, loaded] = useStore('profile')
  const [settings] = useStore('settings')

  const p = profile
  if (!loaded) return null
  const set = (patch: Partial<typeof profile>) => saveProfile({ ...p, ...patch })
  const setIdentity = (k: keyof typeof p.identity, v: string) => set({ identity: { ...p.identity, [k]: v } })
  const setLinks = (k: keyof typeof p.links, v: string) => set({ links: { ...p.links, [k]: v } })
  const setFacts = (k: keyof typeof p.facts, v: string) => set({ facts: { ...p.facts, [k]: v } })

  const name = [p.identity.firstName, p.identity.lastName].filter(Boolean).join(' ')
  const factsFilled = Object.values(p.facts).filter((v) => v && String(v).trim()).length

  return (
    <div>
      <h2>{name || 'Your profile'}</h2>
      <p className="hint">
        {p.headline || 'Everything the extension fills comes from here.'}
      </p>

      <Section title="Basics" summary={[name, p.identity.email].filter(Boolean).join(' · ') || 'empty'} defaultOpen={!name}>
        <KV k="First name" v={p.identity.firstName} onChange={(v) => setIdentity('firstName', v)} />
        <KV k="Last name" v={p.identity.lastName} onChange={(v) => setIdentity('lastName', v)} />
        <KV k="Email" v={p.identity.email} onChange={(v) => setIdentity('email', v)} />
        <KV k="Phone" v={p.identity.phone} placeholder="+92 …" onChange={(v) => setIdentity('phone', v)} />
        <KV k="Location" v={p.identity.location} placeholder="City, Country" onChange={(v) => setIdentity('location', v)} />
        <KV k="City" v={p.identity.city ?? ''} onChange={(v) => setIdentity('city', v)} />
        <KV k="Country" v={p.identity.country ?? ''} onChange={(v) => setIdentity('country', v)} />
        <KV k="Headline" v={p.headline} placeholder="e.g. AI Agent Engineer" onChange={(v) => set({ headline: v })} />
        <KV k="Summary" v={p.summary} multiline onChange={(v) => set({ summary: v })} />
        <KV
          k="Skills" multiline v={p.skills.join(', ')} placeholder="Comma separated"
          onChange={(v) => set({ skills: v.split(',').map((s) => s.trim()).filter(Boolean) })}
        />
      </Section>

      <Section title="Links" summary={Object.values(p.links).filter(Boolean).length + ' added'}>
        <KV k="Website" v={p.links.website ?? ''} onChange={(v) => setLinks('website', v)} />
        <KV k="GitHub" v={p.links.github ?? ''} onChange={(v) => setLinks('github', v)} />
        <KV k="LinkedIn" v={p.links.linkedin ?? ''} onChange={(v) => setLinks('linkedin', v)} />
        <KV k="Portfolio" v={p.links.portfolio ?? ''} onChange={(v) => setLinks('portfolio', v)} />
      </Section>

      <Section
        title="Work experience"
        summary={p.work.length ? `${p.work[0].title} at ${p.work[0].company}${p.work.length > 1 ? ` +${p.work.length - 1}` : ''}` : 'empty'}
      >
        {p.work.map((w, i) => (
          <WorkRow
            key={w.id}
            entry={w}
            onChange={(next) => set({ work: p.work.map((x, j) => (j === i ? next : x)) })}
            onRemove={() => set({ work: p.work.filter((_, j) => j !== i) })}
          />
        ))}
        <button
          className="ghost small"
          onClick={() => set({ work: [...p.work, { id: uid(), company: '', title: '', from: '', to: '', highlights: [] }] })}
        >
          + Add role
        </button>
      </Section>

      <Section title="Education" summary={p.education.length ? `${p.education.length} entr${p.education.length === 1 ? 'y' : 'ies'}` : 'empty'}>
        {p.education.map((e, i) => (
          <EduRow
            key={e.id}
            entry={e}
            onChange={(next) => set({ education: p.education.map((x, j) => (j === i ? next : x)) })}
            onRemove={() => set({ education: p.education.filter((_, j) => j !== i) })}
          />
        ))}
        <button
          className="ghost small"
          onClick={() => set({ education: [...p.education, { id: uid(), school: '', degree: '' }] })}
        >
          + Add education
        </button>
      </Section>

      <Section title="Standard answers" summary={`${factsFilled} of 9 answered`}>
        <p className="microhint" style={{ marginBottom: 8 }}>Asked on almost every application — answer once here.</p>
        <KV k="Salary expectation" v={p.facts.salaryExpectation ?? ''} onChange={(v) => setFacts('salaryExpectation', v)} />
        <KV k="Notice period" v={p.facts.noticePeriod ?? ''} placeholder='"Available immediately"' onChange={(v) => setFacts('noticePeriod', v)} />
        <KV k="Years of experience" v={p.facts.yearsOfExperience ?? ''} onChange={(v) => setFacts('yearsOfExperience', v)} />
        <KV k="Timezone" v={p.facts.timezone ?? ''} placeholder='"PKT (UTC+5)"' onChange={(v) => setFacts('timezone', v)} />
        <KV k="Visa sponsorship?" v={p.facts.needsSponsorship ?? ''} placeholder='"No — remote contractor"' onChange={(v) => setFacts('needsSponsorship', v)} />
        <KV k="Authorized to work in" v={p.facts.authorizedCountries ?? ''} onChange={(v) => setFacts('authorizedCountries', v)} />
        <KV k="Relocation" v={p.facts.relocation ?? ''} onChange={(v) => setFacts('relocation', v)} />
        <KV k="Hours overlap" v={p.facts.hoursOverlap ?? ''} placeholder='"4+ hours with US East"' onChange={(v) => setFacts('hoursOverlap', v)} />
        <KV k="English level" v={p.facts.englishLevel ?? ''} onChange={(v) => setFacts('englishLevel', v)} />
      </Section>

      <Section title="Re-import from CV" summary="upload PDF or paste text, AI rebuilds the profile">
        <ImportBox
          disabled={settings.aiProvider === 'none'}
          onImport={async (text) => {
            const extracted = await runExtractProfile(settings, text)
            saveProfile({ ...extracted, facts: p.facts })
          }}
        />
      </Section>
    </div>
  )
}

function WorkRow({ entry, onChange, onRemove }: { entry: WorkEntry; onChange: (w: WorkEntry) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(!entry.company && !entry.title)
  if (!open) {
    return (
      <div className="kv" onClick={() => setOpen(true)}>
        <span className="k">{entry.from || '—'} → {entry.to || 'now'}</span>
        <span className="v">{entry.title || 'Untitled'} · {entry.company || '?'}</span>
      </div>
    )
  }
  return (
    <div style={{ padding: '6px 0 12px' }}>
      <div className="row">
        <label className="f"><span>Title</span>
          <input type="text" value={entry.title} onChange={(e) => onChange({ ...entry, title: e.target.value })} /></label>
        <label className="f"><span>Company</span>
          <input type="text" value={entry.company} onChange={(e) => onChange({ ...entry, company: e.target.value })} /></label>
      </div>
      <div className="row">
        <label className="f"><span>From</span>
          <input type="text" placeholder="2021-03" value={entry.from} onChange={(e) => onChange({ ...entry, from: e.target.value })} /></label>
        <label className="f"><span>To (empty = present)</span>
          <input type="text" value={entry.to} onChange={(e) => onChange({ ...entry, to: e.target.value })} /></label>
      </div>
      <label className="f"><span>Highlights — one per line, real and concrete</span>
        <textarea
          rows={4}
          value={entry.highlights.join('\n')}
          onChange={(e) => onChange({ ...entry, highlights: e.target.value.split('\n').filter((l) => l.trim()) })}
        /></label>
      <div className="row">
        <button className="ghost small" onClick={() => setOpen(false)}>Done</button>
        <button className="danger small" onClick={onRemove}>Remove</button>
      </div>
    </div>
  )
}

function EduRow({ entry, onChange, onRemove }: { entry: EducationEntry; onChange: (e: EducationEntry) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(!entry.school && !entry.degree)
  if (!open) {
    return (
      <div className="kv" onClick={() => setOpen(true)}>
        <span className="k">{[entry.from, entry.to].filter(Boolean).join('—') || '—'}</span>
        <span className="v">{entry.degree || '?'} · {entry.school || '?'}</span>
      </div>
    )
  }
  return (
    <div style={{ padding: '6px 0 12px' }}>
      <div className="row">
        <label className="f"><span>Degree</span>
          <input type="text" value={entry.degree} onChange={(e) => onChange({ ...entry, degree: e.target.value })} /></label>
        <label className="f"><span>School</span>
          <input type="text" value={entry.school} onChange={(e) => onChange({ ...entry, school: e.target.value })} /></label>
      </div>
      <div className="row">
        <label className="f"><span>From</span>
          <input type="text" value={entry.from ?? ''} onChange={(e) => onChange({ ...entry, from: e.target.value })} /></label>
        <label className="f"><span>To</span>
          <input type="text" value={entry.to ?? ''} onChange={(e) => onChange({ ...entry, to: e.target.value })} /></label>
      </div>
      <div className="row">
        <button className="ghost small" onClick={() => setOpen(false)}>Done</button>
        <button className="danger small" onClick={onRemove}>Remove</button>
      </div>
    </div>
  )
}

function ImportBox({ disabled, onImport }: { disabled: boolean; onImport: (text: string) => Promise<void> }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        className="ghost small"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        style={{ marginBottom: 8 }}
      >
        {busy ? 'Reading PDF…' : 'Upload PDF (read locally)'}
      </button>
      <input
        ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }}
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          setErr('')
          setBusy(true)
          try {
            setText(await extractPdfTextFromFile(f))
          } catch (ex) {
            setErr(ex instanceof Error ? ex.message : String(ex))
          } finally {
            setBusy(false)
          }
        }}
      />
      <textarea rows={5} placeholder="…or paste your CV text." value={text} onChange={(e) => setText(e.target.value)} />
      <div className="spacer" />
      <button
        className="ghost small"
        disabled={disabled || busy || text.trim().length < 50}
        onClick={async () => {
          setErr('')
          setBusy(true)
          try {
            await onImport(text)
            setText('')
          } catch (e) {
            setErr(e instanceof Error ? e.message : String(e))
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? 'Reading…' : 'Rebuild profile'}
      </button>
      {disabled && <p className="microhint">Needs an AI key — Settings.</p>}
      {err && <p className="error">{err}</p>}
    </>
  )
}
