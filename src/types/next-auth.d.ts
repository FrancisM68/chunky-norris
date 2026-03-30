import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      volunteerId: string;
      roles: Role[];
    } & DefaultSession["user"];
  }

  interface User {
    roles: Role[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    volunteerId: string;
    roles: Role[];
  }
}
