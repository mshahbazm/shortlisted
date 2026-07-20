// Profile.
//
// The root screen SHOWS the profile rather than listing doors to it: a strength
// meter with tappable gaps, the composer, what employers ask, and then every
// band of real data rendered in place. Editing happens on pushed screens, so
// nothing here is hidden behind a disclosure triangle — a profile screen that
// hides the profile is just a menu.

import { useEffect, useRef, useState } from 'react'
import { useStore } from '../hooks'
import { useContent } from '../../i18n'
import { KV } from '../components'
import { Body, Composer, Icon, Row, ScreenHead, TopBar, useStack } from '../ui'
import { QuestionsTab } from './QuestionsTab'
import {
  EducationEntry,
  LanguageEntry,
  LanguageProficiency,
  Profile,
  WorkEntry,
  parseYm,
  skillNames,
  uid,
  ymString,
  workPeriodLabel,
} from '../../lib/types'
import { cloudParseResumePdf, cloudProfileNote, runExtractProfile } from '../../ai/run'
import * as store from '../../lib/store'
import { Gap, GapKey, profileStrength } from '../../lib/profileStrength'
import { mergeIntakeFacts, needsCompletion } from '../../lib/profileMerge'
import { showToast } from '../toast'

type T = ReturnType<typeof useContent<'profile'>>

export function ProfileTab({
  focusTellMe = false,
  onOpenSettings,
}: {
  focusTellMe?: boolean
  onOpenSettings: () => void
}) {
  const t = useContent('profile')
  const nav = useStack()
  const [seg, setSeg] = useState<'profile' | 'bank' | 'pending'>('profile')
  const [profile, saveProfileRaw, loaded] = useStore('profile')
  const [settings] = useStore('settings')
  const [bank] = useStore('answerBank')
  const [pending] = useStore('pendingQuestions')

  const p = profile

  // Arriving via "Update profile" on a fit report: the composer is the thing
  // they were sent here to use, so put the cursor in it.
  const composerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!focusTellMe || !loaded) return
    const id = window.setTimeout(() => {
      composerRef.current?.querySelector('input')?.focus()
    }, 150)
    return () => window.clearTimeout(id)
  }, [focusTellMe, loaded])

  if (!loaded) return null

  // Every edit persists immediately; the toast is the receipt. Patches merge
  // into the LIVE profile via store.update so a background write (CV intake
  // adding skills, cloud pull) landing mid-edit is never clobbered.
  const set = (patch: Partial<Profile>) => {
    void store.update('profile', (cur) => ({ ...cur, ...patch }))
    showToast(t.savedToast)
  }
  // Full replace — only the re-import flow, where replacing IS the intent.
  const save = (v: Profile) => {
    saveProfileRaw(v)
    showToast(t.savedToast)
  }

  const name = [p.identity.firstName, p.identity.lastName].filter(Boolean).join(' ')
  const { percent, gaps } = profileStrength(p)
  const factsFilled = Object.values(p.facts).filter((v) => v && String(v).trim()).length

  /* ---------- pushed screens ---------- */

  if (nav.screen === 'about') {
    return (
      <Pushed title={t.aboutYou} nav={nav} t={t}>
        <AboutEditor p={p} set={set} t={t} />
      </Pushed>
    )
  }

  // One entry, not the whole list. The profile screen already shows every role;
  // opening one from there should land on that one, editable — not on a second
  // copy of the list where every row can expand.
  if (nav.screen.startsWith('work:')) {
    const id = nav.screen.slice(5)
    const entry = p.work.find((w) => w.id === id)
    if (!entry) return <Pushed title={t.workTitle} nav={nav} t={t}><div className="empty">{t.nothingYet}</div></Pushed>
    return (
      <Pushed title={entry.title || t.newRole} nav={nav} t={t}>
        <WorkEditor
          entry={entry}
          onChange={(next) => set({ work: p.work.map((x) => (x.id === id ? next : x)) })}
          onRemove={() => {
            set({ work: p.work.filter((x) => x.id !== id) })
            nav.back()
          }}
        />
      </Pushed>
    )
  }

  if (nav.screen.startsWith('education:')) {
    const id = nav.screen.slice(10)
    const entry = p.education.find((e) => e.id === id)
    if (!entry) return <Pushed title={t.educationTitle} nav={nav} t={t}><div className="empty">{t.nothingYet}</div></Pushed>
    return (
      <Pushed title={entry.degree || t.newEducation} nav={nav} t={t}>
        <EduEditor
          entry={entry}
          onChange={(next) => set({ education: p.education.map((x) => (x.id === id ? next : x)) })}
          onRemove={() => {
            set({ education: p.education.filter((x) => x.id !== id) })
            nav.back()
          }}
        />
      </Pushed>
    )
  }

  if (nav.screen === 'extras') {
    return (
      <Pushed title={t.extrasTitle} nav={nav} t={t}>
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
            onChange={(e) => set({ certifications: parseCertifications(e.target.value) })}
          /></label>
      </Pushed>
    )
  }

  if (nav.screen === 'links') {
    const setLinks = (k: keyof typeof p.links, v: string) => set({ links: { ...p.links, [k]: v } })
    return (
      <Pushed title={t.linksTitle} nav={nav} t={t}>
        <KV k={t.website} v={p.links.website ?? ''} url invalidHint={t.invalidUrl} onChange={(v) => setLinks('website', v)} />
        <KV k={t.github} v={p.links.github ?? ''} url invalidHint={t.invalidUrl} onChange={(v) => setLinks('github', v)} />
        <KV k={t.linkedin} v={p.links.linkedin ?? ''} url invalidHint={t.invalidUrl} onChange={(v) => setLinks('linkedin', v)} />
        <KV k={t.portfolio} v={p.links.portfolio ?? ''} url invalidHint={t.invalidUrl} onChange={(v) => setLinks('portfolio', v)} />
      </Pushed>
    )
  }

  if (nav.screen === 'facts') {
    const setFacts = (k: keyof typeof p.facts, v: string) => set({ facts: { ...p.facts, [k]: v } })
    return (
      <Pushed title={t.standardAnswersTitle} nav={nav} t={t} right={t.answeredOf(factsFilled, 9)}>
        <p className="lede">{t.standardAnswersHint}</p>
        <KV k={t.salaryExpectation} v={p.facts.salaryExpectation ?? ''} onChange={(v) => setFacts('salaryExpectation', v)} />
        <KV k={t.noticePeriod} v={p.facts.noticePeriod ?? ''} placeholder={t.noticePlaceholder} onChange={(v) => setFacts('noticePeriod', v)} />
        <KV k={t.yearsOfExperience} v={p.facts.yearsOfExperience ?? ''} placeholder={t.yearsPlaceholder} onChange={(v) => setFacts('yearsOfExperience', v)} />
        <KV k={t.timezone} v={p.facts.timezone ?? ''} placeholder={t.timezonePlaceholder} onChange={(v) => setFacts('timezone', v)} />
        <KV k={t.visaSponsorship} v={p.facts.needsSponsorship ?? ''} placeholder={t.visaPlaceholder} onChange={(v) => setFacts('needsSponsorship', v)} />
        <KV k={t.authorizedIn} v={p.facts.authorizedCountries ?? ''} onChange={(v) => setFacts('authorizedCountries', v)} />
        <KV k={t.relocation} v={p.facts.relocation ?? ''} onChange={(v) => setFacts('relocation', v)} />
        <KV k={t.hoursOverlap} v={p.facts.hoursOverlap ?? ''} placeholder={t.hoursPlaceholder} onChange={(v) => setFacts('hoursOverlap', v)} />
        <KV k={t.englishLevel} v={p.facts.englishLevel ?? ''} onChange={(v) => setFacts('englishLevel', v)} />
      </Pushed>
    )
  }

  if (nav.screen === 'reimport') {
    return (
      <Pushed title={t.reimportTitle} nav={nav} t={t}>
        <p className="lede">{t.reimportBody}</p>
        <ImportBox
          cloudPdf={async (file) => {
            const { profile: extracted } = await cloudParseResumePdf(settings, await file.arrayBuffer())
            save({ ...extracted, facts: p.facts })
            nav.back()
          }}
          onImport={async (text) => {
            const extracted = await runExtractProfile(settings, text)
            save({ ...extracted, facts: p.facts })
            nav.back()
          }}
        />
      </Pushed>
    )
  }

  /* ---------- root ---------- */

  const skills = skillNames(p)

  return (
    <>
      <TopBar
        title={t.yourProfile}
        right={
          <button className="iconbtn" onClick={onOpenSettings} aria-label={t.settings}>
            <Icon name="gear" />
          </button>
        }
      />
      <Body screen={`profile-${seg}`}>
        {/* Three jobs, three tabs. The unanswered count lives here and nowhere
            else — it is only actionable on this screen. */}
        <div className="segs">
          <button className={`seg ${seg === 'profile' ? 'on' : ''}`} onClick={() => setSeg('profile')}>
            {t.segProfile}
          </button>
          <button className={`seg ${seg === 'bank' ? 'on' : ''}`} onClick={() => setSeg('bank')}>
            {t.answerBankTitle}{bank.length > 0 ? ` ${bank.length}` : ''}
          </button>
          <button className={`seg ${seg === 'pending' ? 'on' : ''}`} onClick={() => setSeg('pending')}>
            {t.segUnanswered}{pending.length > 0 ? ` ${pending.length}` : ''}
          </button>
        </div>

        {seg === 'bank' && <QuestionsTab view="bank" />}
        {seg === 'pending' && <QuestionsTab view="pending" />}

        {seg === 'profile' && (
          <>
        {/* 1. Where you stand */}
        <div className="ident">
          <div className="ident-n">{name || t.yourProfile}</div>
          <div className="ident-h">{p.headline || t.hint}</div>
        </div>

        <div className="meter">
          <div className="meter-top">
            <span>{t.strengthTitle}</span>
            <b>{percent}%</b>
          </div>
          <div className="meter-bar"><i style={{ width: `${percent}%` }} /></div>
          {gaps.length > 0 && (
            <div className="meter-gaps">
              {gaps.map((g) => (
                <button key={g.key} className="gapchip" onClick={() => nav.push(gapTarget(g, p))}>
                  {gapLabel(g.key, t)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Add something new — high up, where it invites action */}
        <div ref={composerRef}>
          <TellMe t={t} settings={settings} />
        </div>

        {/* 3. What employers ask — profile data, so it lives here, not in a tab */}
        <div className="p-sec">
          <div className="p-sec-h"><span>{t.whatEmployersAsk}</span></div>
          <div className="rows nav">
            <Row
              title={t.standardAnswersTitle}
              sub={t.standardAnswersSub}
              warn={factsFilled < 5}
              right={<span className={`cnt ${factsFilled < 5 ? 'warn' : ''}`}>{t.answeredOf(factsFilled, 9)}</span>}
              onClick={() => nav.push('facts')}
            />
          </div>
        </div>

        {/* 4. The profile itself, rendered */}
        <Band title={t.aboutYou} onEdit={() => nav.push('about')} icon="pen" />
        <div className="facts">
          {p.identity.email && <Fact k={t.email} v={p.identity.email} />}
          {p.identity.phone && <Fact k={t.phone} v={p.identity.phone} />}
          {p.identity.location && <Fact k={t.location} v={p.identity.location} />}
          {p.industries.length > 0 && <Fact k={t.industries} v={p.industries.join(', ')} />}
        </div>
        {p.summary && <p className="summary">{p.summary}</p>}

        {p.highlights.length > 0 && (
          <>
            <Band title={t.careerHighlights} count={`${p.highlights.length} / 3`} onEdit={() => nav.push('extras')} icon="pen" />
            <ul className="hl">
              {p.highlights.map((h, i) => <li key={i}>{h}</li>)}
            </ul>
          </>
        )}

        <Band
          title={t.workTitle}
          addLabel={t.addRoleShort}
          onAdd={() => {
            const entry = { id: uid(), company: '', title: '', isCurrent: true, skills: [], highlights: [] }
            set({ work: [entry, ...p.work] })
            nav.push(`work:${entry.id}`)
          }}
        />
        {p.work.length === 0 ? (
          <div className="empty">{t.nothingYet}</div>
        ) : (
          <div className="tline">
            {p.work.map((w) => {
              const incomplete = needsCompletion(w)
              return (
                <button key={w.id} className={`tl-item ${incomplete ? 'bad' : ''}`} onClick={() => nav.push(`work:${w.id}`)}>
                  <span className={`tl-dot ${incomplete ? 'warn' : w.isCurrent ? 'now' : ''}`} />
                  <span className="tl-body">
                    <span className={`tl-when ${incomplete ? 'missing' : ''}`}>
                      {incomplete ? t.workNeedsDetail : workPeriodLabel(w) || '—'}
                    </span>
                    <span className="tl-t">{w.title || t.untitled}</span>
                    <span className="tl-c">{w.company || '—'}</span>
                    {w.skills.length > 0 && (
                      <span className="tl-tags">
                        {w.skills.slice(0, 3).map((s) => <span key={s} className="minichip">{s}</span>)}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <Band
          title={t.educationTitle}
          addLabel={t.addEducationShort}
          onAdd={() => {
            const entry = { id: uid(), school: '', degree: '' }
            set({ education: [...p.education, entry] })
            nav.push(`education:${entry.id}`)
          }}
        />
        {p.education.length === 0 ? (
          <div className="empty">{t.nothingYet}</div>
        ) : (
          p.education.map((e) => (
            <button key={e.id} className="edu" onClick={() => nav.push(`education:${e.id}`)}>
              <span className="edu-t">{[e.degree, e.fieldOfStudy].filter(Boolean).join(', ') || e.school}</span>
              <span className="edu-c">
                {[e.school, [e.startYear, e.endYear].filter(Boolean).join(' — ')].filter(Boolean).join(' · ')}
              </span>
            </button>
          ))
        )}

        {skills.length > 0 && (
          <>
            <Band title={t.skillsTitle} count={String(skills.length)} onEdit={() => nav.push('about')} icon="pen" />
            <div className="chipwrap">
              {skills.slice(0, 12).map((s) => <span key={s} className="minichip">{s}</span>)}
              {skills.length > 12 && (
                <button className="minichip more" onClick={() => nav.push('about')}>
                  +{skills.length - 12} {t.moreCount}
                </button>
              )}
            </div>
          </>
        )}

        {p.languages.length > 0 && (
          <>
            <Band title={t.languagesTitle} onEdit={() => nav.push('extras')} icon="pen" />
            <div className="facts">
              {p.languages.map((l) => (
                <Fact key={l.langCode + l.name} k={l.name} v={l.proficiency.replaceAll('_', ' ')} />
              ))}
            </div>
          </>
        )}

        {p.certifications.length > 0 && (
          <>
            <Band title={t.certificationsTitle} onEdit={() => nav.push('extras')} icon="pen" />
            <div className="facts">
              {p.certifications.map((c, i) => (
                <Fact key={i} k={c.name} v={[c.issuingOrganization, c.year].filter(Boolean).join(' · ')} />
              ))}
            </div>
          </>
        )}

        <Band title={t.linksTitle} onEdit={() => nav.push('links')} icon="pen" />
        {Object.values(p.links).filter(Boolean).length === 0 ? (
          <div className="empty">{t.nothingYet}</div>
        ) : (
          <div className="chipwrap">
            {Object.values(p.links).filter(Boolean).map((l) => (
              <span key={l} className="linkchip">{prettyLink(l)}</span>
            ))}
          </div>
        )}

        {/* 5. Re-import last: a destructive rebuild belongs at the bottom */}
        <div className="reimport">
          <div className="ri-t">{t.reimportTitle}</div>
          <div className="ri-s">{t.reimportBody}</div>
          <button className="ghost small wide" onClick={() => nav.push('reimport')}>
            <Icon name="up" /> {t.reimportTitle}
          </button>
          <div className="ri-c">
            <span className="cost">{t.oneCredit}</span> {t.reimportReplaces}
          </div>
        </div>
          </>
        )}
      </Body>
    </>
  )
}

/* ---------- shared pieces ---------- */

function Pushed({
  title,
  nav,
  t,
  right,
  children,
}: {
  title: string
  nav: ReturnType<typeof useStack>
  t: T
  right?: string
  children: React.ReactNode
}) {
  return (
    <>
      <ScreenHead title={title} onBack={nav.back} backLabel={t.back} right={right} />
      <Body screen={nav.screen}>{children}</Body>
    </>
  )
}

function Band({
  title,
  count,
  onEdit,
  onAdd,
  addLabel,
  icon = 'pen',
}: {
  title: string
  count?: string
  onEdit?: () => void
  /** Bands that are a list of entries add to the list from here, rather than
   *  opening a separate screen that repeats what is already on this one. */
  onAdd?: () => void
  addLabel?: string
  icon?: 'pen' | 'chev'
}) {
  return (
    <div className="band-h">
      <span>{title}</span>
      {count && <span className="band-n">{count}</span>}
      {onAdd && (
        <button className="editbtn" onClick={onAdd} aria-label={addLabel ?? title}>
          <Icon name="plus" />
        </button>
      )}
      {onEdit && (
        <button className="editbtn" onClick={onEdit} aria-label={title}>
          <Icon name={icon} />
        </button>
      )}
    </div>
  )
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="fact">
      <span className="f-k">{k}</span>
      <span className="f-v">{v}</span>
    </div>
  )
}

function gapLabel(key: GapKey, t: T): string {
  switch (key) {
    case 'name': return t.gapName
    case 'contact': return t.gapContact
    case 'headline': return t.gapHeadline
    case 'workDates': return t.gapWorkDates
    case 'workHighlights': return t.gapWorkHighlights
    case 'education': return t.gapEducation
    case 'skills': return t.gapSkills
    case 'answers': return t.gapAnswers
  }
}

function prettyLink(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Free words in, filed into the right profile slots. Reports what the merge
 *  actually stored, never what the model proposed: a highlight for a job that
 *  isn't on file has nowhere to go, and claiming it saved is how a fact appears
 *  to vanish. */
function TellMe({ t, settings }: { t: T; settings: Parameters<typeof cloudProfileNote>[0] }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  return (
    <>
      <Composer
        accent
        label={t.tellMeTitle}
        placeholder={t.tellMePlaceholder}
        hint={t.tellMeSummary}
        submitLabel={t.tellMeButton}
        busy={busy}
        onSubmit={(text) => {
          setBusy(true)
          setMsg('')
          void cloudProfileNote(settings, text)
            .then(async (facts) => {
              let applied = 0
              let unplaced = 0
              let incomplete: string[] = []
              await store.update('profile', (cur) => {
                const r = mergeIntakeFacts(cur, facts)
                applied = r.applied
                unplaced = r.unplacedHighlights
                incomplete = r.incompleteWork
                return r.profile
              })
              if (applied === 0) {
                setMsg(unplaced > 0 ? t.tellMeNoSuchJob : t.tellMeNothing)
                return
              }
              // A job created from a sentence usually lacks a title or dates.
              // Say so here rather than letting it look finished.
              const parts = [t.tellMeAdded(applied)]
              if (incomplete.length) parts.push(t.tellMeFinishJob(incomplete.join(', ')))
              else if (unplaced > 0) parts.push(t.tellMeNoSuchJob)
              setMsg(parts.join(' '))
              showToast(t.savedToast)
            })
            .catch((e) => setMsg(e instanceof Error ? e.message : String(e)))
            .finally(() => setBusy(false))
        }}
      />
      {msg && <p className="microhint">{msg}</p>}
    </>
  )
}

function AboutEditor({ p, set, t }: { p: Profile; set: (patch: Partial<Profile>) => void; t: T }) {
  const setIdentity = (k: keyof typeof p.identity, v: string) => set({ identity: { ...p.identity, [k]: v } })
  return (
    <>
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
    </>
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

function parseCertifications(text: string) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [name, issuer, year] = l.split('—').map((s) => s.trim())
    return {
      name: name ?? l,
      issuingOrganization: issuer || undefined,
      year: year ? Number(year) || undefined : undefined,
    }
  })
}

/** Every field of one role, always open. This used to be a collapsible row in
 *  a list of rows, which is why opening one appeared to open them all. */
function WorkEditor({
  entry,
  onChange,
  onRemove,
}: {
  entry: WorkEntry
  onChange: (w: WorkEntry) => void
  onRemove: () => void
}) {
  const t = useContent('profile')
  const incomplete = needsCompletion(entry)

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
    <>
      {incomplete && <div className="ec-warn">{t.workNeedsDetail}</div>}
      <div className="field-row">
        <label className="fl">{t.roleTitle}
          <input className="fin" type="text" autoFocus={!entry.title} value={entry.title}
            onChange={(e) => onChange({ ...entry, title: e.target.value })} /></label>
        <label className="fl">{t.company}
          <input className="fin" type="text" value={entry.company}
            onChange={(e) => onChange({ ...entry, company: e.target.value })} /></label>
      </div>
      <div className="field-row">
        <label className="fl">{t.fromYm}
          <input className="fin" type="text" placeholder="2021-03"
            defaultValue={ymString(entry.startYear, entry.startMonth)} onBlur={(e) => setStart(e.target.value)} /></label>
        <label className="fl">{t.toYm}
          <input className="fin" type="text"
            defaultValue={entry.isCurrent ? '' : ymString(entry.endYear, entry.endMonth)}
            onBlur={(e) => setEnd(e.target.value)} /></label>
      </div>
      <label className="fl">{t.techUsed}
        <input className="fin" type="text" value={entry.skills.join(', ')}
          onChange={(e) => onChange({ ...entry, skills: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></label>
      <label className="fl">{t.workHighlights}
        <textarea rows={5} value={entry.highlights.join('\n')}
          onChange={(e) => onChange({ ...entry, highlights: e.target.value.split('\n').filter((l) => l.trim()) })} /></label>
      <button className="plain wide danger" onClick={onRemove}>{t.remove}</button>
    </>
  )
}

function EduEditor({
  entry,
  onChange,
  onRemove,
}: {
  entry: EducationEntry
  onChange: (e: EducationEntry) => void
  onRemove: () => void
}) {
  const t = useContent('profile')
  return (
    <>
      <div className="field-row">
        <label className="fl">{t.degree}
          <input className="fin" type="text" autoFocus={!entry.degree} value={entry.degree}
            onChange={(e) => onChange({ ...entry, degree: e.target.value })} /></label>
        <label className="fl">{t.fieldOfStudy}
          <input className="fin" type="text" value={entry.fieldOfStudy ?? ''}
            onChange={(e) => onChange({ ...entry, fieldOfStudy: e.target.value })} /></label>
      </div>
      <label className="fl">{t.school}
        <input className="fin" type="text" value={entry.school}
          onChange={(e) => onChange({ ...entry, school: e.target.value })} /></label>
      <div className="field-row">
        <label className="fl">{t.fromYear}
          <input className="fin" type="text" defaultValue={entry.startYear ?? ''}
            onBlur={(e) => onChange({ ...entry, startYear: Number(e.target.value) || undefined })} /></label>
        <label className="fl">{t.toYear}
          <input className="fin" type="text" defaultValue={entry.endYear ?? ''}
            onBlur={(e) => onChange({ ...entry, endYear: Number(e.target.value) || undefined })} /></label>
      </div>
      <button className="plain wide danger" onClick={onRemove}>{t.remove}</button>
    </>
  )
}

/** Where a strength gap should take you. Most name a screen outright; the two
 *  work gaps have to resolve to a specific role, since there is no list screen
 *  to land on any more. */
function gapTarget(gap: Gap, p: Profile): string {
  if (gap.screen !== 'work') return gap.screen
  const offender = p.work.find((w) => needsCompletion(w)) ?? p.work[0]
  return offender ? `work:${offender.id}` : 'about'
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
      <button className="ghost wide" disabled={busy} onClick={() => fileRef.current?.click()}>
        <Icon name="up" /> {busy ? t.readingPdf : t.uploadPdf}
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
      <button
        className="primary wide"
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
        {!busy && <span className="cost onbtn">{t.oneCredit}</span>}
      </button>
      {err && <p className="error">{err}</p>}
    </>
  )
}
