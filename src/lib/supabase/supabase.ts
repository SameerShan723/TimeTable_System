// @/lib/supabase/supabase.ts
import { createClient, REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

export { supabase, REALTIME_SUBSCRIBE_STATES };
