import { categories } from "@/lib/categories";

export async function GET() {
  return Response.json({ categories });
}
