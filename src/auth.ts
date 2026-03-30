import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { Role } from "@prisma/client";
import { JWT } from "next-auth/jwt";
import { getTenantClient } from "@/lib/tenant";
import { authorizeCredentials } from "@/lib/auth-helpers";

export const { auth, signIn, signOut, handlers } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const db = getTenantClient("dar");
        return authorizeCredentials(
          {
            email: credentials.email as string,
            password: credentials.password as string,
          },
          db
        );
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.volunteerId = user.id as string;
        token.roles = (user as { id: string; roles: Role[] }).roles;
      }
      return token;
    },
    session({ session, token }) {
      const jwt = token as JWT;
      session.user.volunteerId = jwt.volunteerId;
      session.user.roles = jwt.roles;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
