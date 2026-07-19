import { useRef, useState } from 'react'
import { useStore } from '../hooks'
import { useContent } from '../../i18n'
import { Section } from '../components'
import { ResumeVariant, bytesToBase64, uid } from '../../lib/types'
import { masterVariant, renderResumePdf } from '../../pdf/resumePdf'
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

  const addResume = (r: ResumeVariant) => {
    const others = r.isDefault ? resumes.map((x) => ({ ...x, isDefault: false })) : resumes
    saveResumes([...others, r])
  }

  const onUpload = async (file: File) => {
    addResume({
      id: uid(), label: file.name.replace(/\.pdf$/i, ''), fileName: file.name, tags: [],
      isDefault: resumes.length === 0, createdAt: Date.now(), source: 'uploaded',
      dataBase64: bytesToBase64(await file.arrayBuffer()),
    })
  }

  const generateMaster = () => {
    setErr('')
    try {
      const variant = masterVariant(profile)
      const base64 = renderResumePdf(profile, variant)
      const name = `${profile.identity.firstName}-${profile.identity.lastName}-CV.pdf`.replace(/\s+/g, '-')
      addResume({
        id: uid(), label: t.masterCvLabel, fileName: name, tags: ['master'],
        isDefault: resumes.length === 0, createdAt: Date.now(), source: 'generated',
        dataBase64: base64, content: variant,
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  const runTailor = async () => {
    setErr('')
    setGaps([])
    try {
      const result = await runTailorCv(settings, profile, jobText, setBusyStep)
      const base64 = renderResumePdf(profile, result.resume)
      const safe = result.resume.label.replace(/[^\w\- ]/g, '').replace(/\s+/g, '-').slice(0, 40)
      addResume({
        id: uid(), label: result.resume.label,
        fileName: `${profile.identity.firstName}-${profile.identity.lastName}-${safe}.pdf`.replace(/\s+/g, '-'),
        tags: [result.job.role, result.job.company].filter(Boolean),
        isDefault: false, createdAt: Date.now(), source: 'generated',
        dataBase64: base64, content: result.resume,
      })
      setGaps(result.gaps)
      setJobText('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyStep('')
    }
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
        <button className="primary small" disabled={!!busyStep || !hasProfile || jobText.trim().length < 80} onClick={runTailor}>
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
          <button className="ghost small" onClick={generateMaster} disabled={!hasProfile}>{t.generateFromProfile}</button>
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
    </div>
  )
}
