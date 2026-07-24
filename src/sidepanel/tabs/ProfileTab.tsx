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
import { cn } from '../../lib/cn'
import { KV } from '../components'
import { Bar, BigChoice, Body, Button, Card, Chip, ChipInput, Composer, Cost, Count, Icon, IconButton, Input, Label, ListEditor, RemoveButton, Row, ScreenHead, Segments, Select, Sheet, Textarea, TopBar, useStack } from '../ui'
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
import { cloudImportResume, cloudProfileNote, cloudUploadPicture } from '../../ai/run'
import { fileToDataUrl, fileToProfilePhoto } from '../../lib/image'
import * as store from '../../lib/store'
import { Gap, GapKey, profileStrength } from '../../lib/profileStrength'
import { mergeEnrichment, needsCompletion } from '../../lib/profileMerge'
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
  /** Band to scroll back to once we're on the root screen again. */
  const [restore, setRestore] = useState('')
  /** Re-import flow: chosen door, and the parsed/merged profile awaiting the
   *  user's confirm on the review screen (nothing is saved until they accept). */
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge')
  const [importResult, setImportResult] = useState<Profile | null>(null)
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

  // Body resets scroll to the top whenever the screen changes, which is right
  // for going INTO a screen and wrong for coming back out of one. Child
  // effects run before parent effects, so this lands after that reset.
  useEffect(() => {
    if (!restore || nav.screen !== 'root') return
    document.getElementById(`band-${restore}`)?.scrollIntoView({ block: 'start' })
    setRestore('')
  }, [restore, nav.screen])

  if (!loaded) return null

  const leaveTo = (band: string) => {
    setRestore(band)
    nav.back()
  }

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
    const backToBand = () => leaveTo('work')
    const entry = p.work.find((w) => w.id === id)
    if (!entry) return <Pushed title={t.workTitle} nav={nav} t={t}><div className="px-3 py-[26px] text-center text-[13px] text-faint">{t.nothingYet}</div></Pushed>
    return (
      <Pushed title={entry.title || t.newRole} nav={nav} t={t} onBack={backToBand}>
        <WorkEditor
          entry={entry}
          onChange={(next) => set({ work: p.work.map((x) => (x.id === id ? next : x)) })}
          onRemove={() => {
            set({ work: p.work.filter((x) => x.id !== id) })
            leaveTo('work')
          }}
        />
      </Pushed>
    )
  }

  if (nav.screen.startsWith('education:')) {
    const id = nav.screen.slice(10)
    const backToBand = () => leaveTo('education')
    const entry = p.education.find((e) => e.id === id)
    if (!entry) return <Pushed title={t.educationTitle} nav={nav} t={t}><div className="px-3 py-[26px] text-center text-[13px] text-faint">{t.nothingYet}</div></Pushed>
    return (
      <Pushed title={entry.degree || t.newEducation} nav={nav} t={t} onBack={backToBand}>
        <EduEditor
          entry={entry}
          onChange={(next) => set({ education: p.education.map((x) => (x.id === id ? next : x)) })}
          onRemove={() => {
            set({ education: p.education.filter((x) => x.id !== id) })
            leaveTo('education')
          }}
        />
      </Pushed>
    )
  }

  // One screen per section. A band's pencil edits that band and nothing else —
  // sending Skills into "About you" made the user hunt for what they tapped.
  if (nav.screen === 'skills') {
    return (
      <Pushed title={t.skillsTitle} nav={nav} t={t} right={String(skillNames(p).length)}>
        <ChipInput
          items={skillNames(p)}
          placeholder={t.skillPlaceholder}
          removeLabel={t.removeItem}
          onChange={(names) => {
            // Keep proficiency/category on skills that survive the edit.
            const byName = new Map(p.skills.map((x) => [x.name.toLowerCase(), x]))
            set({ skills: names.map((n) => byName.get(n.toLowerCase()) ?? { name: n }) })
          }}
        />
      </Pushed>
    )
  }

  if (nav.screen === 'highlights') {
    return (
      <Pushed title={t.careerHighlights} nav={nav} t={t} right={`${p.highlights.length} / 3`}>
        <ListEditor
          items={p.highlights}
          onChange={(v) => set({ highlights: v.slice(0, 3) })}
          placeholder={t.highlightPlaceholder}
          addLabel={t.addHighlight}
          removeLabel={t.removeItem}
          max={3}
        />
      </Pushed>
    )
  }

  if (nav.screen === 'languages') {
    return (
      <Pushed title={t.languagesTitle} nav={nav} t={t}>
        {p.languages.map((l, i) => (
          <div key={i} className="flex items-start gap-1.5 border-b border-line pb-2.5 last:border-b-0">
            <div className="flex min-w-0 flex-1 flex-row items-center gap-1.5">
              <Input
                type="text" value={l.name} placeholder={t.languageName}
                onChange={(e) => set({
                  languages: p.languages.map((x, j) => (j === i
                    ? { ...x, name: e.target.value, langCode: e.target.value.slice(0, 2).toLowerCase() }
                    : x)),
                })}
              />
              <Select
                value={l.proficiency}
                onChange={(v) =>
                  set({
                    languages: p.languages.map((x, j) => (j === i ? { ...x, proficiency: v } : x)),
                  })
                }
                options={LEVELS.map(([value, key]) => ({ value, label: t[key] }))}
              />
            </div>
            <RemoveButton
              label={t.removeItem}
              onClick={() => set({ languages: p.languages.filter((_, j) => j !== i) })}
            />
          </div>
        ))}
        <Button variant="ghost" wide size="sm" onClick={() => set({
            languages: [...p.languages, { langCode: '', name: '', proficiency: 'professional_working' }],
          })}
        >
          <Icon name="plus" /> {t.addLanguage}
        </Button>
      </Pushed>
    )
  }

  if (nav.screen === 'certifications') {
    return (
      <Pushed title={t.certificationsTitle} nav={nav} t={t}>
        {p.certifications.map((c, i) => {
          const setCert = (patch: Partial<typeof c>) =>
            set({ certifications: p.certifications.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
          return (
            <div key={i} className="flex items-start gap-1.5 border-b border-line pb-2.5 last:border-b-0">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Input type="text" value={c.name} placeholder={t.certName}
                  onChange={(e) => setCert({ name: e.target.value })} />
                <div className="flex gap-2.5 [&>*]:flex-1">
                  <Input type="text" value={c.issuingOrganization ?? ''} placeholder={t.issuer}
                    onChange={(e) => setCert({ issuingOrganization: e.target.value || undefined })} />
                  <Input type="text" inputMode="numeric" value={c.year ?? ''} placeholder={t.yearLabel}
                    onChange={(e) => setCert({ year: Number(e.target.value) || undefined })} />
                </div>
              </div>
              <RemoveButton
                label={t.removeItem}
                onClick={() => set({ certifications: p.certifications.filter((_, j) => j !== i) })}
              />
            </div>
          )
        })}
        <Button variant="ghost" wide size="sm" onClick={() => set({ certifications: [...p.certifications, { name: '' }] })}
        >
          <Icon name="plus" /> {t.addCertification}
        </Button>
      </Pushed>
    )
  }

  if (nav.screen === 'links') {
    const setLinks = (k: keyof typeof p.links, v: string) => set({ links: { ...p.links, [k]: v } })
    const slots: [keyof typeof p.links, string][] = [
      ['website', t.website], ['github', t.github], ['linkedin', t.linkedin], ['portfolio', t.portfolio],
    ]
    return (
      <Pushed title={t.linksTitle} nav={nav} t={t}>
        {/* Fixed slots, so removing one means clearing it — but there was no
            way to do that at all short of selecting the text and deleting. */}
        {slots.map(([key, label]) => (
          <div key={key} className="flex items-center gap-1">
            <KV k={label} v={p.links[key] ?? ''} url invalidHint={t.invalidUrl} onChange={(v) => setLinks(key, v)} />
            {p.links[key] && (
              <RemoveButton label={`${t.clearLink} ${label}`} onClick={() => setLinks(key, '')} />
            )}
          </div>
        ))}
      </Pushed>
    )
  }

  if (nav.screen === 'facts') {
    const setFacts = (k: keyof typeof p.facts, v: string) => set({ facts: { ...p.facts, [k]: v } })
    // Numeric facts: empty clears to undefined; non-numeric input is ignored.
    const setNumFact = (k: keyof typeof p.facts, raw: string) => {
      const n = raw.trim() === '' ? undefined : Number(raw)
      set({ facts: { ...p.facts, [k]: n === undefined || Number.isNaN(n) ? undefined : n } })
    }
    return (
      <Pushed title={t.standardAnswersTitle} nav={nav} t={t} right={t.answeredOf(factsFilled, 10)}>
        <p className="m-0 text-[12.5px] leading-normal text-muted">{t.standardAnswersHint}</p>
        <KV k={t.salaryHourly} numeric v={String(p.facts.salaryHourly ?? '')} onChange={(v) => setNumFact('salaryHourly', v)} />
        <KV k={t.salaryMonthly} numeric v={String(p.facts.salaryMonthly ?? '')} onChange={(v) => setNumFact('salaryMonthly', v)} />
        <KV k={t.noticeDays} numeric v={String(p.facts.noticeDays ?? '')} placeholder={t.noticeDaysHint} onChange={(v) => setNumFact('noticeDays', v)} />
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

  // Re-import, step 1 — the two doors. Replace uses the CV as the whole profile;
  // Learn-more merges it in without losing anything.
  if (nav.screen === 'reimport') {
    return (
      <Pushed title={t.reimportTitle} nav={nav} t={t}>
        <p className="m-0 text-[12.5px] leading-normal text-muted">{t.reimportChooseBody}</p>
        <div className="flex flex-col gap-2.5">
          <BigChoice
            title={t.reimportMergeTitle}
            sub={t.reimportMergeSub}
            right={<Cost>{t.oneCredit}</Cost>}
            onClick={() => { setImportMode('merge'); nav.push('reimport-upload') }}
          />
          <BigChoice
            title={t.reimportReplaceTitle}
            sub={t.reimportReplaceSub}
            right={<Cost>{t.oneCredit}</Cost>}
            onClick={() => { setImportMode('replace'); nav.push('reimport-upload') }}
          />
        </div>
      </Pushed>
    )
  }

  // Step 2 — upload/paste. On success we stash the result and go to review;
  // nothing is saved yet.
  if (nav.screen === 'reimport-upload') {
    return (
      <Pushed title={importMode === 'merge' ? t.reimportMergeTitle : t.reimportReplaceTitle} nav={nav} t={t}>
        <ImportBox
          submitLabel={importMode === 'merge' ? t.reimportMergeButton : t.rebuildProfile}
          cloudPdf={async (file) => {
            const { profile: result } = await cloudImportResume(settings, { mode: importMode, pdf: await file.arrayBuffer() })
            setImportResult(result)
            nav.push('reimport-review')
          }}
          onImport={async (text) => {
            const { profile: result } = await cloudImportResume(settings, { mode: importMode, cvText: text })
            setImportResult(result)
            nav.push('reimport-review')
          }}
        />
      </Pushed>
    )
  }

  // Step 3 — review before anything overwrites the profile. Identity is editable
  // (fix a misparse here); Save applies, Cancel discards and the profile is
  // untouched.
  if (nav.screen === 'reimport-review') {
    const r = importResult
    if (!r) return <Pushed title={t.reimportReviewTitle} nav={nav} t={t}><div className="px-3 py-[26px] text-center text-[13px] text-faint">{t.nothingYet}</div></Pushed>
    const setId = (k: keyof Profile['identity'], v: string) => setImportResult({ ...r, identity: { ...r.identity, [k]: v } })
    const done = () => { setImportResult(null); nav.reset() }
    return (
      <Pushed title={t.reimportReviewTitle} nav={nav} t={t}>
        <p className="m-0 text-[12.5px] leading-normal text-muted">{t.reimportReviewBody(r.work.length, skillNames(r).length)}</p>
        {r.work.length > 0 && (
          <div className="flex flex-col gap-1 rounded-card border border-line bg-bg p-2.5">
            {r.work.map((w) => (
              <div key={w.id} className="truncate text-[12.5px]">
                <span className="font-medium">{w.title || t.untitled}</span>
                {w.company && <span className="text-muted"> · {w.company}</span>}
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2.5 [&>*]:flex-1">
          <Label>{t.firstName}<Input type="text" value={r.identity.firstName ?? ''} onChange={(e) => setId('firstName', e.target.value)} /></Label>
          <Label>{t.lastName}<Input type="text" value={r.identity.lastName ?? ''} onChange={(e) => setId('lastName', e.target.value)} /></Label>
        </div>
        <Label>{t.email}<Input type="text" value={r.identity.email ?? ''} onChange={(e) => setId('email', e.target.value)} /></Label>
        <div className="mt-2 flex flex-col gap-2">
          <Button wide onClick={() => { save({ ...p, ...r, facts: p.facts }); done() }}>{t.reimportConfirm}</Button>
          <Button variant="ghost" wide onClick={done}>{t.cancel}</Button>
        </div>
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
          <IconButton icon="gear" onClick={onOpenSettings} aria-label={t.settings} />
        }
      />
      <Body screen={`profile-${seg}`}>
        {/* Three jobs, three tabs. The unanswered count lives here and nowhere
            else — it is only actionable on this screen. */}
        <Segments
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'profile', label: t.segProfile },
            { value: 'bank', label: t.answerBankTitle + (bank.length ? ` ${bank.length}` : '') },
            { value: 'pending', label: t.segUnanswered + (pending.length ? ` ${pending.length}` : '') },
          ]}
        />

        {seg === 'bank' && <QuestionsTab view="bank" />}
        {seg === 'pending' && <QuestionsTab view="pending" />}

        {seg === 'profile' && (
          <>
        {/* 1. Where you stand */}
        <div className="flex flex-col gap-0.5">
          <div className="text-lg leading-tight font-[650] tracking-[-0.02em]">{name || t.yourProfile}</div>
          <div className="text-[13px] text-muted">{p.headline || t.hint}</div>
        </div>

        <Card>
          <div className="flex justify-between text-[12.5px] text-muted">
            <span>{t.strengthTitle}</span>
            <b>{percent}%</b>
          </div>
          <Bar percent={percent} />
          {gaps.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-1.5">
              {gaps.map((g) => (
                <button key={g.key} className="cursor-pointer rounded-full border-0 bg-warn-bg px-2.5 py-1 text-[11.5px] font-semibold text-warn hover:bg-[#fdf2d8]" onClick={() => nav.push(gapTarget(g, p))}>
                  {gapLabel(g.key, t)}
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* 2. Add something new — high up, where it invites action */}
        <div ref={composerRef}>
          <TellMe t={t} settings={settings} />
        </div>

        {/* 3. What employers ask — profile data, so it lives here, not in a tab */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between text-[11px] font-[650] tracking-[0.07em] text-muted uppercase"><span>{t.whatEmployersAsk}</span></div>
          <div className="overflow-hidden rounded-card border border-line bg-bg">
            <Row
              title={t.standardAnswersTitle}
              sub={t.standardAnswersSub}
              warn={factsFilled < 5}
              right={<Count warn={factsFilled < 5}>{t.answeredOf(factsFilled, 10)}</Count>}
              onClick={() => nav.push('facts')}
            />
          </div>
        </div>

        {/* 4. The profile itself, rendered */}
        <Band title={t.aboutYou} onEdit={() => nav.push('about')} icon="pen" />
        <div className="flex flex-col gap-1.5">
          {p.identity.email && <Fact k={t.email} v={p.identity.email} />}
          {p.identity.phone && <Fact k={t.phone} v={p.identity.phone} />}
          {p.identity.location && <Fact k={t.location} v={p.identity.location} />}
          {p.industries.length > 0 && <Fact k={t.industries} v={p.industries.join(', ')} />}
        </div>
        {p.summary && <p className="m-0 text-[12.5px] leading-[1.55] text-muted">{p.summary}</p>}

        {p.highlights.length > 0 && (
          <>
            <Band title={t.careerHighlights} count={`${p.highlights.length} / 3`} onEdit={() => nav.push('highlights')} icon="pen" />
            <ul className="m-0 flex list-disc flex-col gap-[5px] pl-[17px]">
              {p.highlights.map((h, i) => <li key={i}>{h}</li>)}
            </ul>
          </>
        )}

        <Band
          anchor="work"
          title={t.workTitle}
          addLabel={t.addRoleShort}
          onAdd={() => {
            const entry = { id: uid(), company: '', title: '', isCurrent: true, skills: [], highlights: [] }
            set({ work: [entry, ...p.work] })
            nav.push(`work:${entry.id}`)
          }}
        />
        {p.work.length === 0 ? (
          <div className="px-3 py-[26px] text-center text-[13px] text-faint">{t.nothingYet}</div>
        ) : (
          <div className="flex flex-col">
            {p.work.map((w) => {
              const incomplete = needsCompletion(w)
              return (
                <button key={w.id} className={cn('relative flex w-full cursor-pointer gap-3 border-b border-line py-3 text-left last:border-b-0', incomplete ? 'bg-[#fffdf7] hover:bg-[#fdf9ee]' : 'hover:bg-hover')} onClick={() => nav.push(`work:${w.id}`)}>
                  <span className={cn('mt-[5px] size-[9px] shrink-0 rounded-full', incomplete ? 'bg-warn' : w.isCurrent ? 'bg-accent' : 'bg-[#d4d4cf]')} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={cn('flex items-center text-[11px] font-semibold tracking-[0.03em] tabular-nums', incomplete ? 'text-warn' : 'text-muted')}>
                      {incomplete ? t.workNeedsDetail : workPeriodLabel(w) || '—'}
                    </span>
                    <span className="text-[13.5px] font-[650] tracking-[-0.01em]">{w.title || t.untitled}</span>
                    <span className="text-[12.5px] text-muted">{w.company || '—'}</span>
                    {w.skills.length > 0 && (
                      <span className="mt-[5px] flex flex-wrap gap-[5px]">
                        {w.skills.slice(0, 3).map((s) => <Chip key={s}>{s}</Chip>)}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <Band
          anchor="education"
          title={t.educationTitle}
          addLabel={t.addEducationShort}
          onAdd={() => {
            const entry = { id: uid(), school: '', degree: '' }
            set({ education: [...p.education, entry] })
            nav.push(`education:${entry.id}`)
          }}
        />
        {p.education.length === 0 ? (
          <div className="px-3 py-[26px] text-center text-[13px] text-faint">{t.nothingYet}</div>
        ) : (
          p.education.map((e) => (
            <button key={e.id} className="flex w-full cursor-pointer flex-col gap-0.5 rounded-lg p-1.5 text-left hover:bg-hover" onClick={() => nav.push(`education:${e.id}`)}>
              <span className="text-[13.5px] font-[650]">{[e.degree, e.fieldOfStudy].filter(Boolean).join(', ') || e.school}</span>
              <span className="text-[12.5px] text-muted">
                {[e.school, [e.startYear, e.endYear].filter(Boolean).join(' — ')].filter(Boolean).join(' · ')}
              </span>
            </button>
          ))
        )}

        <Band title={t.skillsTitle} count={String(skills.length)} onEdit={() => nav.push('skills')} icon="pen" />
        {skills.length === 0 ? (
          <div className="px-3 py-[26px] text-center text-[13px] text-faint">{t.nothingYet}</div>
        ) : (
          <div className="flex flex-wrap gap-[5px]">
            {skills.slice(0, 12).map((s) => <Chip key={s}>{s}</Chip>)}
            {skills.length > 12 && (
              <Chip tone="accent" onClick={() => nav.push('skills')}>
                +{skills.length - 12} {t.moreCount}
              </Chip>
            )}
          </div>
        )}

        <Band title={t.languagesTitle} onEdit={() => nav.push('languages')} icon="pen" />
        {p.languages.length === 0 ? (
          <div className="px-3 py-[26px] text-center text-[13px] text-faint">{t.nothingYet}</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {p.languages.map((l, i) => (
              <Fact key={i} k={l.name} v={levelLabel(l.proficiency, t)} />
            ))}
          </div>
        )}

        <Band title={t.certificationsTitle} onEdit={() => nav.push('certifications')} icon="pen" />
        {p.certifications.length === 0 ? (
          <div className="px-3 py-[26px] text-center text-[13px] text-faint">{t.nothingYet}</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {p.certifications.map((c, i) => (
              <Fact key={i} k={c.name} v={[c.issuingOrganization, c.year].filter(Boolean).join(' · ')} />
            ))}
          </div>
        )}

        <Band title={t.linksTitle} onEdit={() => nav.push('links')} icon="pen" />
        {Object.values(p.links).filter(Boolean).length === 0 ? (
          <div className="px-3 py-[26px] text-center text-[13px] text-faint">{t.nothingYet}</div>
        ) : (
          <div className="flex flex-wrap gap-[5px]">
            {Object.values(p.links).filter(Boolean).map((l) => (
              <span key={l} className="max-w-full truncate rounded-[5px] bg-accent-soft px-2 py-[3px] text-[11.5px] text-accent">{prettyLink(l)}</span>
            ))}
          </div>
        )}

        {/* 5. Re-import last: a destructive rebuild belongs at the bottom */}
        <Card className="mt-1.5 gap-[9px] bg-[#fafaf8]">
          <div className="text-[13px] font-[650]">{t.reimportTitle}</div>
          <div className="-mt-1.5 text-[11.5px] leading-[1.45] text-muted">{t.reimportBody}</div>
          <Button variant="ghost" size="sm" wide onClick={() => nav.push('reimport')}>
            <Icon name="up" /> {t.reimportTitle}
          </Button>
          <div className="flex items-center gap-[7px] text-[11.5px] text-faint">
            <Cost>{t.oneCredit}</Cost>
          </div>
        </Card>
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
  onBack,
  children,
}: {
  title: string
  nav: ReturnType<typeof useStack>
  t: T
  right?: string
  /** Overrides plain `back` when leaving should also restore a scroll spot. */
  onBack?: () => void
  children: React.ReactNode
}) {
  return (
    <>
      <ScreenHead title={title} onBack={onBack ?? nav.back} backLabel={t.back} right={right} />
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
  anchor,
  icon = 'pen',
}: {
  title: string
  count?: string
  onEdit?: () => void
  /** Bands that are a list of entries add to the list from here, rather than
   *  opening a separate screen that repeats what is already on this one. */
  onAdd?: () => void
  addLabel?: string
  /** Named so leaving an entry's editor can land back on this band rather
   *  than at the top of a long screen. */
  anchor?: string
  icon?: 'pen' | 'chev'
}) {
  return (
    <div className="mt-0.5 flex items-center gap-2 border-t border-line pt-3.5 text-[11px] font-[650] tracking-[0.07em] text-muted uppercase" id={anchor ? `band-${anchor}` : undefined}>
      <span>{title}</span>
      {count && <span className="ml-auto text-[11.5px] font-semibold text-faint">{count}</span>}
      {onAdd && (
        <IconButton icon="plus" onClick={onAdd} aria-label={addLabel ?? title} className="ml-auto size-[26px] text-faint" />
      )}
      {onEdit && (
        <IconButton icon={icon} onClick={onEdit} aria-label={title} className="ml-auto size-[26px] text-faint" />
      )}
    </div>
  )
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline gap-3 text-[12.5px]">
      <span className="w-[78px] shrink-0 text-faint">{k}</span>
      <span className="min-w-0 truncate text-fg">{v}</span>
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
                const r = mergeEnrichment(cur, facts)
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
      {msg && <p className="mt-1.5 text-xs leading-[1.45] text-faint">{msg}</p>}
    </>
  )
}

function PhotoField({ photo, onChange, t }: { photo?: string; onChange: (v: string) => void; t: T }) {
  const ref = useRef<HTMLInputElement>(null)
  const [settings] = useStore('settings')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  return (
    <div className="flex items-center gap-3 py-1.5">
      {photo ? (
        <img src={photo} alt="" className="size-14 rounded-md border border-line object-cover" />
      ) : (
        <div className="size-14 rounded-md border border-dashed border-line" />
      )}
      <div className="flex flex-col gap-1">
        <div className="text-[11.5px] font-semibold text-muted">{t.photo}</div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" disabled={busy} onClick={() => ref.current?.click()}>
            {busy ? '…' : photo ? t.changePhoto : t.addPhoto}
          </Button>
          {photo && (
            <Button variant="link" onClick={() => onChange('')}>
              {t.remove}
            </Button>
          )}
        </div>
        <div className="text-[10.5px] text-faint">{t.photoHint}</div>
        {err && <div className="text-[10.5px] text-bad">{err}</div>}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          setErr('')
          setBusy(true)
          try {
            // The small JPEG derivative renders the CV and syncs in the profile…
            onChange(await fileToProfilePhoto(f))
            // …and the original is preserved in cloud storage (best-effort).
            void fileToDataUrl(f).then((orig) => cloudUploadPicture(settings, orig).catch(() => {}))
          } catch (ex) {
            setErr(ex instanceof Error ? ex.message : String(ex))
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
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
      {/* Used by the Europass / Continental CV formats — optional for everyone else. */}
      <KV k={t.dateOfBirth} v={p.identity.dateOfBirth ?? ''} onChange={(v) => setIdentity('dateOfBirth', v)} />
      <KV k={t.nationality} v={p.identity.nationality ?? ''} onChange={(v) => setIdentity('nationality', v)} />
      <PhotoField photo={p.identity.photo} onChange={(v) => setIdentity('photo', v)} t={t} />
      <KV k={t.headline} v={p.headline} placeholder={t.headlinePlaceholder} onChange={(v) => set({ headline: v })} />
      <KV k={t.summary} v={p.summary} multiline onChange={(v) => set({ summary: v })} />
      <Label>{t.industries}
        <ChipInput
          items={p.industries}
          placeholder={t.industryPlaceholder}
          removeLabel={t.removeItem}
          onChange={(v) => set({ industries: v })}
        />
      </Label>
    </>
  )
}

const LEVELS: [LanguageProficiency, 'lvlElementary' | 'lvlLimited' | 'lvlProfessional' | 'lvlFull' | 'lvlNative'][] = [
  ['elementary', 'lvlElementary'],
  ['limited_working', 'lvlLimited'],
  ['professional_working', 'lvlProfessional'],
  ['full_professional', 'lvlFull'],
  ['native_bilingual', 'lvlNative'],
]

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
  const [confirming, setConfirming] = useState(false)
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
      {incomplete && <div className="text-xs leading-[1.45] text-warn">{t.workNeedsDetail}</div>}
      <div className="flex gap-2.5 [&>*]:flex-1">
        <Label>{t.roleTitle}
          <Input type="text" autoFocus={!entry.title} value={entry.title}
            onChange={(e) => onChange({ ...entry, title: e.target.value })} /></Label>
        <Label>{t.company}
          <Input type="text" value={entry.company}
            onChange={(e) => onChange({ ...entry, company: e.target.value })} /></Label>
      </div>
      <div className="flex gap-2.5 [&>*]:flex-1">
        <Label>{t.fromYm}
          <Input type="text" placeholder="2021-03"
            defaultValue={ymString(entry.startYear, entry.startMonth)} onBlur={(e) => setStart(e.target.value)} /></Label>
        <Label>{t.toYm}
          <Input type="text"
            defaultValue={entry.isCurrent ? '' : ymString(entry.endYear, entry.endMonth)}
            onBlur={(e) => setEnd(e.target.value)} /></Label>
      </div>
      <Label>{t.techUsed}
        <ChipInput
          items={entry.skills}
          placeholder={t.techPlaceholder}
          removeLabel={t.removeItem}
          onChange={(skills) => onChange({ ...entry, skills })}
        />
      </Label>
      <Label>{t.workHighlights}
        <ListEditor
          items={entry.highlights}
          onChange={(highlights) => onChange({ ...entry, highlights })}
          placeholder={t.highlightPlaceholder}
          addLabel={t.addHighlight}
          removeLabel={t.removeItem}
        />
      </Label>
      <Button wide variant="danger" onClick={() => setConfirming(true)}>{t.remove}</Button>
      {confirming && (
        <ConfirmRemove
          title={t.removeRoleTitle}
          t={t}
          onCancel={() => setConfirming(false)}
          onConfirm={onRemove}
        />
      )}
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
  const [confirming, setConfirming] = useState(false)
  return (
    <>
      <div className="flex gap-2.5 [&>*]:flex-1">
        <Label>{t.degree}
          <Input type="text" autoFocus={!entry.degree} value={entry.degree}
            onChange={(e) => onChange({ ...entry, degree: e.target.value })} /></Label>
        <Label>{t.fieldOfStudy}
          <Input type="text" value={entry.fieldOfStudy ?? ''}
            onChange={(e) => onChange({ ...entry, fieldOfStudy: e.target.value })} /></Label>
      </div>
      <Label>{t.school}
        <Input type="text" value={entry.school}
          onChange={(e) => onChange({ ...entry, school: e.target.value })} /></Label>
      <div className="flex gap-2.5 [&>*]:flex-1">
        <Label>{t.fromYear}
          <Input type="text" defaultValue={entry.startYear ?? ''}
            onBlur={(e) => onChange({ ...entry, startYear: Number(e.target.value) || undefined })} /></Label>
        <Label>{t.toYear}
          <Input type="text" defaultValue={entry.endYear ?? ''}
            onBlur={(e) => onChange({ ...entry, endYear: Number(e.target.value) || undefined })} /></Label>
      </div>
      <Button wide variant="danger" onClick={() => setConfirming(true)}>{t.remove}</Button>
      {confirming && (
        <ConfirmRemove
          title={t.removeEducationTitle}
          t={t}
          onCancel={() => setConfirming(false)}
          onConfirm={onRemove}
        />
      )}
    </>
  )
}

/** Deleting an entry cannot be undone and the user would have to retype the
 *  whole thing, so it asks first. The sheet's own close button is the cancel,
 *  which puts the safe choice where a mis-tap is most likely to land. */
function ConfirmRemove({
  title,
  t,
  onCancel,
  onConfirm,
}: {
  title: string
  t: T
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Sheet title={title} sub={t.removeWarning} closeLabel={t.cancel} onClose={onCancel}>
      <Button variant="destructive" wide onClick={onConfirm}>{t.remove}</Button>
    </Sheet>
  )
}

/** Where a strength gap should take you. Most name a screen outright; the two
 *  work gaps have to resolve to a specific role, since there is no list screen
 *  to land on any more. */
function levelLabel(level: LanguageProficiency, t: T): string {
  return t[LEVELS.find(([value]) => value === level)?.[1] ?? 'lvlProfessional']
}

function gapTarget(gap: Gap, p: Profile): string {
  if (gap.screen !== 'work') return gap.screen
  const offender = p.work.find((w) => needsCompletion(w)) ?? p.work[0]
  return offender ? `work:${offender.id}` : 'about'
}

function ImportBox({
  onImport,
  cloudPdf,
  submitLabel,
}: {
  onImport: (text: string) => Promise<void>
  // The server deep-reads the PDF (incl. OCR) and returns the profile.
  cloudPdf: (file: File) => Promise<void>
  /** Submit-button label — mode-specific (replace vs. merge). */
  submitLabel: string
}) {
  const t = useContent('profile')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <Button variant="ghost" wide disabled={busy} onClick={() => fileRef.current?.click()}>
        <Icon name="up" /> {busy ? t.readingPdf : t.uploadPdf}
        {!busy && <Cost>{t.oneCredit}</Cost>}
      </Button>
      <input
        ref={fileRef} type="file" accept="application/pdf" className="hidden"
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
      <Textarea rows={5} placeholder={t.pasteCvPlaceholder} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
      <Button wide disabled={busy || text.trim().length < 50}
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
        {busy ? t.reading : submitLabel}
        {!busy && <Cost onDark>{t.oneCredit}</Cost>}
      </Button>
      {err && <p className="my-1 text-[13px] text-bad">{err}</p>}
    </>
  )
}
