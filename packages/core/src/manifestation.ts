// The 顯化 (manifestation) domain model: a WOOP wish plus the process steps that carry it.
// Pure TypeScript — no React, no framework, no database imports.

/** A 顯化 moves draft → active once it is complete, and can be released (放下) at any time. */
export type ManifestationStatus = 'draft' | 'active' | 'released';

export const MANIFESTATION_STATUSES: readonly ManifestationStatus[] = [
  'draft',
  'active',
  'released',
];

/** One repeatable 小行動, with when and where it happens. */
export interface ProcessStep {
  action: string;
  when: string;
  where: string;
}

/** Everything the builder collects. Blank strings are allowed while it is still a draft. */
export interface ManifestationInput {
  /** 願望 */
  wish: string;
  /** 最好的結果 */
  outcome: string;
  /** 看到 */
  outcomeSee: string;
  /** 聽到 */
  outcomeHear: string;
  /** 感覺 */
  outcomeFeel: string;
  /** 內在障礙 */
  obstacle: string;
  /** 如果… */
  planIf: string;
  /** …就… */
  planThen: string;
  /** 過程步驟 */
  steps: ProcessStep[];
  /** 可能性 1–10, null while unanswered */
  likelihood: number | null;
}

export interface Manifestation extends ManifestationInput {
  id: string;
  userId: string;
  status: ManifestationStatus;
  createdAt: number;
  updatedAt: number;
  /** When it became active — day 1 of the 66-day path. */
  startedAt: number | null;
  releasedAt: number | null;
  releaseNote: string | null;
}

export const WISH_MAX_LENGTH = 80;
export const OUTCOME_MAX_LENGTH = 400;
export const SENSE_MAX_LENGTH = 200;
export const OBSTACLE_MAX_LENGTH = 300;
export const PLAN_PART_MAX_LENGTH = 160;
export const STEP_ACTION_MAX_LENGTH = 120;
export const STEP_WHEN_MAX_LENGTH = 60;
export const STEP_WHERE_MAX_LENGTH = 60;
export const RELEASE_NOTE_MAX_LENGTH = 300;
export const MAX_STEPS = 7;

/** Length in code points, so one emoji or one 漢字 counts as one character. */
export function characterCount(value: string): number {
  return Array.from(value).length;
}

export function emptyStep(): ProcessStep {
  return { action: '', when: '', where: '' };
}

export function emptyManifestationInput(): ManifestationInput {
  return {
    wish: '',
    outcome: '',
    outcomeSee: '',
    outcomeHear: '',
    outcomeFeel: '',
    obstacle: '',
    planIf: '',
    planThen: '',
    steps: [emptyStep()],
    likelihood: null,
  };
}

export function isStepBlank(step: ProcessStep): boolean {
  return step.action.trim() === '' && step.when.trim() === '' && step.where.trim() === '';
}

/** A 小行動 only counts once it says what to do; when and where are encouraged, not required. */
export function hasAction(step: ProcessStep): boolean {
  return step.action.trim() !== '';
}

function trimStep(step: ProcessStep): ProcessStep {
  return {
    action: step.action.trim(),
    when: step.when.trim(),
    where: step.where.trim(),
  };
}

/**
 * Trim every field. Steps keep their order and their blanks, so autosaving halfway through
 * typing never silently removes a row the person is still filling in.
 */
export function normaliseInput(input: ManifestationInput): ManifestationInput {
  return {
    wish: input.wish.trim(),
    outcome: input.outcome.trim(),
    outcomeSee: input.outcomeSee.trim(),
    outcomeHear: input.outcomeHear.trim(),
    outcomeFeel: input.outcomeFeel.trim(),
    obstacle: input.obstacle.trim(),
    planIf: input.planIf.trim(),
    planThen: input.planThen.trim(),
    steps: input.steps.map(trimStep).slice(0, MAX_STEPS),
    likelihood: input.likelihood,
  };
}

/**
 * Like {@link normaliseInput}, but step rows with no 小行動 are dropped — used when activating.
 */
export function normaliseInputForActivation(input: ManifestationInput): ManifestationInput {
  const normalised = normaliseInput(input);
  return { ...normalised, steps: normalised.steps.filter(hasAction) };
}

/**
 * Split pasted text into one step per line, so "過程步驟，一行一個" works when someone
 * pastes a list. Blank lines and list bullets are dropped.
 */
export function splitStepLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s]*(?:[-*•]|\d+[.)、])\s*/, '').trim())
    .filter((line) => line !== '');
}

/** Can this 顯化 still be edited in the builder? */
export function canEdit(status: ManifestationStatus): boolean {
  return status !== 'released';
}

/** Can this 顯化 be released (放下)? Letting go counts as progress, but only once. */
export function canRelease(status: ManifestationStatus): boolean {
  return status !== 'released';
}

export interface IfThenParts {
  ifPart: string;
  thenPart: string;
  /** True once both halves are written — the preview sentence only reads well then. */
  complete: boolean;
}

/**
 * The two halves of the 如果…就… sentence, ready for the message template. Trailing
 * 。．.，、,; are stripped so the template's own punctuation never doubles up.
 */
export function ifThenParts(input: Pick<ManifestationInput, 'planIf' | 'planThen'>): IfThenParts {
  const ifPart = stripTrailingPunctuation(input.planIf);
  const thenPart = stripTrailingPunctuation(input.planThen);
  return { ifPart, thenPart, complete: ifPart !== '' && thenPart !== '' };
}

function stripTrailingPunctuation(value: string): string {
  return value.trim().replace(/[。．.，、,；;！!]+$/u, '');
}
