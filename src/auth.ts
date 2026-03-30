import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "../auth.config";
import { getTenantClient } from "@/lib/tenant";
import { authorizeCredentials } from "@/lib/auth-helpers";

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
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
});
