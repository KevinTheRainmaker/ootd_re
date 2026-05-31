import { type NextAuthOptions, getServerSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { supabaseAdmin } from "@/lib/supabase";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      plan: "free" | "pro";
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    dbId?: string;
    plan?: "free" | "pro";
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      return !!user.email;
    },

    async jwt({ token, user }) {
      // 첫 로그인 시에만 실행 (user가 있을 때)
      if (user?.email) {
        const email = user.email;

        const { data: existing } = await supabaseAdmin
          .from("users")
          .select("id, plan")
          .eq("email", email)
          .single();

        if (existing) {
          token.dbId = existing.id;
          token.plan = (existing.plan as "free" | "pro") ?? "free";
          await supabaseAdmin
            .from("users")
            .update({ name: user.name ?? null, image: user.image ?? null })
            .eq("id", existing.id);
        } else {
          const { data: inserted } = await supabaseAdmin
            .from("users")
            .insert({
              email,
              name: user.name ?? null,
              image: user.image ?? null,
            })
            .select("id")
            .single();
          token.dbId = inserted?.id ?? undefined;
          token.plan = "free";
        }
      }
      return token;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: { session: any; token: JWT }) {
      if (session.user && token.dbId) {
        session.user.id = token.dbId;
        session.user.plan = token.plan ?? "free";
      }
      return session;
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
