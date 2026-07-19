import { useRef, useState } from 'react'
import { useStore } from '../hooks'
import { useContent } from '../../i18n'
import { Section } from '../components'
import { ResumeVariant, bytesToBase64, uid } from '../../lib/types'
import { sendMsg } from '../../lib/messaging'
import { masterVariant, renderResumePdf } from '../../pdf/resumePdf'
import { ALL_TAGS, ResumeTemplate, TEMPLATES, TemplateTag } from '../../pdf/templates'
import { runTailorCv } from '../../ai/run'

export function ResumesTab() {
  const t = useContent('resumes')
  const [resumes, saveResumes] = useStore('resumes')
  const [profile] = useStore('profile')
  const [settings] = useStore('settings')
  const fileRef = useRef<HTMLInputElement>(null)

  const [jobText, setJobText] = useState('')
  const [busyStep, setBusyStep] = useState('')
  const [err, setErr] = useState('')
  const [gaps, setGaps] = useState<string[]>([])
  // Which generation is waiting on a template pick.
  const [picking, setPicking] = useState<'master' | 'tailor' | null>(null)

  const addResume = (r: ResumeVariant) => {
    const others = r.isDefault ? resumes.map((x) => ({ ...x, isDefault: false })) : resumes
    saveResumes([...others, r])
  }

  const onUpload = async (file: File) => {
    const id = uid()
    addResume({
      id, label: file.name.replace(/\.pdf$/i, ''), fileName: file.name, tags: [],
      isDefault: resumes.length === 0, createdAt: Date.now(), source: 'uploaded',
      dataBase64: bytesToBase64(await file.arrayBuffer()),
    })
    // Background: tag the CV for the roles it targets, fold new facts into
    // the profile (additive only).
    void sendMsg({ type: 'intakeResume', resumeId: id })
  }

  const generateMaster = (templateId: string) => {
    setErr('')
    try {
      const variant = masterVariant(profile)
      const base64 = renderResumePdf(profile, variant, templateId)
      const name = `${profile.identity.firstName}-${profile.identity.lastName}-CV.pdf`.replace(/\s+/g, '-')
      addResume({
        id: uid(), label: t.masterCvLabel, fileName: name,
        tags: ['master', ...(profile.headline ? [profile.headline] : [])],
        isDefault: resumes.length === 0, createdAt: Date.now(), source: 'generated',
        templateId, dataBase64: base64, content: variant,
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  const runTailor = async (templateId: string) => {
    setErr('')
    setGaps([])
    try {
      const result = await runTailorCv(settings, profile, jobText, setBusyStep)
      const base64 = renderResumePdf(profile, result.resume, templateId)
      const safe = result.resume.label.replace(/[^\w\- ]/g, '').replace(/\s+/g, '-').slice(0, 40)
      addResume({
        id: uid(), label: result.resume.label,
        fileName: `${profile.identity.firstName}-${profile.identity.lastName}-${safe}.pdf`.replace(/\s+/g, '-'),
        tags: [result.job.role, result.job.company].filter(Boolean),
        isDefault: false, createdAt: Date.now(), source: 'generated',
        templateId, dataBase64: base64, content: result.resume,
      })
      setGaps(result.gaps)
      setJobText('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyStep('')
    }
  }

  const onPickTemplate = (templateId: string) => {
    const action = picking
    setPicking(null)
    if (action === 'master') generateMaster(templateId)
    if (action === 'tailor') void runTailor(templateId)
  }

  const download = (r: ResumeVariant) => {
    const a = document.createElement('a')
    a.href = `data:application/pdf;base64,${r.dataBase64}`
    a.download = r.fileName
    a.click()
  }

  const hasProfile = profile.work.length > 0 && !!profile.identity.firstName

  return (
    <div>
      <h2>{t.title}</h2>
      <p className="hint">{t.hint}</p>

      {resumes.length > 0 && (
        <div className="list" style={{ marginBottom: 16 }}>
          {resumes.map((r) => (
            <div key={r.id} className="list-item">
              <div className="grow">
                <div className="title">
                  {r.label} {r.isDefault && <span className="chip green">{t.defaultChip}</span>}
                </div>
                <div className="sub">
                  {r.tags.slice(0, 3).map((t) => <span key={t} className="chip">{t}</span>)}
                </div>
              </div>
              <button className="small link" onClick={() => download(r)}>{t.pdf}</button>
              {!r.isDefault && (
                <button className="small link" onClick={() => saveResumes(resumes.map((x) => ({ ...x, isDefault: x.id === r.id })))}>
                  {t.makeDefault}
                </button>
              )}
              <button className="small danger" onClick={() => saveResumes(resumes.filter((x) => x.id !== r.id))}>✕</button>
            </div>
          ))}
        </div>
      )}
      {resumes.length === 0 && <div className="empty">{t.emptyList}</div>}

      <Section title={t.tailorTitle} summary={t.tailorSummary} defaultOpen={resumes.length > 0}>
        <textarea
          rows={5}
          placeholder={t.pasteJobPlaceholder}
          value={jobText}
          onChange={(e) => setJobText(e.target.value)}
        />
        <div className="spacer" />
        <button
          className="primary small"
          disabled={!!busyStep || !hasProfile || jobText.trim().length < 80}
          onClick={() => setPicking('tailor')}
        >
          {busyStep ? t.working : t.tailorMyCv}
        </button>
        {busyStep && <p className="progress">{busyStep}</p>}
        {!hasProfile && <p className="microhint">{t.fillProfileHint}</p>}
        {err && <p className="error">{err}</p>}
        {gaps.length > 0 && (
          <>
            <p className="microhint" style={{ margin: '10px 0 6px' }}>
              {t.gapsIntro}
            </p>
            {gaps.map((g, i) => <div key={i} className="chip amber" style={{ marginBottom: 4 }}>{g}</div>)}
          </>
        )}
      </Section>

      <Section title={t.addTitle} summary={t.addSummary}>
        <div className="row">
          <button className="ghost small" onClick={() => fileRef.current?.click()}>{t.uploadPdf}</button>
          <button className="ghost small" onClick={() => setPicking('master')} disabled={!hasProfile}>
            {t.generateFromProfile}
          </button>
        </div>
        <input
          ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onUpload(f)
            e.target.value = ''
          }}
        />
      </Section>

      {picking && <TemplatePicker onPick={onPickTemplate} onCancel={() => setPicking(null)} />}
    </div>
  )
}

function TemplatePicker({ onPick, onCancel }: { onPick: (id: string) => void; onCancel: () => void }) {
  const t = useContent('resumes')
  const [tag, setTag] = useState<TemplateTag | null>(null)
  const shown = tag ? TEMPLATES.filter((tpl) => tpl.tags.includes(tag)) : TEMPLATES

  const tagLabel: Record<TemplateTag, string> = {
    engineering: t.tagEngineering, data: t.tagData, marketing: t.tagMarketing, sales: t.tagSales,
    finance: t.tagFinance, consulting: t.tagConsulting, legal: t.tagLegal, healthcare: t.tagHealthcare,
    education: t.tagEducation, creative: t.tagCreative, operations: t.tagOperations, hr: t.tagHr,
    executive: t.tagExecutive, student: t.tagStudent,
  }

  return (
    <div className="tpl-overlay" onClick={onCancel}>
      <div className="tpl-sheet" onClick={(e) => e.stopPropagation()}>
        <h3>{t.pickStyleTitle}</h3>
        <p className="microhint">{t.pickStyleHint}</p>
        <div className="tpl-tags">
          <button className={`chip ${tag === null ? 'blue' : ''}`} onClick={() => setTag(null)}>{t.allStyles}</button>
          {ALL_TAGS.map((tg) => (
            <button key={tg} className={`chip ${tag === tg ? 'blue' : ''}`} onClick={() => setTag(tg)}>
              {tagLabel[tg]}
            </button>
          ))}
        </div>
        <div className="tpl-grid">
          {shown.map((tpl) => (
            <button key={tpl.id} className="tpl-card" onClick={() => onPick(tpl.id)}>
              <TemplateThumb tpl={tpl} />
              <span className="tpl-name">{tpl.name}</span>
              <span className="tpl-for">{tpl.tags.slice(0, 2).map((tg) => tagLabel[tg]).join(' · ')}</span>
            </button>
          ))}
        </div>
        <button className="ghost small" onClick={onCancel}>{t.cancel}</button>
      </div>
    </div>
  )
}

/** Tiny schematic preview built from the same design tokens the PDF uses. */
function TemplateThumb({ tpl }: { tpl: ResumeTemplate }) {
  const accent = tpl.accent ?? '#111827'
  const gray = '#d4d4d8'
  const line = (w: string, h = 3, c = gray) => (
    <div style={{ width: w, height: h, background: c, borderRadius: 1, flex: 'none' }} />
  )
  const section = (
    <>
      {line('34%', 3, '#71717a')}
      {tpl.sectionStyle === 'accentRule' && line('16%', 2, accent)}
      {line('92%')}
      {line('84%')}
      {line('88%')}
    </>
  )
  const centered = tpl.headerStyle === 'centered'
  return (
    <div className="tpl-thumb">
      {tpl.headerStyle === 'bar' ? (
        <div style={{ background: accent, margin: '-6px -6px 4px', padding: '6px 6px 5px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {line('52%', 4, '#ffffff')}
          {line('36%', 2, 'rgba(255,255,255,0.7)')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: centered ? 'center' : 'flex-start', marginBottom: 4 }}>
          {line('52%', 4, accent)}
          {line('38%', 2)}
        </div>
      )}
      {tpl.layout === 'sidebar' ? (
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          <div style={{ width: '30%', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {line('80%', 3, accent)}
            {line('100%', 2)}
            {line('90%', 2)}
            {line('95%', 2)}
            {line('70%', 2)}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>{section}{line('76%')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tpl.density === 'compact' ? 2 : 3, flex: 1 }}>
          {section}
          {line('34%', 3, '#71717a')}
          {tpl.sectionStyle === 'accentRule' && line('16%', 2, accent)}
          {line('90%')}
          {line('80%')}
        </div>
      )}
    </div>
  )
}
