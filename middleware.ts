import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { hasDatabaseIdentity } from "@/lib/auth-token";

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!hasDatabaseIdentity(token)) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/upload/:path*",
    "/card/:path*",
    "/ootd/:path*",
    "/calendar/:path*",
    "/api/ootd/:path*",
    "/api/usage/:path*",
  ],
};
