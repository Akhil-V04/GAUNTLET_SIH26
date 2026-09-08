const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "OPENAI_API_KEY", "GROQ_API_KEY"];
let missing = false;
for (const name of required) {
  const value = process.env[name]?.trim();
  const configured = Boolean(value) && !value.includes("your-project");
  console.log(`${name}: ${configured ? "configured" : "missing"}`);
  if (!configured) missing = true;
}
console.log("Values are never printed. Configuration presence does not prove service access.");
process.exitCode = missing ? 1 : 0;
