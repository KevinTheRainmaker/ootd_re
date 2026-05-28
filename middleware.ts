import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/signin",
  },
});

export const config = {
  matcher: [
    // /api/auth는 NextAuth 내부 경로 — 보호 대상 제외 (의도적)
    "/upload/:path*",
    "/card/:path*",
    "/ootd/:path*",
    "/calendar/:path*",
    "/api/ootd/:path*",
    "/api/usage/:path*",
  ],
};
