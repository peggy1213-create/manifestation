import type { ReactNode } from 'react';
import { themeColors, invariantColors } from '@clearpath/tokens';
import {
  Button,
  Card,
  Checkbox,
  EmptyState,
  GraphPaper,
  Highlight,
  SegmentedControl,
  Slider,
  TextArea,
  TextField,
  Toast,
} from '@/components/ui';

export const metadata = {
  title: '樣式指南 · 顯化 Clear Path',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-heading font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

/** Labels the light / dark pair for a colour that changes with the theme. */
function themed(key: keyof (typeof themeColors)['light']) {
  return `${themeColors.light[key]} / ${themeColors.dark[key]}`;
}

function Swatch({ name, hex, className }: { name: string; hex: string; className: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`cp-shadow-card h-16 w-full rounded-md ${className}`} />
      <p className="text-caption text-ink">
        {name}
        <br />
        <span className="text-ink/60">{hex}</span>
      </p>
    </div>
  );
}

function FootprintIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <circle cx="8" cy="8" r="2.5" fill="currentColor" />
      <circle cx="16" cy="13" r="2.5" fill="currentColor" />
      <circle cx="9" cy="18" r="2.5" fill="currentColor" />
    </svg>
  );
}

function Showcase() {
  return (
    <div className="flex flex-col gap-10 rounded-lg bg-paper p-6 text-ink">
      <Section title="色彩">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Swatch name="ink" hex={themed('ink')} className="bg-ink" />
          <Swatch
            name="paper"
            hex={themed('paper')}
            className="cp-shadow-card border border-ink/10 bg-paper"
          />
          <Swatch name="paper-2" hex={themed('paper2')} className="bg-paper-2" />
          <Swatch name="graph-blue" hex={themed('graphBlue')} className="bg-graph-blue" />
          <Swatch name="highlighter" hex={invariantColors.highlighter} className="bg-highlighter" />
          <Swatch name="coral" hex={invariantColors.coral} className="bg-coral" />
        </div>
        <p className="text-body text-blue-text">blue-text — 連結與行內強調文字</p>
      </Section>

      <Section title="字級（4 階）">
        <p className="text-display font-bold text-ink">顯化 Display 28/1.3</p>
        <p className="text-heading font-bold text-ink">願望 Heading 20/1.4</p>
        <p className="text-body text-ink">
          正文 Body 16/1.75 — 寫下你的顯化，記下每一個小行動，不急著比較進度。
        </p>
        <p className="text-caption text-ink/70">輔助說明 Caption 13/1.5</p>
      </Section>

      <Section title="間距與圓角">
        <div className="flex flex-col gap-1.5">
          {(
            [
              { key: 'xs', step: 'p-1', className: 'w-1' },
              { key: 'sm', step: 'p-2', className: 'w-2' },
              { key: 'md', step: 'p-3', className: 'w-3' },
              { key: 'lg', step: 'p-4', className: 'w-4' },
              { key: 'xl', step: 'p-6', className: 'w-6' },
              { key: '2xl', step: 'p-8', className: 'w-8' },
              { key: '3xl', step: 'p-12', className: 'w-12' },
              { key: '4xl', step: 'p-16', className: 'w-16' },
            ] as const
          ).map(({ key, step, className }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-8 shrink-0 text-caption text-ink/70">{key}</span>
              <span className={`h-3 shrink-0 rounded-sm bg-graph-blue ${className}`} />
              <span className="text-caption text-ink/50">{step}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {(
            [
              { key: 'sm', className: 'rounded-sm' },
              { key: 'md', className: 'rounded-md' },
              { key: 'lg', className: 'rounded-lg' },
              { key: 'full', className: 'rounded-full' },
            ] as const
          ).map(({ key, className }) => (
            <div key={key} className="flex flex-col items-center gap-1.5">
              <div className={`h-12 w-12 border border-ink/15 bg-paper-2 ${className}`} />
              <p className="text-caption text-ink/70">{key}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="按鈕">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">記下今天</Button>
          <Button variant="secondary">稍後再說</Button>
          <Button variant="ghost">了解更多</Button>
          <Button variant="primary" disabled>
            已停用
          </Button>
        </div>
      </Section>

      <Section title="輸入元件">
        <div className="flex max-w-sm flex-col gap-5">
          <TextField
            label="你的顯化"
            placeholder="例如：我想要專注地完成這個專案"
            hint="用一句話描述你真心想要的事"
          />
          <TextField
            label="如果…就…"
            placeholder="如果會議讓我分心，我就先寫下三件事"
            error="請填寫你的如果—就—計畫"
          />
          <TextArea
            label="過程中的小行動"
            placeholder="描述你每天會重複做的小行動"
            hint="process over outcome"
          />
          <Slider
            label="信心程度"
            min={0}
            max={10}
            defaultValue={6}
            hint="0（還不確定）到 10（很有信心）"
          />
          <SegmentedControl
            label="查看範圍"
            defaultValue="week"
            options={[
              { value: 'today', label: '今天' },
              { value: 'week', label: '本週' },
              { value: 'cycle', label: '66 天' },
            ]}
          />
          <Checkbox label="今天已經記下足跡" defaultChecked />
          <Checkbox label="提醒我明天繼續" />
        </div>
      </Section>

      <Section title="卡片與提示">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <p className="text-heading font-bold text-ink">本週足跡</p>
            <p className="mt-2 text-body text-ink/80">
              你已經記下 <Highlight>4 天</Highlight> 的小行動，足跡會留在這裡，不會消失。
            </p>
          </Card>
          <div className="flex flex-col gap-3">
            <Toast tone="accent" message="已記下今天的足跡。" icon={<FootprintIcon />} />
            <Toast tone="neutral" message="今天沒做到也沒關係，明天再繼續就好。" />
          </div>
        </div>
      </Section>

      <Section title="空白狀態">
        <Card>
          <EmptyState
            icon={<FootprintIcon />}
            title="還沒有足跡"
            description="記下今天的第一個小行動，顯化路徑就會從這裡開始。"
            action={<Button variant="primary">記下今天</Button>}
          />
        </Card>
      </Section>

      <Section title="方格紙背景">
        <GraphPaper className="rounded-lg p-6">
          <p className="text-body text-ink">
            方格紙是實驗筆記的底紋，用來襯托顯化板上的卡片與手寫感的筆記。
          </p>
        </GraphPaper>
      </Section>
    </div>
  );
}

export default function StyleguidePage() {
  return (
    <main className="min-h-screen bg-paper-2 px-4 py-10 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-2">
          <p className="text-caption font-bold text-blue-text">LAB NOTEBOOK · 實驗筆記</p>
          <h1 className="text-display font-bold text-ink">
            <Highlight>設計系統</Highlight> 樣式指南
          </h1>
          <p className="text-body text-ink/80">
            每個元件在亮色與暗色模式下的樣子。暗色面板以 <code>data-theme=&quot;dark&quot;</code>{' '}
            強制顯示， 不受裝置系統設定影響。
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* The label stays outside the themed wrapper so it keeps the page's own theme. */}
          <div className="flex flex-col gap-4">
            <p className="text-caption font-bold text-ink/60">亮色模式 Light</p>
            <div data-theme="light" className="rounded-lg bg-paper-2 p-3">
              <Showcase />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <p className="text-caption font-bold text-ink/60">暗色模式 Dark</p>
            <div data-theme="dark" className="rounded-lg bg-paper-2 p-3">
              <Showcase />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
