import "@testing-library/jest-dom/vitest";
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
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = globalThis.ResizeObserver ?? ResizeObserverMock;
