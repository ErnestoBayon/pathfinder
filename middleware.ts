import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Protege rutas y refresca la sesión en cada request (patrón oficial @supabase/ssr).
// - Sin sesión en /home o /proyecto/* -> /login
// - Con sesión en /, /login o /signup -> /home
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: no metas lógica entre createServerClient y getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected =
    pathname.startsWith("/home") ||
    pathname.startsWith("/proyecto") ||
    pathname.startsWith("/calendar");
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (isAuthPage || pathname === "/")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/home";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  // Solo corre en las rutas relevantes (evita assets estáticos e imágenes).
  matcher: ["/", "/home/:path*", "/proyecto/:path*", "/calendar/:path*", "/login", "/signup"],
};
