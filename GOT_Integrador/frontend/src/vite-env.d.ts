// src/vite-env.d.ts
/// <reference types="vite/client" />

// Declaraciones para importar CSS en TypeScript
declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.scss' {
  const content: string;
  export default content;
}

declare module '*.sass' {
  const content: string;
  export default content;
}

declare module '*.less' {
  const content: string;
  export default content;
}

// Declaraciones para assets de Figma
declare module 'figma:asset/*' {
  const src: string;
  export default src;
}