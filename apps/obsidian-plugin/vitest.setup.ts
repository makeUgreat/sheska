// In Node test environment, alias window to globalThis so plugin code that
// calls window.setInterval / window.clearInterval works without a browser.
globalThis.window = globalThis as never;