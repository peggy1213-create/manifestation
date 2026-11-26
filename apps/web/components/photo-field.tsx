'use client';

import { useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { resizeImage } from '@/lib/resize-image';

/**
 * One optional photo per day. It is resized to 1200px and re-encoded here, in
 * the browser, before it is ever sent — so the original file, and the EXIF
 * block that came with it, stay on the device.
 */
export function PhotoField({
  previewUrl,
  onPick,
  onRemove,
  disabled,
}: {
  previewUrl: string | null;
  onPick: (photo: Blob) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const t = useTranslations('checkin');
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [resizing, setResizing] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setFailed(false);
    setResizing(true);
    try {
      const resized = await resizeImage(file);
      onPick(resized.blob);
    } catch {
      setFailed(true);
    } finally {
      setResizing(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-bold">{t('photoLabel')}</span>
        <span className="text-ink-faint text-[0.8125rem]">{t('photoOptional')}</span>
      </div>
      <p className="text-ink-soft text-[0.8125rem] leading-snug">{t('photoHint')}</p>

      {previewUrl ? (
        // The private R2 route serves this; next/image would proxy it through an
        // optimiser we do not run on Workers.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={t('photoAlt')}
          className="rounded-notebook border-kraft/40 max-h-64 w-full border object-cover"
          src={previewUrl}
        />
      ) : null}

      <input
        accept="image/*"
        className="sr-only"
        disabled={disabled || resizing}
        id={inputId}
        onChange={handleChange}
        ref={inputRef}
        type="file"
      />

      <div className="flex flex-wrap gap-2">
        <label
          className="border-kraft text-ink hover:bg-paper-2 inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-[0.9375rem]"
          htmlFor={inputId}
        >
          {resizing ? t('photoResizing') : previewUrl ? t('photoReplace') : t('photoChoose')}
        </label>

        {previewUrl ? (
          <button
            className="text-ink-soft hover:text-ink inline-flex min-h-11 items-center px-2 text-[0.9375rem] underline"
            disabled={disabled}
            onClick={onRemove}
            type="button"
          >
            {t('photoRemove')}
          </button>
        ) : null}
      </div>

      {failed ? (
        <p className="text-terracotta-strong text-[0.9375rem]">{t('photoTooBig')}</p>
      ) : null}
    </div>
  );
}
