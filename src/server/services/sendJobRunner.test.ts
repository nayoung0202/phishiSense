import { describe, expect, it, vi } from "vitest";
import type { Transporter } from "nodemailer";
import {
  isSmtpConnectionError,
  verifySmtpTransportWithFallback,
} from "./sendJobRunner";

const buildTransporterMock = (verifyImpl: () => Promise<void>) => {
  const close = vi.fn();
  return {
    transport: {
      verify: vi.fn(verifyImpl),
      close,
    } as unknown as Transporter,
    close,
  };
};

describe("verifySmtpTransportWithFallback", () => {
  it("465 연결 오류면 587 STARTTLS로 fallback한다", async () => {
    const firstTransport = buildTransporterMock(async () => {
      throw Object.assign(new Error("connect failed"), { code: "ECONNREFUSED" });
    });
    const secondTransport = buildTransporterMock(async () => {});
    const createTransporter = vi
      .fn()
      .mockReturnValueOnce(firstTransport.transport)
      .mockReturnValueOnce(secondTransport.transport);

    const transport = await verifySmtpTransportWithFallback(
      {
        host: "smtp.example.com",
        user: "user",
        pass: "pass",
        port: 465,
        secure: true,
        allowInvalidTls: false,
      },
      createTransporter,
    );

    expect(transport).toBe(secondTransport.transport);
    expect(createTransporter).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ port: 465, secure: true }),
      { port: 465, secure: true },
    );
    expect(createTransporter).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ port: 465, secure: true }),
      { port: 587, secure: false, requireTLS: true },
    );
    expect(firstTransport.close).toHaveBeenCalled();
  });

  it("연결 오류가 아니면 fallback하지 않는다", async () => {
    const authError = Object.assign(new Error("auth failed"), { code: "EAUTH" });
    const firstTransport = buildTransporterMock(async () => {
      throw authError;
    });
    const createTransporter = vi.fn().mockReturnValue(firstTransport.transport);

    await expect(
      verifySmtpTransportWithFallback(
        {
          host: "smtp.example.com",
          user: "user",
          pass: "pass",
          port: 465,
          secure: true,
          allowInvalidTls: false,
        },
        createTransporter,
      ),
    ).rejects.toBe(authError);
    expect(createTransporter).toHaveBeenCalledTimes(1);
  });
});

describe("isSmtpConnectionError", () => {
  it("알려진 연결 오류 코드를 감지한다", () => {
    expect(isSmtpConnectionError({ code: "ETIMEDOUT" })).toBe(true);
    expect(isSmtpConnectionError({ command: "CONN" })).toBe(true);
    expect(isSmtpConnectionError({ code: "EAUTH" })).toBe(false);
  });
});
