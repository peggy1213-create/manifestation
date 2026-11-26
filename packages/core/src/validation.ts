// Validation for the 顯化 builder. Message keys point at messages/zh-TW.json —
// no user-facing copy lives in this package.

import {
  MAX_STEPS,
  OBSTACLE_MAX_LENGTH,
  OUTCOME_MAX_LENGTH,
  PLAN_PART_MAX_LENGTH,
  RELEASE_NOTE_MAX_LENGTH,
  SENSE_MAX_LENGTH,
  STEP_ACTION_MAX_LENGTH,
  STEP_WHEN_MAX_LENGTH,
  STEP_WHERE_MAX_LENGTH,
  WISH_MAX_LENGTH,
  characterCount,
  hasAction,
  normaliseInput,
  type ManifestationInput,
} from './manifestation';
import { LIKELIHOOD_MAX, LIKELIHOOD_MIN } from './likelihood';

export type ValidationField =
  | 'wish'
  | 'outcome'
  | 'outcomeSee'
  | 'outcomeHear'
  | 'outcomeFeel'
  | 'obstacle'
  | 'planIf'
  | 'planThen'
  | 'steps'
  | 'likelihood'
  | 'releaseNote';

export type ValidationCode = 'required' | 'tooLong' | 'outOfRange' | 'tooMany';

export interface ValidationIssue {
  field: ValidationField;
  code: ValidationCode;
  /** Key under `errors` in messages/zh-TW.json. */
  messageKey: string;
  /** Character limit or range bound, for the message. */
  limit?: number;
  /** Which step row the issue belongs to. */
  stepIndex?: number;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

const TEXT_LIMITS: Record<
  | 'wish'
  | 'outcome'
  | 'outcomeSee'
  | 'outcomeHear'
  | 'outcomeFeel'
  | 'obstacle'
  | 'planIf'
  | 'planThen',
  number
> = {
  wish: WISH_MAX_LENGTH,
  outcome: OUTCOME_MAX_LENGTH,
  outcomeSee: SENSE_MAX_LENGTH,
  outcomeHear: SENSE_MAX_LENGTH,
  outcomeFeel: SENSE_MAX_LENGTH,
  obstacle: OBSTACLE_MAX_LENGTH,
  planIf: PLAN_PART_MAX_LENGTH,
  planThen: PLAN_PART_MAX_LENGTH,
};

/** The four WOOP parts, in the order the builder asks for them. 如果…就… counts as one part. */
export const REQUIRED_WOOP_FIELDS = ['wish', 'outcome', 'obstacle', 'planIf', 'planThen'] as const;

export type RequiredWoopField = (typeof REQUIRED_WOOP_FIELDS)[number];

function tooLong(field: ValidationField, limit: number, stepIndex?: number): ValidationIssue {
  return { field, code: 'tooLong', messageKey: 'errors.tooLong', limit, stepIndex };
}

function required(field: ValidationField, stepIndex?: number): ValidationIssue {
  return { field, code: 'required', messageKey: `errors.required.${field}`, stepIndex };
}

/** Length and range checks only. Autosave uses this: a half-written draft is never rejected. */
export function validateDraft(raw: ManifestationInput): ValidationResult {
  const input = normaliseInput(raw);
  const issues: ValidationIssue[] = [];

  for (const [field, limit] of Object.entries(TEXT_LIMITS) as [
    keyof typeof TEXT_LIMITS,
    number,
  ][]) {
    if (characterCount(input[field]) > limit) issues.push(tooLong(field, limit));
  }

  if (raw.steps.length > MAX_STEPS) {
    issues.push({
      field: 'steps',
      code: 'tooMany',
      messageKey: 'errors.tooManySteps',
      limit: MAX_STEPS,
    });
  }

  input.steps.forEach((step, stepIndex) => {
    if (characterCount(step.action) > STEP_ACTION_MAX_LENGTH) {
      issues.push(tooLong('steps', STEP_ACTION_MAX_LENGTH, stepIndex));
    }
    if (characterCount(step.when) > STEP_WHEN_MAX_LENGTH) {
      issues.push(tooLong('steps', STEP_WHEN_MAX_LENGTH, stepIndex));
    }
    if (characterCount(step.where) > STEP_WHERE_MAX_LENGTH) {
      issues.push(tooLong('steps', STEP_WHERE_MAX_LENGTH, stepIndex));
    }
  });

  if (input.likelihood !== null && !isLikelihoodInRange(input.likelihood)) {
    issues.push({
      field: 'likelihood',
      code: 'outOfRange',
      messageKey: 'errors.likelihoodRange',
      limit: LIKELIHOOD_MAX,
    });
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Everything a 顯化 needs before it starts: all four WOOP parts, at least one 小行動,
 * and a likelihood from 1 to 10 — on top of every draft-level length check.
 */
export function validateManifestation(raw: ManifestationInput): ValidationResult {
  const input = normaliseInput(raw);
  const issues: ValidationIssue[] = [...validateDraft(raw).issues];

  for (const field of REQUIRED_WOOP_FIELDS) {
    if (input[field] === '') issues.push(required(field));
  }

  if (!input.steps.some(hasAction)) issues.push(required('steps'));

  if (input.likelihood === null) issues.push(required('likelihood'));

  return { ok: issues.length === 0, issues };
}

export function isLikelihoodInRange(value: number): boolean {
  return Number.isInteger(value) && value >= LIKELIHOOD_MIN && value <= LIKELIHOOD_MAX;
}

export function validateReleaseNote(note: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (characterCount(note.trim()) > RELEASE_NOTE_MAX_LENGTH) {
    issues.push(tooLong('releaseNote', RELEASE_NOTE_MAX_LENGTH));
  }
  return { ok: issues.length === 0, issues };
}

/** Which fields the given issues touch — handy for focusing the first unfinished screen. */
export function issueFields(issues: readonly ValidationIssue[]): ValidationField[] {
  return [...new Set(issues.map((issue) => issue.field))];
}
