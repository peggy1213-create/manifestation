'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import {
  MAX_STEPS,
  OBSTACLE_MAX_LENGTH,
  OUTCOME_MAX_LENGTH,
  PLAN_PART_MAX_LENGTH,
  SENSE_MAX_LENGTH,
  STEP_ACTION_MAX_LENGTH,
  STEP_WHEN_MAX_LENGTH,
  STEP_WHERE_MAX_LENGTH,
  WISH_MAX_LENGTH,
  characterCount,
  emptyStep,
  ifThenParts,
  likelihoodAdvice,
  mentionsSelfHarm,
  splitStepLines,
  validateManifestation,
  type ManifestationInput,
  type ManifestationStatus,
  type ProcessStep,
  type ValidationField,
  type ValidationIssue,
} from '@clearpath/core';
import { activateAction, saveDraftAction } from '@/app/actions/manifestations';
import { CareNote } from './care-note';
import { ReleaseDialog } from './release-dialog';
import {
  FieldLabel,
  PathDots,
  Sheet,
  inputClassName,
  primaryButtonClassName,
  quietButtonClassName,
  secondaryButtonClassName,
} from './ui';

const STEP_IDS = ['wish', 'outcome', 'obstacle', 'plan', 'process', 'likelihood'] as const;
type StepId = (typeof STEP_IDS)[number];

/** Which screen each field is asked on, so a missing answer can be pointed at. */
const STEP_FIELDS: Record<StepId, readonly ValidationField[]> = {
  wish: ['wish'],
  outcome: ['outcome', 'outcomeSee', 'outcomeHear', 'outcomeFeel'],
  obstacle: ['obstacle'],
  plan: ['planIf', 'planThen'],
  process: ['steps'],
  likelihood: ['likelihood'],
};

const AUTOSAVE_DELAY_MS = 1200;
const LIKELIHOOD_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface ManifestationBuilderProps {
  manifestationId: string | null;
  initialInput: ManifestationInput;
  initialStatus: ManifestationStatus;
  isGuest: boolean;
}

export function ManifestationBuilder({
  manifestationId,
  initialInput,
  initialStatus,
  isGuest,
}: ManifestationBuilderProps) {
  const t = useTranslations('builder');
  const tRoot = useTranslations();
  const format = useFormatter();
  const router = useRouter();

  const [input, setInput] = useState<ManifestationInput>(initialInput);
  const [id, setId] = useState<string | null>(manifestationId);
  const [stepIndex, setStepIndex] = useState(0);
  const [issues, setIssues] = useState<readonly ValidationIssue[]>([]);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const inputRef = useRef(input);
  const idRef = useRef(id);
  const dirtyRef = useRef(false);
  const savingRef = useRef<Promise<void> | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  inputRef.current = input;
  idRef.current = id;

  const stepId = STEP_IDS[stepIndex] ?? 'wish';
  const isLastStep = stepIndex === STEP_IDS.length - 1;
  // A 顯化 that has already started saves 修改, not a 草稿.
  const savedLabel = initialStatus === 'active' ? 'savedChanges' : 'savedDraft';

  const update = useCallback((patch: Partial<ManifestationInput>) => {
    dirtyRef.current = true;
    setInput((current) => ({ ...current, ...patch }));
  }, []);

  /**
   * Autosave. Keeps writing until the draft on the server matches what is on screen, and
   * never runs twice at once — so a fast typist cannot end up with two drafts. Returns the
   * same promise while a save is in flight, which is what finishing waits on.
   */
  const persist = useCallback((): Promise<void> => {
    if (savingRef.current) return savingRef.current;

    const run = (async () => {
      try {
        for (;;) {
          const snapshot = inputRef.current;
          setSaveState('saving');
          const result = await saveDraftAction(idRef.current, snapshot);
          if (!result.ok) {
            setSaveState('error');
            return;
          }
          if (!idRef.current) {
            idRef.current = result.id;
            setId(result.id);
            window.history.replaceState(null, '', `/app/${result.id}/edit`);
          }
          setSavedAt(result.savedAt);
          if (inputRef.current === snapshot) {
            dirtyRef.current = false;
            setSaveState('saved');
            return;
          }
        }
      } catch {
        setSaveState('error');
      } finally {
        savingRef.current = null;
      }
    })();

    savingRef.current = run;
    return run;
  }, []);

  useEffect(() => {
    if (!dirtyRef.current) return;
    const timer = setTimeout(() => void persist(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [input, persist]);

  // Each screen is its own question: move focus to it so the flow reads in order.
  useEffect(() => {
    headingRef.current?.focus();
  }, [stepIndex]);

  const issueFor = useCallback(
    (field: ValidationField, stepRow?: number) =>
      issues.find(
        (issue) => issue.field === field && (stepRow === undefined || issue.stepIndex === stepRow),
      ),
    [issues],
  );

  const showCareNote = useMemo(
    () =>
      mentionsSelfHarm(
        input.wish,
        input.outcome,
        input.outcomeSee,
        input.outcomeHear,
        input.outcomeFeel,
        input.obstacle,
        input.planIf,
        input.planThen,
        ...input.steps.map((step) => step.action),
      ),
    [input],
  );

  function goTo(nextIndex: number) {
    setStepIndex(Math.min(STEP_IDS.length - 1, Math.max(0, nextIndex)));
  }

  function jumpToFirstIssue(nextIssues: readonly ValidationIssue[]) {
    const firstStep = STEP_IDS.findIndex((candidate) =>
      nextIssues.some((issue) => STEP_FIELDS[candidate].includes(issue.field)),
    );
    if (firstStep >= 0) goTo(firstStep);
  }

  function finish() {
    const result = validateManifestation(inputRef.current);
    setIssues(result.issues);
    if (!result.ok) {
      jumpToFirstIssue(result.issues);
      return;
    }

    startTransition(async () => {
      // Make sure the draft exists (and is up to date) before starting its path.
      await persist();
      const currentId = idRef.current;
      if (!currentId) {
        setSaveState('error');
        return;
      }

      const activated = await activateAction(currentId, inputRef.current);
      if (activated.ok) {
        dirtyRef.current = false;
        router.push(`/app/${currentId}`);
        return;
      }
      if (activated.error === 'invalid') {
        setIssues(activated.issues);
        jumpToFirstIssue(activated.issues);
        return;
      }
      setSaveState('error');
    });
  }

  function issueMessage(issue: ValidationIssue | undefined) {
    if (!issue) return null;
    return tRoot(issue.messageKey, { limit: issue.limit ?? 0 });
  }

  const counter = (value: string, max: number) =>
    t('counter', { count: characterCount(value), max });

  return (
    <main id="main" className="mx-auto w-full max-w-[34rem] px-4 pt-6 pb-16 sm:pt-10">
      <header className="mb-5">
        <h1 className="text-display font-bold text-terracotta">
          {manifestationId ? t('titleEdit') : t('titleNew')}
        </h1>
        <div className="mt-3 flex items-center gap-3">
          <PathDots total={STEP_IDS.length} current={stepIndex} />
          <p className="text-label text-ink/65">
            {t('progress', { current: stepIndex + 1, total: STEP_IDS.length })}
          </p>
        </div>
        {isGuest ? <p className="mt-3 text-small text-ink/65">{t('guestNotice')}</p> : null}
      </header>

      <Sheet className="cp-margin-line">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-heading font-bold outline-none"
          key={stepId}
        >
          {t(`${stepId}.question`)}
        </h2>
        <p className="mt-2 text-small text-ink/75">{t(`${stepId}.help`)}</p>

        <div className="mt-5 space-y-5">
          {stepId === 'wish' ? (
            <TextField
              name="wish"
              label={t('wish.label')}
              placeholder={t('wish.placeholder')}
              value={input.wish}
              onChange={(wish) => update({ wish })}
              counter={counter(input.wish, WISH_MAX_LENGTH)}
              error={issueMessage(issueFor('wish'))}
            />
          ) : null}

          {stepId === 'outcome' ? (
            <>
              <TextField
                name="outcome"
                label={t('outcome.label')}
                placeholder={t('outcome.placeholder')}
                value={input.outcome}
                onChange={(outcome) => update({ outcome })}
                counter={counter(input.outcome, OUTCOME_MAX_LENGTH)}
                error={issueMessage(issueFor('outcome'))}
                multiline
              />
              <TextField
                name="outcomeSee"
                label={t('outcome.seeLabel')}
                placeholder={t('outcome.seePlaceholder')}
                value={input.outcomeSee}
                onChange={(outcomeSee) => update({ outcomeSee })}
                counter={counter(input.outcomeSee, SENSE_MAX_LENGTH)}
                error={issueMessage(issueFor('outcomeSee'))}
                optional
              />
              <TextField
                name="outcomeHear"
                label={t('outcome.hearLabel')}
                placeholder={t('outcome.hearPlaceholder')}
                value={input.outcomeHear}
                onChange={(outcomeHear) => update({ outcomeHear })}
                counter={counter(input.outcomeHear, SENSE_MAX_LENGTH)}
                error={issueMessage(issueFor('outcomeHear'))}
                optional
              />
              <TextField
                name="outcomeFeel"
                label={t('outcome.feelLabel')}
                placeholder={t('outcome.feelPlaceholder')}
                value={input.outcomeFeel}
                onChange={(outcomeFeel) => update({ outcomeFeel })}
                counter={counter(input.outcomeFeel, SENSE_MAX_LENGTH)}
                error={issueMessage(issueFor('outcomeFeel'))}
                optional
              />
              <p className="text-small text-ink/65">{t('outcome.afterNote')}</p>
            </>
          ) : null}

          {stepId === 'obstacle' ? (
            <TextField
              name="obstacle"
              label={t('obstacle.label')}
              placeholder={t('obstacle.placeholder')}
              value={input.obstacle}
              onChange={(obstacle) => update({ obstacle })}
              counter={counter(input.obstacle, OBSTACLE_MAX_LENGTH)}
              error={issueMessage(issueFor('obstacle'))}
              multiline
            />
          ) : null}

          {stepId === 'plan' ? (
            <>
              <TextField
                name="planIf"
                label={t('plan.ifLabel')}
                placeholder={t('plan.ifPlaceholder')}
                value={input.planIf}
                onChange={(planIf) => update({ planIf })}
                counter={counter(input.planIf, PLAN_PART_MAX_LENGTH)}
                error={issueMessage(issueFor('planIf'))}
              />
              <TextField
                name="planThen"
                label={t('plan.thenLabel')}
                placeholder={t('plan.thenPlaceholder')}
                value={input.planThen}
                onChange={(planThen) => update({ planThen })}
                counter={counter(input.planThen, PLAN_PART_MAX_LENGTH)}
                error={issueMessage(issueFor('planThen'))}
              />
              <IfThenPreview planIf={input.planIf} planThen={input.planThen} />
            </>
          ) : null}

          {stepId === 'process' ? (
            <ProcessSteps
              steps={input.steps}
              onChange={(steps) => update({ steps })}
              error={issueMessage(issueFor('steps'))}
              stepError={(row) => issueMessage(issueFor('steps', row))}
            />
          ) : null}

          {stepId === 'likelihood' ? (
            <LikelihoodField
              value={input.likelihood}
              onChange={(likelihood) => update({ likelihood })}
              error={issueMessage(issueFor('likelihood'))}
              onShrinkWish={() => goTo(0)}
            />
          ) : null}
        </div>

        {showCareNote ? <CareNote /> : null}
      </Sheet>

      <nav className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          className={secondaryButtonClassName}
          onClick={() => goTo(stepIndex - 1)}
          disabled={stepIndex === 0}
        >
          {t('actions.back')}
        </button>

        {isLastStep ? (
          <button
            type="button"
            className={primaryButtonClassName}
            onClick={finish}
            disabled={pending}
          >
            {initialStatus === 'active' ? t('actions.saveChanges') : t('actions.finish')}
          </button>
        ) : (
          <button
            type="button"
            className={primaryButtonClassName}
            onClick={() => goTo(stepIndex + 1)}
          >
            {t('actions.next')}
          </button>
        )}
      </nav>

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-small text-ink/65">
          {saveState === 'saving' ? t('autosave.saving') : null}
          {saveState === 'saved'
            ? savedAt
              ? t(`autosave.${savedLabel}At`, {
                  time: format.dateTime(new Date(savedAt), { hour: '2-digit', minute: '2-digit' }),
                })
              : t(`autosave.${savedLabel}`)
            : null}
          {saveState === 'error' ? (
            <span className="text-terracotta-strong">{t('autosave.failed')}</span>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {saveState === 'error' ? (
            <button type="button" className={quietButtonClassName} onClick={() => void persist()}>
              {t('autosave.retry')}
            </button>
          ) : null}
          {id ? <ReleaseDialog manifestationId={id} /> : null}
        </div>
      </footer>
    </main>
  );
}

function TextField({
  name,
  label,
  placeholder,
  value,
  onChange,
  counter,
  error,
  multiline = false,
  optional = false,
}: {
  name: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  counter: string;
  error: string | null;
  multiline?: boolean;
  optional?: boolean;
}) {
  const t = useTranslations('common');
  const errorId = `${name}-error`;
  const invalid = error ? true : undefined;
  const describedBy = error ? errorId : undefined;

  return (
    <div>
      <FieldLabel htmlFor={name} hint={optional ? t('optional') : undefined}>
        {label}
      </FieldLabel>
      {multiline ? (
        <textarea
          id={name}
          name={name}
          rows={4}
          value={value}
          placeholder={placeholder}
          className={inputClassName}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={name}
          name={name}
          type="text"
          value={value}
          placeholder={placeholder}
          className={inputClassName}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      <div className="mt-1 flex items-start justify-between gap-3">
        {error ? (
          <p id={errorId} className="text-small text-terracotta-strong">
            {error}
          </p>
        ) : (
          <span />
        )}
        <span className="font-latin text-label text-ink/55">{counter}</span>
      </div>
    </div>
  );
}

function IfThenPreview({ planIf, planThen }: { planIf: string; planThen: string }) {
  const t = useTranslations('builder.plan');
  const parts = ifThenParts({ planIf, planThen });

  return (
    <div className="rounded-md border border-dashed border-kraft/70 bg-paper-2/50 p-4">
      <p className="text-label font-bold text-ink/70">{t('previewLabel')}</p>
      <p aria-live="polite" className="mt-2 text-body">
        {parts.complete ? (
          <span className="cp-highlight">
            {t('previewSentence', { ifPart: parts.ifPart, thenPart: parts.thenPart })}
          </span>
        ) : (
          <span className="text-ink/55">{t('previewEmpty')}</span>
        )}
      </p>
    </div>
  );
}

function ProcessSteps({
  steps,
  onChange,
  error,
  stepError,
}: {
  steps: readonly ProcessStep[];
  onChange: (steps: ProcessStep[]) => void;
  error: string | null;
  stepError: (row: number) => string | null;
}) {
  const t = useTranslations('builder.process');

  function patch(row: number, patchStep: Partial<ProcessStep>) {
    onChange(steps.map((step, index) => (index === row ? { ...step, ...patchStep } : step)));
  }

  /** Pasting a list fills one 小行動 per line. */
  function handlePaste(row: number, text: string) {
    const lines = splitStepLines(text);
    if (lines.length < 2) return false;

    const next = [...steps];
    const [first, ...rest] = lines;
    next[row] = { ...(next[row] ?? emptyStep()), action: first ?? '' };
    next.splice(row + 1, 0, ...rest.map((action) => ({ ...emptyStep(), action })));
    onChange(next.slice(0, MAX_STEPS));
    return true;
  }

  return (
    <div className="space-y-4">
      {steps.map((step, row) => {
        const rowError = stepError(row);
        return (
          <fieldset key={row} className="rounded-md border border-kraft/50 bg-paper/60 p-3">
            <legend className="px-1 text-label font-bold text-ink/70">
              {t('stepLabel', { index: row + 1 })}
            </legend>

            <label htmlFor={`step-action-${row}`} className="sr-only">
              {t('actionLabel')}
            </label>
            <input
              id={`step-action-${row}`}
              type="text"
              className={inputClassName}
              value={step.action}
              placeholder={t('actionPlaceholder')}
              maxLength={STEP_ACTION_MAX_LENGTH}
              aria-invalid={rowError ? true : undefined}
              onChange={(event) => patch(row, { action: event.target.value })}
              onPaste={(event) => {
                if (handlePaste(row, event.clipboardData.getData('text'))) event.preventDefault();
              }}
            />

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label htmlFor={`step-when-${row}`} className="text-label font-bold text-ink/70">
                  {t('whenLabel')}
                </label>
                <input
                  id={`step-when-${row}`}
                  type="text"
                  className={inputClassName}
                  value={step.when}
                  placeholder={t('whenPlaceholder')}
                  maxLength={STEP_WHEN_MAX_LENGTH}
                  onChange={(event) => patch(row, { when: event.target.value })}
                />
              </div>
              <div>
                <label htmlFor={`step-where-${row}`} className="text-label font-bold text-ink/70">
                  {t('whereLabel')}
                </label>
                <input
                  id={`step-where-${row}`}
                  type="text"
                  className={inputClassName}
                  value={step.where}
                  placeholder={t('wherePlaceholder')}
                  maxLength={STEP_WHERE_MAX_LENGTH}
                  onChange={(event) => patch(row, { where: event.target.value })}
                />
              </div>
            </div>

            {rowError ? <p className="mt-1 text-small text-terracotta-strong">{rowError}</p> : null}

            {steps.length > 1 ? (
              <button
                type="button"
                className="mt-2 text-small text-ink/60 underline underline-offset-4"
                onClick={() => onChange(steps.filter((_, index) => index !== row))}
              >
                {t('remove', { index: row + 1 })}
              </button>
            ) : null}
          </fieldset>
        );
      })}

      {error ? <p className="text-small text-terracotta-strong">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className={secondaryButtonClassName}
          onClick={() => onChange([...steps, emptyStep()])}
          disabled={steps.length >= MAX_STEPS}
        >
          {t('add')}
        </button>
        <p className="text-label text-ink/55">{t('pasteHint')}</p>
      </div>
    </div>
  );
}

function LikelihoodField({
  value,
  onChange,
  error,
  onShrinkWish,
}: {
  value: number | null;
  onChange: (value: number) => void;
  error: string | null;
  onShrinkWish: () => void;
}) {
  const t = useTranslations('builder.likelihood');
  const tAdvice = useTranslations();
  const advice = value === null ? null : likelihoodAdvice(value);

  return (
    <div>
      <fieldset>
        <legend className="text-label font-bold text-ink/80">{t('label')}</legend>
        <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {LIKELIHOOD_CHOICES.map((choice) => (
            <label
              key={choice}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md border text-body font-latin ${
                value === choice
                  ? 'border-terracotta-strong bg-terracotta-strong font-bold text-on-terracotta'
                  : 'border-kraft/60 bg-paper text-ink'
              }`}
            >
              <input
                type="radio"
                name="likelihood"
                className="sr-only"
                value={choice}
                checked={value === choice}
                onChange={() => onChange(choice)}
              />
              {choice}
            </label>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-label text-ink/55">
          <span>{t('scaleMin')}</span>
          <span>{t('scaleMax')}</span>
        </div>
      </fieldset>

      {error ? <p className="mt-2 text-small text-terracotta-strong">{error}</p> : null}

      {advice ? (
        <div
          aria-live="polite"
          className="mt-4 rounded-md border border-kraft/60 bg-paper-2/50 p-4"
        >
          <p className="text-small">{tAdvice(advice.messageKey)}</p>
          {advice.suggestSmallerWish ? (
            <button type="button" className={`${quietButtonClassName} mt-2`} onClick={onShrinkWish}>
              {tAdvice('likelihood.smallerAction')}
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-small text-ink/55">{t('unanswered')}</p>
      )}
    </div>
  );
}
