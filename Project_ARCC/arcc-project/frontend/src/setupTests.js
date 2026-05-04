globalThis.IS_REACT_ACT_ENVIRONMENT = true;

if (typeof TextEncoder === "undefined") {
  const { TextEncoder, TextDecoder } = require("node:util");

  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}
