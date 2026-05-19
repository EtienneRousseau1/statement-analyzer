import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { jwtEncode } from "next-auth/jwt";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  jwt: {
    encode: async ({ token, secret }) => {
      return jwtEncode({ token, secret, maxAge: 30 * 24 * 60 * 60 });
    },
  },
  callbacks: {
    jwt({ token, account, profile }) {
      if (account && profile) {
        token.sub = profile.sub ?? undefined;
        token.email = profile.email ?? undefined;
        token.name = profile.name;
        token.picture = profile.picture as string | undefined;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      // Store JWT token data on session for API calls
      (session as any).user.email = token.email;
      return session;
    },
  },
});
