import "server-only";
import { createDataClient } from "../supabase";
import { mintMembership } from "./issuance";

export async function reconcileMints() {
  const operations = await createDataClient()
    .from("chain_operations")
    .select("id,member_id")
    .in("status", ["created", "signed", "broadcast", "confirmed"])
    .is("binding_completed_at", null)
    .order("nonce", { ascending: true, nullsFirst: false });
  if (operations.error) throw new Error("Could not load unfinished operations");
  const results = [];
  for (const operation of operations.data) {
    try {
      const result = await mintMembership(operation.member_id);
      results.push({ operationId: operation.id, status: result.status });
    } catch {
      results.push({ operationId: operation.id, status: "retry-required" });
    }
  }
  return results;
}
