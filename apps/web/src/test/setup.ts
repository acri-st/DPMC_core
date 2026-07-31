import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement ResizeObserver or Element.scrollIntoView, both of
// which cmdk (Command/Popover) relies on internally. Polyfill them once here
// so any component test using those primitives works out of the box.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver =
    ResizeObserverMock as unknown as typeof ResizeObserver;
}
if (typeof Element.prototype.scrollIntoView === 'undefined') {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
