const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!base || !key) {
  console.error("Supabase environment is incomplete. No request sent.");
  process.exitCode = 1;
} else {
  try {
    const response = await fetch(new URL("/auth/v1/settings", base), {
      headers: { apikey: key },
      signal: AbortSignal.timeout(15000),
    });
    console.log(`Supabase Auth connectivity: HTTP ${response.status}`);
    console.log("Read-only check. No users or data were created. Database policies are not tested by this check.");
    if (!response.ok) process.exitCode = 1;
  } catch (error) {
    console.error(`Supabase connectivity failed (${error.name}).`);
    process.exitCode = 1;
  }
}
