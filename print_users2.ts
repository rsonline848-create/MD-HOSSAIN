import { db } from "./src/db/index.ts";
import { shops } from "./src/db/schema.ts";
import { eq } from "drizzle-orm";

async function run() {
  const shopId = "ml_electric_main";
  const result = await db.select().from(shops).where(eq(shops.id, shopId));
  if (result.length > 0) {
    let data = result[0].data as any;
    if (data && data.users) {
      console.log(JSON.stringify(data.users, null, 2));
    }
  }
  process.exit(0);
}
run();
