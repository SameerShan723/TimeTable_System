// @/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createSupabaseServerClient = () => {
  // cookies() must be awaited in Next.js 14+
  const getCookieStore = async () => await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await getCookieStore();
          return cookieStore.get(name)?.value;
        },

        set(/* name, value, options */) {
          // No-op: Cookie setting only allowed in server actions
        },
        // No-op: Only allowed in server actions
        remove(/* name, options */) {
          // No-op: Cookie removal only allowed in server actions
        },
      },
    }
  );
};
