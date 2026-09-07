import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getCurrentAccount() {
  const database = await createClient();
  const {
    data: { user },
  } = await database.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile, error } = await database
    .from("collab_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(`Unable to load collaboration profile: ${error.message}`);
  return { user, profile };
}

