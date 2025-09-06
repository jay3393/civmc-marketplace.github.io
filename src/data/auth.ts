export type ProviderSession = {
  provider_token?: string | null | undefined;
} & Record<string, unknown>;

export type UserMetadata = {
  provider_id?: string;
  sub?: string;
} & Record<string, unknown>; 