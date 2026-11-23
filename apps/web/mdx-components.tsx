import type { MDXComponents } from 'mdx/types';

/** Article typography for MDX in content/resources — lab notebook, 16–17px body. */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h2: (props) => <h2 className="mt-8 text-xl" {...props} />,
    h3: (props) => <h3 className="mt-6 text-lg" {...props} />,
    p: (props) => <p className="mt-4 leading-[1.75] text-ink" {...props} />,
    ul: (props) => <ul className="mt-4 list-disc space-y-2 ps-6" {...props} />,
    ol: (props) => <ol className="mt-4 list-decimal space-y-2 ps-6" {...props} />,
    li: (props) => <li className="leading-[1.75]" {...props} />,
    strong: (props) => <strong className="font-bold" {...props} />,
    blockquote: (props) => (
      <blockquote
        className="mt-4 rounded-notebook border-s-4 border-highlighter bg-paper-2 px-4 py-3"
        {...props}
      />
    ),
    ...components,
  };
}
