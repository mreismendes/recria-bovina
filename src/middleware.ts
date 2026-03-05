/**
 * src/middleware.ts
 * Protects all routes except /login and NextAuth API routes.
 * Uses NextAuth's built-in JWT verification via withAuth.
 */
export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     *  - /login
     *  - /api/auth/* (NextAuth routes)
     *  - /_next/*    (Next.js internals)
     *  - /favicon.ico
     *  - Public static files (e.g. /modelo-importacao.xlsx)
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:xlsx|csv|pdf|png|jpg|jpeg|svg|ico)$).*)",
  ],
};
