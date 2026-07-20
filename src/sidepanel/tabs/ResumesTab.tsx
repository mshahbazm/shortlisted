import { useEffect, useRef, useState } from 'react'
import { useStore } from '../hooks'
import { useContent } from '../../i18n'
import { Body, Icon, ScreenHead, Sheet, TopBar, useStack } from '../ui'
import { Profile, ResumeVariant, base64ToBytes, bytesToBase64, roleCompanyLabel, uid } from '../../lib/types'
import { sendMsg } from '../../lib/messaging'
import * as store from '../../lib/store'
import { applyIntakeFacts } from '../../lib/profileMerge'
import { renderPdfPages, renderPdfThumbnail } from '../../lib/pdfText'
import { masterVariant, renderResumePdf } from '../../pdf/resumePdf'
import { ALL_TAGS, ResumeTemplate, TEMPLATES, TemplateTag } from '../../pdf/templates'
import { runTailorCv } from '../../ai/run'
import { showToast } from '../toast'
import type { tMerged } from '../../i18n/content'

/** "Modern clean" → "Modern clean (2)" when the name is taken. */
function uniqueLabel(base: string, existing: { label: string }[]): string {
  if (!existing.some((r) => r.label === base)) return base
  let n = 2
  while (existing.some((r) => r.label === `${base} (${n})`)) n++
  return `${base} (${n})`
}

/** Localized descriptive style name for a template id. */
function styleName(t: tMerged<'resumes'>, id: string): string {
  const names: Record<string, string> = {
    harvard: t.tplHarvard, atlas: t.tplAtlas, onyx: t.tplOnyx, azure: t.tplAzure,
    meridian: t.tplMeridian, regent: t.tplRegent, pivot: t.tplPivot, coral: t.tplCoral,
    ivory: t.tplIvory, slate: t.tplSlate, amber: t.tplAmber, mint: t.tplMint,
  }
  return names[id] ?? id
}

export function ResumesTab() {
  const t = useContent('resumes')
  const nav = useStack()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [resumes] = useStore('resumes')
  const [profile] = useStore('profile')
  const [settings] = useStore('settings')
  const fileRef = useRef<HTMLInputElement>(null)

  const [jobText, setJobText] = useState('')
  const [tailorNote, setTailorNote] = useState('')
  const [busyStep, setBusyStep] = useState('')
  const [err, setErr] = useState('')
  const [gaps, setGaps] = useState<string[]>([])
  /** Label of the CV that tailoring just produced — drives the result screen. */
  const [justMade, setJustMade] = useState('')
  /** CV awaiting a delete confirmation. Tailored ones cost a credit to
   *  remake, and Delete sits in a row of harmless links. */
  const [deleting, setDeleting] = useState<string | null>(null)
  // Which generation is waiting on a template pick.
  const [picking, setPicking] = useState<'master' | 'tailor' | null>(null)

  // Every mutation runs against the LIVE list via store.update — the list in
  // this closure may be stale (background intake, cloud pull, a second add in
  // quick succession), and read-modify-write against it loses entries.
  const addResume = (build: (list: ResumeVariant[]) => ResumeVariant) =>
    store.update('resumes', (list) => {
      const r = build(list)
      const others = r.isDefault ? list.map((x) => ({ ...x, isDefault: false })) : list
      return [...others, r]
    })

  const removeResume = (id: string) => void store.update('resumes', (list) => list.filter((x) => x.id !== id))
  const makeDefault = (id: string) =>
    void store.update('resumes', (list) => list.map((x) => ({ ...x, isDefault: x.id === id })))

  // Same shape as generateMaster and runTailor: busy state up front, errors
  // surfaced, busy cleared in finally. This one used to do none of it, so a
  // big PDF looked frozen and a failed write showed nothing at all — the
  // caller is `void onUpload(f)`, so a rejection here vanished silently.
  const onUpload = async (file: File) => {
    setErr('')
    setBusyStep(t.uploading)
    try {
      const id = uid()
      const dataBase64 = bytesToBase64(await file.arrayBuffer())
      await addResume((list) => ({
        id, label: file.name.replace(/\.pdf$/i, ''), fileName: file.name, tags: [],
        isDefault: list.length === 0, createdAt: Date.now(), source: 'uploaded', dataBase64,
      }))
      showToast(t.cvReady)
      // Background: tag the CV for the roles it targets, fold new facts into
      // the profile (additive only).
      void sendMsg({ type: 'intakeResume', resumeId: id })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyStep('')
    }
  }

  const generateMaster = async (templateId: string) => {
    setErr('')
    setBusyStep(t.working)
    // Let the busy state paint before the CPU-bound PDF render blocks.
    await new Promise((r) => setTimeout(r, 30))
    try {
      const variant = masterVariant(profile)
      const base64 = renderResumePdf(profile, variant, templateId)
      const name = `${profile.identity.firstName}-${profile.identity.lastName}-CV-${templateId}.pdf`.replace(/\s+/g, '-')
      await addResume((list) => ({
        id: uid(),
        label: uniqueLabel(styleName(t, templateId), list),
        fileName: name,
        tags: ['master', ...(profile.headline ? [profile.headline] : [])],
        isDefault: list.length === 0, createdAt: Date.now(), source: 'generated',
        templateId, dataBase64: base64, content: variant,
      }))
      showToast(t.cvReady)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyStep('')
    }
  }

  const runTailor = async (templateId: string) => {
    setErr('')
    setGaps([])
    try {
      const result = await runTailorCv(settings, profile, jobText, setBusyStep, tailorNote.trim() || undefined)
      // Facts stated in the note become permanent profile facts (additive).
      if (result.newFacts) {
        const facts = result.newFacts
        await store.update('profile', (p) => applyIntakeFacts(p, facts))
      }
      const base64 = renderResumePdf(profile, result.resume, templateId)
      const safe = result.resume.label.replace(/[^\w\- ]/g, '').replace(/\s+/g, '-').slice(0, 40)
      await addResume((list) => ({
        id: uid(),
        label: uniqueLabel(roleCompanyLabel(result.resume.label, result.job.company), list),
        fileName: `${profile.identity.firstName}-${profile.identity.lastName}-${safe}.pdf`.replace(/\s+/g, '-'),
        tags: [result.job.role, result.job.company].filter(Boolean),
        isDefault: false, createdAt: Date.now(), source: 'generated',
        templateId, dataBase64: base64, content: result.resume,
      }))
      showToast(t.cvReady)
      setGaps(result.gaps)
      setJobText('')
      setTailorNote('')
      // A credit was just spent — show what came back rather than dropping the
      // user on a list and hoping they spot the new row.
      setJustMade(roleCompanyLabel(result.resume.label, result.job.company))
      nav.push('done')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyStep('')
    }
  }

  const onPickTemplate = (templateId: string) => {
    const action = picking
    setPicking(null)
    if (action === 'master') void generateMaster(templateId)
    if (action === 'tailor') void runTailor(templateId)
  }

  const download = (r: ResumeVariant) => {
    const a = document.createElement('a')
    a.href = `data:application/pdf;base64,${r.dataBase64}`
    a.download = r.fileName
    a.click()
  }

  const [editingCv, setEditingCv] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ label: string; pages: string[] } | null>(null)
  const openPreview = async (r: ResumeVariant) => {
    setPreview({ label: r.label, pages: [] })
    try {
      const pages = await renderPdfPages(base64ToBytes(r.dataBase64), 660)
      setPreview((cur) => (cur?.label === r.label ? { label: r.label, pages } : cur))
    } catch {
      setPreview(null)
    }
  }

  const hasProfile = profile.work.length > 0 && !!profile.identity.firstName

  const hiddenFileInput = (
    <input
      ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }}
      onChange={(e) => {
        const f = e.target.files?.[0]
        if (f) void onUpload(f)
        e.target.value = ''
      }}
    />
  )

  // What a spent credit bought. The gaps live here rather than on the list,
  // because this is the moment the honesty claim actually lands.
  if (nav.screen === 'done') {
    const made = resumes.find((r) => r.label === justMade)
    return (
      <>
        <ScreenHead title={t.cvReady} onBack={() => nav.reset()} backLabel={t.back} />
        <Body screen={nav.screen}>
          <div className="done">
            <div className="done-ring"><Icon name="check" /></div>
            <div className="done-t">{justMade}</div>
            <div className="done-s">{t.tailoredBody}</div>
          </div>
          <div className="duo tight">
            <button className="ghost" disabled={!made} onClick={() => made && void openPreview(made)}>
              {t.previewLabel}
            </button>
            <button className="primary" disabled={!made} onClick={() => { if (made) makeDefault(made.id); nav.reset() }}>
              {t.makeDefault}
            </button>
          </div>
          {gaps.length > 0 && (
            <div className="gaps">
              <div className="gaps-h">{t.gapsShort}</div>
              <div className="gaps-s">{t.gapsKeptOff}</div>
              <div className="gaps-c">
                {gaps.map((g, i) => <span key={i} className="minichip amber">{g}</span>)}
              </div>
            </div>
          )}
        </Body>
        {preview && <PreviewSheet preview={preview} onClose={() => setPreview(null)} t={t} />}
      </>
    )
  }

  // Step one of tailoring: the posting. The style picker is step two, and only
  // then does a credit get spent.
  if (nav.screen === 'tailor') {
    return (
      <>
        <ScreenHead title={t.tailorTitle} onBack={nav.back} backLabel={t.back} right={t.stepOf} />
        <Body screen={nav.screen}>
          <div className="step">{t.theJob}</div>
          <textarea
            className="tall"
            rows={6}
            placeholder={t.pasteJobPlaceholder}
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
          />
          <div className="opt">
            <div className="opt-l">{t.anythingToAdd} <span className="opt-o">{t.optionalLabel}</span></div>
            <textarea
              rows={2}
              placeholder={t.tailorNotePlaceholder}
              value={tailorNote}
              onChange={(e) => setTailorNote(e.target.value)}
            />
            <div className="opt-h">{t.tailorNoteHint}</div>
          </div>
          {!hasProfile && <p className="microhint">{t.fillProfileHint}</p>}
          <button
            className="primary big"
            disabled={!!busyStep || !hasProfile || jobText.trim().length < 80}
            onClick={() => setPicking('tailor')}
          >
            {busyStep ? t.working : t.nextPickStyle}
            {!busyStep && <span className="cost onbtn">{t.oneCredit}</span>}
          </button>
          {busyStep && <p className="progress">{busyStep}</p>}
          {err && <p className="error">{err}</p>}
          {picking && <TemplatePicker profile={profile} onPick={onPickTemplate} onCancel={() => setPicking(null)} />}
        </Body>
      </>
    )
  }

  return (
    <>
      <TopBar title={t.title} />
      <Body screen={nav.screen}>
        <button className="primary big" onClick={() => setSheetOpen(true)} disabled={!!busyStep}>
          <Icon name="plus" /> {busyStep ? t.working : t.newCv}
        </button>
        <p className="lede">{t.hint}</p>
        {busyStep && <p className="progress">{busyStep}</p>}
        {err && <p className="error">{err}</p>}

        {resumes.length === 0 && <div className="empty">{t.emptyList}</div>}
        {resumes.length > 0 && (
          <div className="cvs">
            {resumes.map((r) => (
              <div key={r.id} className={`cv-item ${r.isDefault ? 'star' : ''}`}>
                <div className="cv-head">
                  <span className="cv-label">{r.label}</span>
                  {r.isDefault && <span className="pill good">{t.defaultChip}</span>}
                  {r.source === 'uploaded' && !r.isDefault && <span className="pill flat">{t.fromUploadTitle}</span>}
                </div>
                {r.tags.length > 0 && (
                  <div className="cv-tags">
                    {r.tags.slice(0, 3).map((tag) => <span key={tag} className="minichip">{tag}</span>)}
                  </div>
                )}
                <div className="cv-actions">
                  <button className="link" onClick={() => void openPreview(r)}>{t.previewLabel}</button>
                  <button className="link" onClick={() => download(r)}>{t.pdf}</button>
                  {r.content && <button className="link" onClick={() => setEditingCv(r.id)}>{t.contentsLabel}</button>}
                  {!r.isDefault && <button className="link" onClick={() => makeDefault(r.id)}>{t.makeDefault}</button>}
                  <button className="link muted" onClick={() => setDeleting(r.id)}>{t.deleteLabel}</button>
                </div>
              </div>
            ))}
          </div>
        )}

      </Body>

      {/* One button, then the question — so nobody spends a credit by accident. */}
      {sheetOpen && (
        <Sheet
          title={t.newCv}
          sub={t.newCvWhere}
          closeLabel={t.cancel}
          onClose={() => setSheetOpen(false)}
        >
          <button className="bigchoice" onClick={() => { setSheetOpen(false); nav.push('tailor') }}>
            <span className="bc-t">{t.fromJobTitle} <span className="cost">{t.oneCredit}</span></span>
            <span className="bc-s">{t.fromJobSub}</span>
          </button>
          <button
            className="bigchoice"
            disabled={!hasProfile}
            onClick={() => { setSheetOpen(false); setPicking('master') }}
          >
            <span className="bc-t">{t.fromProfileTitle} <span className="cost free">{t.freeLabel}</span></span>
            <span className="bc-s">{hasProfile ? t.fromProfileSub : t.fillProfileHint}</span>
          </button>
          <button className="bigchoice" onClick={() => { setSheetOpen(false); fileRef.current?.click() }}>
            <span className="bc-t">{t.fromUploadTitle} <span className="cost free">{t.freeLabel}</span></span>
            <span className="bc-s">{t.fromUploadSub}</span>
          </button>
        </Sheet>
      )}

      {deleting && (
        <Sheet
          title={t.removeCvTitle}
          sub={t.removeCvWarning}
          closeLabel={t.cancel}
          onClose={() => setDeleting(null)}
        >
          <button
            className="destructive wide"
            onClick={() => {
              removeResume(deleting)
              setDeleting(null)
            }}
          >
            {t.deleteLabel}
          </button>
        </Sheet>
      )}

      {hiddenFileInput}
      {picking && <TemplatePicker profile={profile} onPick={onPickTemplate} onCancel={() => setPicking(null)} />}

      {editingCv && (() => {
        const r = resumes.find((x) => x.id === editingCv)
        return r?.content ? <ContentsEditor r={r} profile={profile} onClose={() => setEditingCv(null)} /> : null
      })()}

      {preview && <PreviewSheet preview={preview} onClose={() => setPreview(null)} t={t} />}
    </>
  )
}

/** Rendered pages of a stored CV — what you preview is exactly what gets sent. */
function PreviewSheet({
  preview,
  onClose,
  t,
}: {
  preview: { label: string; pages: string[] }
  onClose: () => void
  t: tMerged<'resumes'>
}) {
  return (
    <div className="tpl-overlay" onClick={onClose}>
      <div className="pv-sheet" onClick={(e) => e.stopPropagation()}>
        <h3>{preview.label}</h3>
        {preview.pages.length === 0 && <p className="progress">{t.working}</p>}
        {preview.pages.map((p, i) => (
          <img key={i} src={p} alt="" />
        ))}
        <button className="ghost wide" onClick={onClose}>{t.done}</button>
      </div>
    </div>
  )
}

function TemplatePicker({
  profile,
  onPick,
  onCancel,
}: {
  profile: Profile
  onPick: (id: string) => void
  onCancel: () => void
}) {
  const t = useContent('resumes')
  const [tag, setTag] = useState<TemplateTag | null>(null)
  // Rendered previews live as long as the picker does — filter clicks reuse them.
  const cache = useRef(new Map<string, string>())
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
        <p className="lede">{t.pickStyleHint}</p>
        <div className="filters">
          <button className={`fchip ${tag === null ? 'on' : ''}`} onClick={() => setTag(null)}>{t.allStyles}</button>
          {ALL_TAGS.map((tg) => (
            <button key={tg} className={`fchip ${tag === tg ? 'on' : ''}`} onClick={() => setTag(tg)}>
              {tagLabel[tg]}
            </button>
          ))}
        </div>
        <div className="tpl-grid">
          {shown.map((tpl) => (
            <button key={tpl.id} className="tpl-card" onClick={() => onPick(tpl.id)}>
              <PdfThumb tpl={tpl} profile={profile} cache={cache.current} />
              <span className="tpl-name">{styleName(t, tpl.id)}</span>
              <span className="tpl-for">{tpl.tags.slice(0, 2).map((tg) => tagLabel[tg]).join(' · ')}</span>
            </button>
          ))}
        </div>
        <button className="ghost wide" onClick={onCancel}>{t.cancel}</button>
      </div>
    </div>
  )
}

/**
 * "What this CV shows": tick work entries and skills in or out. Content only
 * ever comes from the profile; every toggle re-renders the PDF locally —
 * free and instant, no AI involved.
 */
function ContentsEditor({ r, profile, onClose }: { r: ResumeVariant; profile: Profile; onClose: () => void }) {
  const t = useContent('resumes')
  const content = r.content!
  const skillOn = (name: string) => content.skills.some((s) => s.toLowerCase() === name.toLowerCase())
  // Profile skills first, plus any content-only skills (e.g. added via note).
  const allSkills = [
    ...profile.skills.map((s) => s.name),
    ...content.skills.filter((s) => !profile.skills.some((p) => p.name.toLowerCase() === s.toLowerCase())),
  ]

  const apply = (next: NonNullable<ResumeVariant['content']>) => {
    const base64 = renderResumePdf(profile, next, r.templateId)
    void store.update('resumes', (list) =>
      list.map((x) => (x.id === r.id ? { ...x, content: next, dataBase64: base64 } : x)),
    )
  }

  const toggleWork = (workId: string) => {
    const included = content.work.some((w) => w.sourceId === workId)
    if (included && content.work.length === 1) return // a CV needs at least one job
    let work
    if (included) {
      work = content.work.filter((w) => w.sourceId !== workId)
    } else {
      const order = new Map(profile.work.map((w, i) => [w.id, i]))
      const src = profile.work.find((w) => w.id === workId)
      if (!src) return
      work = [...content.work, { sourceId: workId, bullets: src.highlights }].sort(
        (a, b) => (order.get(a.sourceId) ?? 99) - (order.get(b.sourceId) ?? 99),
      )
    }
    apply({ ...content, work })
  }

  const toggleSkill = (name: string) => {
    const skills = skillOn(name)
      ? content.skills.filter((s) => s.toLowerCase() !== name.toLowerCase())
      : [...content.skills, name]
    apply({ ...content, skills })
  }

  return (
    <div className="tpl-overlay" onClick={onClose}>
      <div className="pv-sheet" onClick={(e) => e.stopPropagation()}>
        <h3>{r.label}</h3>
        <p className="microhint" style={{ margin: '0 0 10px' }}>{t.contentsHint}</p>
        <div className="ct-h">{t.contentsWork}</div>
        {profile.work.map((w) => {
          const on = content.work.some((x) => x.sourceId === w.id)
          return (
            <label key={w.id} className="ct-row">
              <input
                type="checkbox"
                checked={on}
                disabled={on && content.work.length === 1}
                onChange={() => toggleWork(w.id)}
              />
              <span>{w.title}{w.company ? ` · ${w.company}` : ''}</span>
            </label>
          )
        })}
        <div className="ct-h" style={{ marginTop: 12 }}>{t.contentsSkills}</div>
        <div className="ct-skills">
          {allSkills.map((name) => (
            <label key={name} className="ct-row">
              <input type="checkbox" checked={skillOn(name)} onChange={() => toggleSkill(name)} />
              <span>{name}</span>
            </label>
          ))}
        </div>
        <div className="spacer" />
        <button className="ghost small" onClick={onClose}>{t.done}</button>
      </div>
    </div>
  )
}

/** Live preview: the user's OWN profile rendered by the real PDF engine. */
function PdfThumb({
  tpl,
  profile,
  cache,
}: {
  tpl: ResumeTemplate
  profile: Profile
  cache: Map<string, string>
}) {
  const [src, setSrc] = useState(cache.get(tpl.id) ?? '')

  useEffect(() => {
    if (cache.has(tpl.id)) return
    let alive = true
    void (async () => {
      try {
        const b64 = renderResumePdf(profile, masterVariant(profile), tpl.id)
        const url = await renderPdfThumbnail(base64ToBytes(b64), 560)
        if (!alive) return
        cache.set(tpl.id, url)
        setSrc(url)
      } catch {
        // Preview failure is cosmetic — the card stays pickable.
      }
    })()
    return () => {
      alive = false
    }
  }, [tpl.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="tpl-thumb">{src && <img src={src} alt="" />}</div>
}
