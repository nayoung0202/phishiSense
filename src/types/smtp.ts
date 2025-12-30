export type SecurityMode = "SMTPS" | "STARTTLS" | "NONE";

export type SmtpConfigResponse = {
  tenantId: string;
  host: string;
  port: number;
  securityMode: SecurityMode;
  username?: string | null;
  fromEmail: string;
  fromName?: string | null;
  replyTo?: string | null;
  tlsVerify: boolean;
  rateLimitPerMin: number;
  allowedRecipientDomains?: string[] | null;
  isActive: boolean;
  lastTestedAt?: string | null;
  lastTestStatus?: "success" | "failure" | null;
  lastTestError?: string | null;
  hasPassword: boolean;
};

export type UpdateSmtpConfigPayload = {
  host: string;
  port: number;
  securityMode: SecurityMode;
  username?: string;
  password?: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  tlsVerify?: boolean;
  rateLimitPerMin?: number;
  allowedRecipientDomains?: string[];
  isActive?: boolean;
};

export type TestSmtpConfigPayload = {
  testRecipientEmail: string;
  testSubject?: string;
  testBody?: string;
};

export type SmtpConfigSummary = {
  tenantId: string;
  host: string;
  port: number;
  securityMode: SecurityMode;
  fromEmail: string;
  allowedRecipientDomains?: string[] | null;
  isActive: boolean;
  hasPassword: boolean;
  lastTestedAt?: string | null;
  lastTestStatus?: "success" | "failure" | null;
  updatedAt: string;
};
