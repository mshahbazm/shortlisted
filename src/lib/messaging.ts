import { AnswerType, ApplicationRecord, BankAnswer, PendingQuestion, Profile, ResumeVariant, Settings } from './types'
import type { AssistField, VerifyField } from '../ai/capabilities/fill-assist'

// Content script <-> background messages.

export interface FillState {
  profile: Profile
  answerBank: BankAnswer[]
  resumes: Pick<ResumeVariant, 'id' | 'label' | 'fileName' | 'isDefault' | 'tags'>[]
  settings: Settings
}

/** What Home needs in order to pick which context state to show.
 *
 *  Note the difference between `hasFields` and `isJobPage`. Fields are weak
 *  evidence — a webmail search box is a field. Only `isJobPage` or `knownAts`
 *  justify telling the user we found an application; anything less has to be
 *  phrased as a question, or Gmail gets announced as a job form. */
export interface PageContext {
  /** This frame holds SOMETHING fillable. Not evidence of an application. */
  hasFields: boolean
  /** The on-page bubble is already mounted — Home must not repeat its offer. */
  bubbleOpen: boolean
  /** The detector scored this page as an application form, confidently. */
  isJobPage: boolean
  /** The URL matched an ATS we ship an adapter for — the strongest signal. */
  knownAts: boolean
  /** The page's own URL — the queue is keyed by it, so "Save to list" needs it. */
  url: string
  title: string
  company: string
  ats: string
  fieldCount: number
}

export type Msg =
  | { type: 'getFillState' }
  | { type: 'getResumeData'; resumeId: string }
  | { type: 'saveResume'; base64: string; fileName: string }
  | { type: 'intakeResume'; resumeId: string }
  | { type: 'tailorAttach'; jobText: string; templateId: string; note?: string }
  | {
      type: 'saveAnswer'
      questionRaw: string
      answer: string
      answerType: AnswerType
      jobUrl: string
    }
  | { type: 'markAnswerUsed'; answerId: string; jobUrl: string }
  | { type: 'capturePending'; questions: Omit<PendingQuestion, 'id' | 'capturedAt'>[] }
  | { type: 'resolvePending'; questionRaw: string }
  | { type: 'recordApplication'; record: Omit<ApplicationRecord, 'id' | 'appliedAt' | 'status'> }
  | { type: 'openSidePanel' }
  | { type: 'openProfileNote' }
  | { type: 'fillCurrentTab' }
  // Side panel -> background: what is the user looking at right now?
  | { type: 'pageContext' }
  | { type: 'scoreFitPage'; jobText: string; jobUrl: string }
  | { type: 'cloudPull' }
  | { type: 'fillAssist'; fields: AssistField[]; verify: VerifyField[] }
  | { type: 'addPhrasing'; savedQuestion: string; phrasing: string }
  // Background -> content script: mount the overlay and fill, whatever the
  // detector thought of this page. Sent after "Fill current tab".
  | { type: 'triggerFill' }
  // Background -> content script: describe the page without touching it.
  | { type: 'getPageContext' }

export function sendMsg<T = unknown>(msg: Msg): Promise<T> {
  return chrome.runtime.sendMessage(msg)
}
