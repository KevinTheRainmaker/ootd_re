export interface AuthTokenState {
  email?: string | null;
  dbId?: string;
  plan?: "free" | "pro";
}

export interface AuthUserRecord {
  id: string;
  plan: "free" | "pro";
}

export interface AuthProviderUser {
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

export interface AuthUserRepository {
  findByEmail(email: string): Promise<AuthUserRecord | null>;
  updateProfile(
    id: string,
    profile: { name: string | null; image: string | null },
  ): Promise<void>;
  createUser(user: {
    email: string;
    name: string | null;
    image: string | null;
  }): Promise<AuthUserRecord>;
  reportProfileUpdateError?(error: unknown): void;
}

export function canLinkGoogleAccount(
  email: string | null | undefined,
  provider: string | null | undefined,
  profile: unknown,
): boolean {
  return (
    Boolean(email) &&
    provider === "google" &&
    typeof profile === "object" &&
    profile !== null &&
    "email_verified" in profile &&
    profile.email_verified === true
  );
}

export function hasDatabaseIdentity(
  token: AuthTokenState | null | undefined,
): boolean {
  return typeof token?.dbId === "string" && token.dbId.length > 0;
}

export async function hydrateAuthToken<T extends AuthTokenState>(
  token: T,
  providerUser: AuthProviderUser | undefined,
  repository: AuthUserRepository,
): Promise<T> {
  if (!providerUser) return token;

  const email = providerUser.email;
  if (!email) return token;

  const existing = await repository.findByEmail(email);
  if (existing) {
    token.dbId = existing.id;
    token.plan = existing.plan;
    if (providerUser) {
      try {
        await repository.updateProfile(existing.id, {
          name: providerUser.name ?? null,
          image: providerUser.image ?? null,
        });
      } catch (error) {
        repository.reportProfileUpdateError?.(error);
      }
    }
    return token;
  }

  if (!providerUser) return token;

  const created = await repository.createUser({
    email,
    name: providerUser.name ?? null,
    image: providerUser.image ?? null,
  });
  token.dbId = created.id;
  token.plan = created.plan;

  return token;
}
