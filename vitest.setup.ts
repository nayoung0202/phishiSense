import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./src/mocks/server";

const originalFetch = globalThis.fetch;

globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input === "string" && input.startsWith("/")) {
    return originalFetch(new URL(input, "http://localhost").toString(), init);
  }
  if (input instanceof URL && input.pathname.startsWith("/")) {
    return originalFetch(new URL(input.toString(), "http://localhost").toString(), init);
  }
  return originalFetch(input, init);
};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = globalThis.ResizeObserver ?? ResizeObserverMock;

const elementPrototype = globalThis.HTMLElement?.prototype as
  | (HTMLElement & {
      hasPointerCapture?: (pointerId: number) => boolean;
      setPointerCapture?: (pointerId: number) => void;
      releasePointerCapture?: (pointerId: number) => void;
    })
  | undefined;

if (elementPrototype && typeof elementPrototype.hasPointerCapture !== "function") {
  elementPrototype.hasPointerCapture = () => false;
}

if (elementPrototype && typeof elementPrototype.setPointerCapture !== "function") {
  elementPrototype.setPointerCapture = () => {};
}

if (elementPrototype && typeof elementPrototype.releasePointerCapture !== "function") {
  elementPrototype.releasePointerCapture = () => {};
}

if (elementPrototype && typeof elementPrototype.scrollIntoView !== "function") {
  elementPrototype.scrollIntoView = () => {};
}
