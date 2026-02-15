import type { UserRole } from "@prisma/client";
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      loginId: string;
      role: UserRole;
    };
  }

  interface User {
    id: string;
    loginId: string;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    loginId: string;
    role: UserRole;
  }
}
