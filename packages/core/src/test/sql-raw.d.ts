// Vite's ?raw imports: the SQL seed is read as a string so a test can check it
// stays in step with packages/core/src/seed.
declare module '*.sql?raw' {
  const content: string;
  export default content;
}
