// Vite returns the (minified) file contents as a string for `?inline` imports.
declare module '*.css?inline' {
  const css: string;
  export default css;
}

// Tests read the source CSS as text.
declare module '*.css?raw' {
  const css: string;
  export default css;
}
