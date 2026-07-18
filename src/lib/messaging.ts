import { AnswerType, ApplicationRecord, BankAnswer, PendingQuestion, Profile, ResumeVariant, Settings } from './types'

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

export function sendMsg<T = unknown>(msg: Msg): Promise<T> {
  return chrome.runtime.sendMessage(msg)
}
