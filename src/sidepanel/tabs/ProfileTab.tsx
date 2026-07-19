import { useRef, useState } from 'react'
import { useStore } from '../hooks'
import { useContent } from '../../i18n'
import { KV, Section } from '../components'
import {
  EducationEntry,
  LanguageEntry,
  LanguageProficiency,
  WorkEntry,
  parseYm,
  skillNames,
  uid,
  ymString,
  workPeriodLabel,
} from '../../lib/types'
import { cloudParseResumePdf, runExtractProfile } from '../../ai/run'
import { showToast } from '../toast'

export function ProfileTab() {
  const t = useContent('profile')
  const [profile, saveProfileRaw, loaded] = useStore('profile')
  const [settings] = useStore('settings')

  const p = profile
  if (!loaded) return null
  // Every edit on this tab persists immediately; the toast is the receipt.
  const save = (v: typeof profile) => {
    saveProfileRaw(v)
    showToast(t.savedToast)
  }
  const set = (patch: Partial<typeof profile>) => save({ ...p, ...patch })
  const setIdentity = (k: keyof typeof p.identity, v: string) => set({ identity: { ...p.identity, [k]: v } })
  const setLinks = (k: keyof typeof p.links, v: string) => set({ links: { ...p.links, [k]: v } })
  const setFacts = (k: keyof typeof p.facts, v: string) => set({ facts: { ...p.facts, [k]: v } })

  const name = [p.identity.firstName, p.identity.lastName].filter(Boolean).join(' ')
  const factsFilled = Object.values(p.facts).filter((v) => v && String(v).trim()).length
  const extras = p.languages.length + p.certifications.length + p.highlights.length

  return (
    <div>
      <h2>{name || t.yourProfile}</h2>
      <p className="hint">
        {p.headline || t.hint}
      </p>

      <Section title={t.basicsTitle} summary={[name, p.identity.email].filter(Boolean).join(' · ') || t.empty} defaultOpen={!name}>
        <KV k={t.firstName} v={p.identity.firstName} onChange={(v) => setIdentity('firstName', v)} />
        <KV k={t.lastName} v={p.identity.lastName} onChange={(v) => setIdentity('lastName', v)} />
        <KV k={t.email} v={p.identity.email} onChange={(v) => setIdentity('email', v)} />
        <KV k={t.phone} v={p.identity.phone} placeholder="+92 …" onChange={(v) => setIdentity('phone', v)} />
        <KV k={t.location} v={p.identity.location} placeholder={t.locationPlaceholder} onChange={(v) => setIdentity('location', v)} />
        <KV k={t.city} v={p.identity.city ?? ''} onChange={(v) => setIdentity('city', v)} />
        <KV k={t.countryIso} v={p.identity.country ?? ''} placeholder="PK" onChange={(v) => setIdentity('country', v)} />
        <KV k={t.headline} v={p.headline} placeholder={t.headlinePlaceholder} onChange={(v) => set({ headline: v })} />
        <KV k={t.summary} v={p.summary} multiline onChange={(v) => set({ summary: v })} />
        <KV
          k={t.skills} multiline v={skillNames(p).join(', ')} placeholder={t.skillsPlaceholder}
          onChange={(v) => {
            const byName = new Map(p.skills.map((s) => [s.name.toLowerCase(), s]))
            set({
              skills: v.split(',').map((s) => s.trim()).filter(Boolean)
                .map((n) => byName.get(n.toLowerCase()) ?? { name: n }),
            })
          }}
        />
        <KV
          k={t.industries} v={p.industries.join(', ')} placeholder={t.industriesPlaceholder}
          onChange={(v) => set({ industries: v.split(',').map((s) => s.trim()).filter(Boolean) })}
        />
      </Section>

      <Section title={t.linksTitle} summary={t.linksAdded(Object.values(p.links).filter(Boolean).length)}>
        <KV k={t.website} v={p.links.website ?? ''} url invalidHint={t.invalidUrl} onChange={(v) => setLinks('website', v)} />
        <KV k={t.github} v={p.links.github ?? ''} url invalidHint={t.invalidUrl} onChange={(v) => setLinks('github', v)} />
        <KV k={t.linkedin} v={p.links.linkedin ?? ''} url invalidHint={t.invalidUrl} onChange={(v) => setLinks('linkedin', v)} />
        <KV k={t.portfolio} v={p.links.portfolio ?? ''} url invalidHint={t.invalidUrl} onChange={(v) => setLinks('portfolio', v)} />
      </Section>

      <Section
        title={t.workTitle}
        summary={p.work.length ? t.workSummary(p.work[0].title, p.work[0].company, p.work.length - 1) : t.empty}
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
          onClick={() =>
            set({ work: [...p.work, { id: uid(), company: '', title: '', isCurrent: true, skills: [], highlights: [] }] })
          }
        >
          {t.addRole}
        </button>
      </Section>

      <Section title={t.educationTitle} summary={p.education.length ? t.educationCount(p.education.length) : t.empty}>
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
          {t.addEducation}
        </button>
      </Section>

      <Section title={t.extrasTitle} summary={extras ? t.extrasCount(extras) : t.empty}>
        <label className="f"><span>{t.careerHighlightsLabel}</span>
          <textarea
            rows={3}
            placeholder={t.careerHighlightsPlaceholder}
            value={p.highlights.join('\n')}
            onChange={(e) => set({ highlights: e.target.value.split('\n').filter((l) => l.trim()).slice(0, 3) })}
          /></label>
        <label className="f"><span>{t.languagesLabel}</span>
          <textarea
            rows={2}
            placeholder={t.languagesPlaceholder}
            value={p.languages.map((l) => `${l.name} — ${l.proficiency.replaceAll('_', ' ')}`).join('\n')}
            onChange={(e) => set({ languages: parseLanguages(e.target.value) })}
          /></label>
        <label className="f"><span>{t.certificationsLabel}</span>
          <textarea
            rows={2}
            placeholder={t.certificationsPlaceholder}
            value={p.certifications.map((c) => [c.name, c.issuingOrganization, c.year].filter(Boolean).join(' — ')).join('\n')}
            onChange={(e) =>
              set({
                certifications: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
                  const [name, issuer, year] = l.split('—').map((s) => s.trim())
                  return { name: name ?? l, issuingOrganization: issuer || undefined, year: year ? Number(year) || undefined : undefined }
                }),
              })
            }
          /></label>
      </Section>

      <Section title={t.standardAnswersTitle} summary={t.answeredOf(factsFilled, 9)}>
        <p className="microhint" style={{ marginBottom: 8 }}>{t.standardAnswersHint}</p>
        <KV k={t.salaryExpectation} v={p.facts.salaryExpectation ?? ''} onChange={(v) => setFacts('salaryExpectation', v)} />
        <KV k={t.noticePeriod} v={p.facts.noticePeriod ?? ''} placeholder={t.noticePlaceholder} onChange={(v) => setFacts('noticePeriod', v)} />
        <KV k={t.yearsOfExperience} v={p.facts.yearsOfExperience ?? ''} placeholder={t.yearsPlaceholder} onChange={(v) => setFacts('yearsOfExperience', v)} />
        <KV k={t.timezone} v={p.facts.timezone ?? ''} placeholder={t.timezonePlaceholder} onChange={(v) => setFacts('timezone', v)} />
        <KV k={t.visaSponsorship} v={p.facts.needsSponsorship ?? ''} placeholder={t.visaPlaceholder} onChange={(v) => setFacts('needsSponsorship', v)} />
        <KV k={t.authorizedIn} v={p.facts.authorizedCountries ?? ''} onChange={(v) => setFacts('authorizedCountries', v)} />
        <KV k={t.relocation} v={p.facts.relocation ?? ''} onChange={(v) => setFacts('relocation', v)} />
        <KV k={t.hoursOverlap} v={p.facts.hoursOverlap ?? ''} placeholder={t.hoursPlaceholder} onChange={(v) => setFacts('hoursOverlap', v)} />
        <KV k={t.englishLevel} v={p.facts.englishLevel ?? ''} onChange={(v) => setFacts('englishLevel', v)} />
      </Section>

      <Section title={t.reimportTitle} summary={t.reimportSummary}>
        <ImportBox
          cloudPdf={async (file) => {
            const { profile: extracted } = await cloudParseResumePdf(settings, await file.arrayBuffer())
            save({ ...extracted, facts: p.facts })
          }}
          onImport={async (text) => {
            const extracted = await runExtractProfile(settings, text)
            save({ ...extracted, facts: p.facts })
          }}
        />
      </Section>
    </div>
  )
}

const LANG_LEVELS: [RegExp, LanguageProficiency][] = [
  [/native|bilingual|mother/i, 'native_bilingual'],
  [/full|fluent/i, 'full_professional'],
  [/professional|advanced|working/i, 'professional_working'],
  [/limited|intermediate|conversational/i, 'limited_working'],
  [/basic|beginner|elementary/i, 'elementary'],
]

function parseLanguages(text: string): LanguageEntry[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [name, level] = l.split('—').map((s) => s.trim())
    const proficiency = LANG_LEVELS.find(([re]) => re.test(level ?? ''))?.[1] ?? 'professional_working'
    return { langCode: (name ?? '').slice(0, 2).toLowerCase(), name: name ?? l, proficiency }
  })
}

function WorkRow({ entry, onChange, onRemove }: { entry: WorkEntry; onChange: (w: WorkEntry) => void; onRemove: () => void }) {
  const t = useContent('profile')
  const [open, setOpen] = useState(!entry.company && !entry.title)
  if (!open) {
    return (
      <div className="kv" onClick={() => setOpen(true)}>
        <span className="k">{workPeriodLabel(entry) || '—'}</span>
        <span className="v">{entry.title || t.untitled} · {entry.company || '?'}</span>
      </div>
    )
  }
  const setStart = (v: string) => {
    const { year, month } = parseYm(v)
    onChange({ ...entry, startYear: year, startMonth: month })
  }
  const setEnd = (v: string) => {
    if (!v.trim()) return onChange({ ...entry, endYear: undefined, endMonth: undefined, isCurrent: true })
    const { year, month } = parseYm(v)
    onChange({ ...entry, endYear: year, endMonth: month, isCurrent: false })
  }
  return (
    <div style={{ padding: '6px 0 12px' }}>
      <div className="row">
        <label className="f"><span>{t.roleTitle}</span>
          <input type="text" value={entry.title} onChange={(e) => onChange({ ...entry, title: e.target.value })} /></label>
        <label className="f"><span>{t.company}</span>
          <input type="text" value={entry.company} onChange={(e) => onChange({ ...entry, company: e.target.value })} /></label>
      </div>
      <div className="row">
        <label className="f"><span>{t.fromYm}</span>
          <input type="text" placeholder="2021-03" defaultValue={ymString(entry.startYear, entry.startMonth)} onBlur={(e) => setStart(e.target.value)} /></label>
        <label className="f"><span>{t.toYm}</span>
          <input type="text" defaultValue={entry.isCurrent ? '' : ymString(entry.endYear, entry.endMonth)} onBlur={(e) => setEnd(e.target.value)} /></label>
      </div>
      <label className="f"><span>{t.techUsed}</span>
        <input
          type="text"
          value={entry.skills.join(', ')}
          onChange={(e) => onChange({ ...entry, skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
        /></label>
      <label className="f"><span>{t.workHighlights}</span>
        <textarea
          rows={4}
          value={entry.highlights.join('\n')}
          onChange={(e) => onChange({ ...entry, highlights: e.target.value.split('\n').filter((l) => l.trim()) })}
        /></label>
      <div className="row">
        <button className="ghost small" onClick={() => setOpen(false)}>{t.done}</button>
        <button className="danger small" onClick={onRemove}>{t.remove}</button>
      </div>
    </div>
  )
}

function EduRow({ entry, onChange, onRemove }: { entry: EducationEntry; onChange: (e: EducationEntry) => void; onRemove: () => void }) {
  const t = useContent('profile')
  const [open, setOpen] = useState(!entry.school && !entry.degree)
  if (!open) {
    return (
      <div className="kv" onClick={() => setOpen(true)}>
        <span className="k">{[entry.startYear, entry.endYear].filter(Boolean).join('—') || '—'}</span>
        <span className="v">{[entry.degree, entry.fieldOfStudy].filter(Boolean).join(', ') || '?'} · {entry.school || '?'}</span>
      </div>
    )
  }
  return (
    <div style={{ padding: '6px 0 12px' }}>
      <div className="row">
        <label className="f"><span>{t.degree}</span>
          <input type="text" value={entry.degree} onChange={(e) => onChange({ ...entry, degree: e.target.value })} /></label>
        <label className="f"><span>{t.fieldOfStudy}</span>
          <input type="text" value={entry.fieldOfStudy ?? ''} onChange={(e) => onChange({ ...entry, fieldOfStudy: e.target.value })} /></label>
      </div>
      <label className="f"><span>{t.school}</span>
        <input type="text" value={entry.school} onChange={(e) => onChange({ ...entry, school: e.target.value })} /></label>
      <div className="row">
        <label className="f"><span>{t.fromYear}</span>
          <input type="text" defaultValue={entry.startYear ?? ''} onBlur={(e) => onChange({ ...entry, startYear: Number(e.target.value) || undefined })} /></label>
        <label className="f"><span>{t.toYear}</span>
          <input type="text" defaultValue={entry.endYear ?? ''} onBlur={(e) => onChange({ ...entry, endYear: Number(e.target.value) || undefined })} /></label>
      </div>
      <div className="row">
        <button className="ghost small" onClick={() => setOpen(false)}>{t.done}</button>
        <button className="danger small" onClick={onRemove}>{t.remove}</button>
      </div>
    </div>
  )
}

function ImportBox({
  onImport,
  cloudPdf,
}: {
  onImport: (text: string) => Promise<void>
  // The server deep-reads the PDF (incl. OCR) and returns the profile.
  cloudPdf: (file: File) => Promise<void>
}) {
  const t = useContent('profile')
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
        {busy ? t.readingPdf : t.uploadPdf}
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
            await cloudPdf(f)
            setText('')
          } catch (ex) {
            setErr(ex instanceof Error ? ex.message : String(ex))
          } finally {
            setBusy(false)
          }
        }}
      />
      <textarea rows={5} placeholder={t.pasteCvPlaceholder} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
      <div className="spacer" />
      <button
        className="ghost small"
        disabled={busy || text.trim().length < 50}
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
        {busy ? t.reading : t.rebuildProfile}
      </button>
      {err && <p className="error">{err}</p>}
    </>
  )
}
