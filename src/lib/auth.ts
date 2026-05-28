import { type NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth";
import { supabaseAdmin } from "@/lib/supabase";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

interface KakaoProfile {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
}

function KakaoProvider(
  options: OAuthUserConfig<KakaoProfile>,
): OAuthConfig<KakaoProfile> {
  return {
    id: "kakao",
    name: "Kakao",
    type: "oauth",
    authorization: {
      url: "https://kauth.kakao.com/oauth/authorize",
      params: { scope: "profile_nickname profile_image account_email" },
    },
    token: "https://kauth.kakao.com/oauth/token",
    userinfo: "https://kapi.kakao.com/v2/user/me",
    profile(profile: KakaoProfile) {
      // 개발 앱 미심사 계정은 email=null — fallback으로 로그인 차단 방지
      const email =
        profile.kakao_account?.email ?? `kakao_${profile.id}@noemail.ootd`;
      return {
        id: String(profile.id),
        name: profile.kakao_account?.profile?.nickname ?? null,
        email,
        image: profile.kakao_account?.profile?.profile_image_url ?? null,
      };
    },
    style: { logo: "/kakao.svg", bg: "#FEE500", text: "#000000" },
    options,
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      // 이미 가입된 이메일인지 먼저 확인 (멀티 Provider 충돌 방지)
      // Google + Kakao 동일 이메일 시나리오에서 DB id가 덮어씌워지는 것을 막음
      const { data: existing } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", user.email)
        .single();

      if (existing) {
        // 기존 row: JWT에 DB id를 반영하고 name/image만 업데이트 (id 불변)
        user.id = existing.id;
        await supabaseAdmin
          .from("users")
          .update({ name: user.name ?? null, image: user.image ?? null })
          .eq("id", existing.id);
      } else {
        // 신규 사용자: insert
        const { error } = await supabaseAdmin.from("users").insert({
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
        });
        if (error) return false;
      }

      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
};

export async function getAuthSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}
