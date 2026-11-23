import type { MDXComponents } from 'mdx/types';
import Callout from './components/mdx/Callout';
import Citation from './components/mdx/Citation';
import TryToday from './components/mdx/TryToday';

/**
 * Components available to every MDX file without an import, plus the element
 * overrides that give article prose its notebook look. Typography lives here
 * rather than in a plugin so the MDX stays plain Markdown.
 */
export function useMDXComponents(components: MDXComponents = {}): MDXComponents {
  return {
    Callout,
    TryToday,
    Citation,

    h2: ({ children, ...props }) => (
      <h2 className="mt-12 mb-4 text-[1.375rem] font-bold tracking-tight sm:text-2xl" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className="mt-8 mb-3 text-lg font-bold" {...props}>
        {children}
      </h3>
    ),
    p: ({ children, ...props }) => (
      <p className="my-5" {...props}>
        {children}
      </p>
    ),
    ul: ({ children, ...props }) => (
      <ul className="my-5 list-disc space-y-2 ps-6" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="my-5 list-decimal space-y-2 ps-6" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="ps-1" {...props}>
        {children}
      </li>
    ),
    strong: ({ children, ...props }) => (
      <strong className="font-bold" {...props}>
        {children}
      </strong>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote className="my-6 border-l-[3px] border-rule ps-5 text-ink-muted" {...props}>
        {children}
      </blockquote>
    ),
    a: ({ children, ...props }) => (
      <a
        className="text-blue-text underline decoration-graph-blue/40 decoration-1 underline-offset-2 hover:decoration-graph-blue"
        {...props}
      >
        {children}
      </a>
    ),
    hr: (props) => <hr className="my-10 border-0 border-t border-rule" {...props} />,
    code: ({ children, ...props }) => (
      <code className="font-latin rounded bg-paper-2 px-1.5 py-0.5 text-[0.9em]" {...props}>
        {children}
      </code>
    ),

    ...components,
  };
}
