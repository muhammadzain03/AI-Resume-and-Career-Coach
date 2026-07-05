globalThis.IS_REACT_ACT_ENVIRONMENT = true;

global.IntersectionObserver = class {
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

if (typeof TextEncoder === "undefined") {
  const { TextEncoder, TextDecoder } = require("node:util");

  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}
