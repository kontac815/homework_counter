export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/", "/scan/:path*", "/today/:path*", "/leaderboard/:path*", "/tv/:path*", "/admin/:path*"]
};
