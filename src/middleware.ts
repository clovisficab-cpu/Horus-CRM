import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Proteção de rotas: /admin (equipe) e /portal (clientes)
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && session.role === "CLIENT") {
    return NextResponse.redirect(new URL("/portal", req.url));
  }
  if (pathname.startsWith("/portal") && session.role !== "CLIENT") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*"],
};
