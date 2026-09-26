import "@testing-library/jest-dom/vitest";

Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  writable: true,
  value: () => undefined,
});
