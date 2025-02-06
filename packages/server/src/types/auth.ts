export type DecodedAccessToken = {
  userId: string;
  rememberMe: boolean;
  exp: number;
  iat: number;
};

export type AccessTokenValues = {
  userId: string | undefined;
  rememberMe?: boolean;
};
