import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearch(query: string) {
  console.log(`Searching for: ${query}`);
  const { data, error } = await (supabase as any)
    .schema("datasul")
    .from("item")
    .select("it_codigo, desc_item, item_uni_estab!inner(nr_linha)")
    .eq("item_uni_estab.nr_linha", 105)
    .or(`it_codigo.ilike.%${query}%,desc_item.ilike.%${query}%`)
    .limit(10);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Results:");
  data?.forEach((p: any) => {
    console.log(`- Code: ${p.it_codigo} | Desc: ${p.desc_item}`);
  });
}

testSearch("6100");
