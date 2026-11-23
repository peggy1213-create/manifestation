// @types/mdx types the default export of an `.mdx` module; our articles also export
// `frontmatter` (via remark-mdx-frontmatter, configured in next.config.ts).
declare module '*.mdx' {
  export const frontmatter: Record<string, unknown>;
}
