import assert from "node:assert/strict";
import { test } from "node:test";

interface AuthToken {
  email?: string | null;
  dbId?: string;
  plan?: "free" | "pro";
}

interface ProviderUser {
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

interface AuthUserRepository {
  findByEmail: (
    email: string,
  ) => Promise<{ id: string; plan: "free" | "pro" } | null>;
  updateProfile?: (
    id: string,
    profile: { name: string | null; image: string | null },
  ) => Promise<void>;
  createUser?: (user: {
    email: string;
    name: string | null;
    image: string | null;
  }) => Promise<{ id: string; plan: "free" | "pro" }>;
}

interface AuthTokenModule {
  canLinkGoogleAccount?: (
    email: string | null | undefined,
    provider: string | null | undefined,
    profile: unknown,
  ) => boolean;
  hasDatabaseIdentity?: (token: AuthToken | null | undefined) => boolean;
  hydrateAuthToken?: (
    token: AuthToken,
    providerUser: ProviderUser | undefined,
    repository: AuthUserRepository,
  ) => Promise<AuthToken>;
}

let authTokenModule: AuthTokenModule = {};
try {
  // RED 단계에서도 테스트 파일 자체는 실행되어, 누락된 복구 함수 때문에 실패하게 한다.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  authTokenModule = require("./auth-token") as AuthTokenModule;
} catch {
  authTokenModule = {};
}

test("검증된 Google 이메일만 DB 계정 연결을 허용한다", () => {
  assert.equal(typeof authTokenModule.canLinkGoogleAccount, "function");
  assert.equal(
    authTokenModule.canLinkGoogleAccount!(
      "user@example.com",
      "google",
      { email_verified: true },
    ),
    true,
  );
  assert.equal(
    authTokenModule.canLinkGoogleAccount!(
      "user@example.com",
      "google",
      { email_verified: false },
    ),
    false,
  );
  assert.equal(
    authTokenModule.canLinkGoogleAccount!(
      "user@example.com",
      "another-provider",
      { email_verified: true },
    ),
    false,
  );
});

test("보호 경로는 DB 사용자 ID가 있는 JWT만 인증된 것으로 처리한다", () => {
  assert.equal(typeof authTokenModule.hasDatabaseIdentity, "function");
  assert.equal(authTokenModule.hasDatabaseIdentity!(undefined), false);
  assert.equal(authTokenModule.hasDatabaseIdentity!({ email: "user@example.com" }), false);
  assert.equal(
    authTokenModule.hasDatabaseIdentity!({ dbId: "database-user-id" }),
    true,
  );
});

test("기존 JWT에 dbId가 없으면 이메일만으로 DB 계정에 재연결하지 않는다", async () => {
  assert.equal(typeof authTokenModule.hydrateAuthToken, "function");

  const lookedUpEmails: string[] = [];
  const token = await authTokenModule.hydrateAuthToken!(
    { email: "user@example.com" },
    undefined,
    {
      async findByEmail(email) {
        lookedUpEmails.push(email);
        return { id: "database-user-id", plan: "pro" };
      },
    },
  );

  assert.deepEqual(lookedUpEmails, []);
  assert.equal(token.dbId, undefined);
  assert.equal(token.plan, undefined);
});

test("최초 로그인 사용자가 없으면 생성된 DB ID를 JWT에 기록한다", async () => {
  assert.equal(typeof authTokenModule.hydrateAuthToken, "function");

  const token = await authTokenModule.hydrateAuthToken!(
    {},
    {
      email: "new-user@example.com",
      name: "New User",
      image: "https://example.com/avatar.png",
    },
    {
      async findByEmail() {
        return null;
      },
      async createUser(user) {
        assert.equal(user.email, "new-user@example.com");
        return { id: "new-database-user-id", plan: "free" };
      },
    },
  );

  assert.equal(token.dbId, "new-database-user-id");
  assert.equal(token.plan, "free");
});

test("기존 사용자 프로필 갱신 실패는 로그인 자체를 차단하지 않는다", async () => {
  assert.equal(typeof authTokenModule.hydrateAuthToken, "function");

  const token = await authTokenModule.hydrateAuthToken!(
    {},
    { email: "user@example.com", name: "Updated", image: null },
    {
      async findByEmail() {
        return { id: "existing-database-user-id", plan: "free" };
      },
      async updateProfile() {
        throw new Error("temporary profile update failure");
      },
    },
  );

  assert.equal(token.dbId, "existing-database-user-id");
  assert.equal(token.plan, "free");
});
