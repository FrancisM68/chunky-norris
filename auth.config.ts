/**
 * Edge-safe Auth.js config — no Node.js-only imports.
 * Used by middleware.ts (Edge runtime) and extended by src/auth.ts (Node.js).
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [], // Credentials provider added in src/auth.ts only (Node.js)
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jwt({ token, user }: any) {
      if (user) {
        token.volunteerId = user.id;
        token.roles = user.roles;
      }
      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session({ session, token }: any) {
      session.user.volunteerId = token.volunteerId;
      session.user.roles = token.roles;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
