import { createDataClient } from "../src/server/supabase";
import { mintMembership } from "../src/server/membership/issuance";
const db = createDataClient();
const operations = await db
  .from("chain_operations")
  .select("id,member_id")
  .in("status", ["created", "signed", "broadcast"])
  .order("nonce", { ascending: true, nullsFirst: false });
if (operations.error) throw new Error("Could not load pending operations");
for (const operation of operations.data) {
  try {
    const result = await mintMembership(operation.member_id);
    console.log({ operationId: operation.id, status: result.status });
  } catch {
    console.error({ operationId: operation.id, status: "retry-required" });
    process.exitCode = 1;
  }
}
