"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function collaborationSignOut() {
  const database = await createClient();
  await database.auth.signOut();
  redirect("/");
}

