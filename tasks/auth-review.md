# Auth 코드 리뷰 — Kakao OAuth + NextAuth

검토 대상:

- `src/app/api/auth/[...nextauth]/route.ts`
- `src/lib/auth.ts`
- `src/middleware.ts`
- `src/lib/supabase.ts`

---

## 체크리스트 결과

| 항목                           | 결과 | 비고                                                                   |
| ------------------------------ | ---- | ---------------------------------------------------------------------- |
| Kakao authorization_url 정확성 | PASS | `https://kauth.kakao.com/oauth/authorize` 정확                         |
| Kakao token_url 정확성         | PASS | `https://kauth.kakao.com/oauth/token` 정확                             |
| Kakao userinfo_url 정확성      | PASS | `https://kapi.kakao.com/v2/user/me` 정확                               |
| profile() — user.id 매핑       | PASS | `String(profile.id)` — Kakao id는 number, string 변환 올바름           |
| profile() — email 매핑         | PASS | `kakao_account.email` 경로 정확. nullable 처리 있음                    |
| profile() — name 매핑          | PASS | `kakao_account.profile.nickname` 경로 정확                             |
| profile() — image 매핑         | PASS | `kakao_account.profile.profile_image_url` 정확                         |
| session에 user.id 포함         | PASS | `jwt` + `session` 콜백으로 `token.sub → session.user.id` 연결          |
| getAuthSession() 동작          | PASS | `getServerSession(authOptions)` 서버 컴포넌트/API Routes에서 표준 패턴 |
| requireAuth() 동작             | PASS | `session.user.id` 없으면 throw — API Routes에서 try/catch 필요         |

---

## 이슈 목록

### [BUG] middleware.ts 위치가 Next.js App Router 규칙과 불일치

**현재**: `src/middleware.ts`
**Next.js 요구사항**: middleware는 프로젝트 루트(`middleware.ts`) 또는 `src/` 바로 아래(`src/middleware.ts`)에 위치해야 함.

`src/middleware.ts`는 Next.js 13.1+ App Router에서 지원되므로 위치 자체는 유효. 단, **`src/` 디렉토리를 루트로 인식하는 설정이 tsconfig.json에 있는지 확인 필요**. 현재 `src/app/` 구조이므로 `src/middleware.ts`는 정상 동작할 가능성이 높지만, Vercel 배포 시 경로 해석이 달라질 수 있음.

**권고**: `middleware.ts`를 프로젝트 루트(`C:\...\ootd-re\middleware.ts`)로 이동하는 것이 가장 안전. 모호함 제거.

---

### [BUG] middleware matcher에 `/api/auth/:path*` 누락

**현재 matcher**:

```ts
[
  "/upload/:path*",
  "/ootd/:path*",
  "/calendar/:path*",
  "/api/ootd/:path*",
  "/api/usage/:path*",
];
```

`/api/auth/[...nextauth]`는 NextAuth 내부 경로이므로 보호 대상에서 **명시적으로 제외**되어야 함 (현재는 우연히 matcher에 없어서 통과). 이 자체는 정상이지만, 추후 팀원이 `/api/auth`를 matcher에 실수로 추가하면 OAuth 콜백이 차단됨.

**권고**: 주석으로 의도 명시:

```ts
export const config = {
  matcher: [
    // /api/auth는 NextAuth 내부 경로 — 보호 대상 제외 (의도적)
    "/upload/:path*",
    "/ootd/:path*",
    "/calendar/:path*",
    "/api/ootd/:path*",
    "/api/usage/:path*",
  ],
};
```

---

### [BUG] signIn 콜백 — upsert 충돌 전략이 id 불일치를 유발할 수 있음

**현재 코드**:

```ts
await supabaseAdmin.from("users").upsert(
  { id: user.id, email: user.email, name: ..., image: ... },
  { onConflict: "email", ignoreDuplicates: false },
);
```

**문제**: `onConflict: "email"`로 upsert 시, 동일 이메일로 Google과 Kakao 계정이 모두 로그인하면 두 번째 로그인 시 `id`가 첫 번째 로그인의 값과 달라도 upsert가 `id` 컬럼을 덮어씀. 결과적으로 DB의 `users.id`와 `token.sub`(JWT에 저장된 user.id)가 불일치하게 됨.

**재현 시나리오**:

1. Google로 첫 로그인 → `users` row 생성 (id = Google OAuth uid)
2. 동일 이메일로 Kakao 로그인 → upsert가 `id`를 Kakao uid로 덮어씀
3. 이후 `/api/ootd/*`에서 `session.user.id`로 DB 조회 시 참조 무결성 깨짐

**권고**: upsert 시 `id` 컬럼을 포함하지 않거나, `ignoreDuplicates: true`로 변경 + INSERT 실패 시 기존 row의 `id`를 조회해서 JWT에 반영하는 로직 추가. 가장 단순한 수정:

```ts
// 1. 기존 users row 확인
const { data: existing } = await supabaseAdmin
  .from("users")
  .select("id")
  .eq("email", user.email)
  .single();

if (existing) {
  // 이미 존재하면 name/image만 업데이트, id는 건드리지 않음
  user.id = existing.id; // JWT에 DB id 반영
  await supabaseAdmin
    .from("users")
    .update({ name: user.name ?? null, image: user.image ?? null })
    .eq("id", existing.id);
} else {
  // 신규 사용자 insert
  await supabaseAdmin.from("users").insert({
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
  });
}
```

---

### [WARN] Kakao scope — `account_email` 권한 별도 동의 필요

**현재 scope**: `"profile_nickname profile_image account_email"`

Kakao 개발자 콘솔에서 `account_email`은 **비즈니스 앱 또는 심사 필요 권한**. 개발용 앱(테스트 단계)에서는 등록된 테스터 계정만 이메일 동의가 가능하고, 미등록 계정은 이메일이 `null`로 옴.

**영향**: `signIn` 콜백의 `if (!user.email) return false;` 조건에 걸려 Kakao 로그인이 거부됨. 개발 단계에서 테스터 계정을 Kakao 개발자 콘솔에 등록하지 않으면 Kakao 로그인이 전혀 동작 안 함.

**권고**:

- Kakao 개발자 콘솔 → 앱 → 팀원 관리에 테스트 계정 등록 확인
- 또는 이메일 없는 Kakao 로그인도 허용하도록 `signIn` 콜백 수정 (이 경우 email nullable 처리 필요)

---

### [WARN] requireAuth()가 Error를 throw — API Routes에서 표준화 필요

**현재**:

```ts
export async function requireAuth() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}
```

API Routes에서 `try/catch` 없이 호출하면 Next.js가 500으로 응답. 클라이언트는 401이 아닌 500을 받게 됨.

**권고**: API Routes에서 호출하는 `requireAuth()`는 throw 대신 `NextResponse.json({ error: "Unauthorized" }, { status: 401 })`를 반환하거나, 호출부에서 반드시 try/catch 처리. 현재 패턴은 서버 컴포넌트용으로는 적절하나 API Routes에서는 주의 필요.

---

### [INFO] `/auth/signin` 페이지 미존재

`authOptions.pages.signIn: "/auth/signin"`으로 지정되어 있으나, `src/app/auth/signin/page.tsx`가 존재하지 않음. 로그인이 필요한 경로 접근 시 Next.js가 `/auth/signin`으로 리다이렉트하지만 404를 반환함.

**권고**: `src/app/auth/signin/page.tsx` 생성 필요 (팀쿡 또는 저커버그 담당). 없으면 미들웨어가 보호 경로를 차단할 때 404가 뜸.

---

---

## 2차 리뷰 추가 수정 (2026-05-28, 피차이)

### [BUG-FIX] middleware matcher — `/card/:path*` 누락 → 수정 완료

`src/app/(flow)/card/page.tsx`가 존재하지만 matcher에 없어 비인증 접근 가능.  
`"/card/:path*"` 추가 완료.

### [BUG-FIX] signIn 멀티 Provider 충돌 — 완전 수정 완료 (젠슨)

단순 `onConflict` 변경에서 한 단계 더 나아가, email 기준으로 기존 row를 먼저 조회한 후:

- 기존 사용자: `user.id = existing.id`로 JWT에 DB id 반영 + name/image만 업데이트 (id 불변)
- 신규 사용자: insert

동일 이메일로 Google + Kakao 양쪽 로그인해도 DB id가 항상 일관되게 유지됨.

**tsc --noEmit PASS 확인.**

---

## 종합 평가

**전체 상태: 조건부 PASS — BUG 3건 수정 전 Kakao 로그인 신뢰도 낮음**

- Kakao URL/profile 매핑: 정확
- JWT → session.user.id 흐름: 정확
- **BUG 1 (middleware 위치)**: Vercel 배포 전 루트로 이동 권고
- **BUG 2 (upsert id 충돌)**: 수정 완료 (`onConflict: "id"`)
- **BUG 3 (Kakao scope)**: 개발 단계 테스터 미등록 시 Kakao 로그인 100% 실패. 즉시 확인 필요
- **BUG 4 (middleware /card 누락)**: 수정 완료
- **WARN (requireAuth)**: API Routes 호출 패턴 주의 필요
- **INFO (signin 페이지 미존재)**: 미들웨어 보호 시 404 발생 — 조기 생성 필요
