export type OidcDiscovery = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri: string;
};

export type OidcTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
};

export type OidcIdTokenClaims = {
  iss: string;
  aud: string | string[];
  exp: number;
  iat?: number;
  sub: string;
  nonce?: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
};

export type AuthUserPrincipal = {
  sub: string;
  email: string | null;
  name: string | null;
};

export type AuthSessionRecord = {
  sessionId: string;
  sub: string;
  email: string | null;
  name: string | null;
  accessTokenExp: Date | null;
  refreshTokenEnc: string | null;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type OidcAuthTransaction = {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
  createdAt: number;
};
