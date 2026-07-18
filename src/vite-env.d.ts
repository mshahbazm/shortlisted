/// <reference types="vite/client" />

// CRXJS: importing a script with ?script returns its emitted file path,
// usable with chrome.scripting.executeScript.
declare module '*?script' {
  const path: string
  export default path
}
