import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { SignJWT } from "jose";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
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
    async session({ session, token }) {
      session.user.id = token.sub ?? "";
      (session as any).user.email = token.email;

      // Sign a short-lived token the backend can verify, instead of the
      // backend trusting a plain X-User-Email header from the client.
      // Uses the same secret as AUTH_SECRET/NEXTAUTH_SECRET, which the
      // backend already requires to match this frontend's secret.
      if (token.email && process.env.AUTH_SECRET) {
        const key = new TextEncoder().encode(process.env.AUTH_SECRET);
        session.backendToken = await new SignJWT({ email: token.email as string })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("15m")
          .sign(key);
      }

      return session;
    },
  },
});
