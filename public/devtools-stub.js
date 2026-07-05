// Suppress the "Download React DevTools" console warning.
// If the React DevTools extension is installed, its content script runs
// at document_start (before this tag) and sets this hook properly — this
// block is skipped. If the extension failed to load, the stub prevents
// React from printing the warning.
if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined') {
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { isDisabled: true };
}
