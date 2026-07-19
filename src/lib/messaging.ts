import { AnswerType, ApplicationRecord, BankAnswer, PendingQuestion, Profile, ResumeVariant, Settings } from './types'
import type { AssistField, VerifyField } from '../ai/capabilities/fill-assist'

// Content script <-> background messages.

export interface FillState {
  profile: Profile
  answerBank: BankAnswer[]
  resumes: Pick<ResumeVariant, 'id' | 'label' | 'fileName' | 'isDefault' | 'tags'>[]
  settings: Settings
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
  | { type: 'fillCurrentTab' }
  | { type: 'scoreFitPage'; jobText: string; jobUrl: string }
  | { type: 'cloudPull' }
  | { type: 'fillAssist'; fields: AssistField[]; verify: VerifyField[] }
  | { type: 'addPhrasing'; savedQuestion: string; phrasing: string }

export function sendMsg<T = unknown>(msg: Msg): Promise<T> {
  return chrome.runtime.sendMessage(msg)
}
