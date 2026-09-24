import { MembershipRequired, Screen } from "@/components/screen";
import { requireActiveMembership } from "@/server/membership/access";
import { tokenTier } from "@/server/membership/metadata";
import { createDataClient } from "@/server/supabase";
import { getEnvironment } from "@/server/environment";
import { ServiceError } from "@/server/errors";
export const dynamic = "force-dynamic";
export default async function MembershipPage() {
  let data: Awaited<ReturnType<typeof requireActiveMembership>> | null = null;
  let unavailable = false;
  let tier = "Bronze";
  let hash: string | null = null;
  if (getEnvironment().GRINDLY_STAGE === "membership") {
    try {
      data = await requireActiveMembership();
      tier = await tokenTier(data.binding.token_id, data.ownership);
      const mint = await createDataClient()
        .from("chain_operations")
        .select("transaction_hash")
        .eq("contract_address", data.binding.contract_address)
        .eq("token_id", data.binding.token_id)
        .eq("status", "confirmed")
        .maybeSingle();
      if (mint.error) throw mint.error;
      hash = mint.data?.transaction_hash ?? null;
    } catch (error) {
      data = null;
      unavailable = !(
        error instanceof ServiceError && [401, 403, 404].includes(error.status)
      );
    }
  }
  return (
    <Screen title="My Membership">
      {unavailable ? (
        <p className="notice" role="alert">
          Ownership check unavailable. Please reload to retry.
        </p>
      ) : data ? (
        <section className="section account-state">
          <h2>{tier}</h2>
          <a
            className="email-target"
            href={`https://explorer.testnet.chain.robinhood.com/address/${data.binding.contract_address}`}
            target="_blank"
            rel="noreferrer"
          >
            {data.binding.contract_address}
          </a>
          <a
            href={`https://explorer.testnet.chain.robinhood.com/token/${data.binding.contract_address}/instance/${data.binding.token_id}`}
            target="_blank"
            rel="noreferrer"
          >
            Token #{data.binding.token_id}
          </a>
          {hash && (
            <a
              href={`https://explorer.testnet.chain.robinhood.com/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
            >
              Mint transaction
            </a>
          )}
        </section>
      ) : (
        <MembershipRequired />
      )}
    </Screen>
  );
}
