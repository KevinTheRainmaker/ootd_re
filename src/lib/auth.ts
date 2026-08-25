import { type NextAuthOptions, getServerSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { supabaseAdmin } from "@/lib/supabase";
import {
  canLinkGoogleAccount,
  hydrateAuthToken,
  type AuthUserRepository,
} from "@/lib/auth-token";

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

const authUserRepository: AuthUserRepository = {
  async findByEmail(email) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, plan")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      throw new Error(`auth_user_lookup_failed: ${error.message}`);
    }
    if (!data) return null;
    return {
      id: data.id,
      plan: data.plan === "pro" ? "pro" : "free",
    };
  },

  async updateProfile(id, profile) {
    const { error } = await supabaseAdmin
      .from("users")
      .update(profile)
      .eq("id", id);

    if (error) {
      throw new Error(`auth_user_update_failed: ${error.message}`);
    }
  },

  async createUser(user) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .insert(user)
      .select("id, plan")
      .single();

    if (error || !data) {
      throw new Error(
        `auth_user_create_failed: ${error?.message ?? "missing user data"}`,
      );
    }
    return {
      id: data.id,
      plan: data.plan === "pro" ? "pro" : "free",
    };
  },

  reportProfileUpdateError() {
    console.warn("[auth] best-effort profile update failed");
  },
};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      return canLinkGoogleAccount(user.email, account?.provider, profile);
    },

    async jwt({ token, user }) {
      return hydrateAuthToken(token, user, authUserRepository);
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
