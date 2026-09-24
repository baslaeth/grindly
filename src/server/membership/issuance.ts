import "server-only";
import { randomBytes } from "node:crypto";
import {
  createWalletClient,
  encodeFunctionData,
  http,
  keccak256,
  parseEventLogs,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { robinhoodTestnet } from "viem/chains";
import { createDataClient } from "../supabase";
import { getEnvironment } from "../environment";
import { ServiceError } from "../errors";
import { membershipAbi, membershipChain } from "./chain";
import { bindOwnedToken } from "./access";

export async function mintMembership(memberId: string) {
  const { client, address } = membershipChain();
  const db = createDataClient();
  const env = getEnvironment();
  const account = privateKeyToAccount(env.ISSUER_PRIVATE_KEY as Hex);
  if (
    (await client.getChainId()) !== 46630 ||
    (
      await client.readContract({
        address,
        abi: membershipAbi,
        functionName: "issuer",
      })
    ).toLowerCase() !== account.address.toLowerCase()
  )
    throw new ServiceError(
      "ISSUER_UNAVAILABLE",
      "Issuance configuration unavailable.",
      503,
      true,
    );
  const created = await db.rpc("create_mint_operation", {
    p_member: memberId,
    p_contract: address,
    p_key: `0x${randomBytes(32).toString("hex")}`,
  });
  if (created.error) throw created.error;
  const operationId = created.data;
  async function reload() {
    const result = await db
      .from("chain_operations")
      .select("*")
      .eq("id", operationId)
      .eq("member_id", memberId)
      .single();
    if (result.error) throw result.error;
    return result.data;
  }
  let operation = await reload();
  if (operation.status === "reverted")
    return {
      operationId,
      status: "reverted",
      transactionHash: operation.transaction_hash,
    };
  if (operation.status !== "confirmed") {
    if (!operation.signed_transaction) {
      const pending = await client.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      });
      const allocated = await db.rpc("allocate_mint_nonce", {
        p_operation: operation.id,
        p_issuer: account.address.toLowerCase(),
        p_pending: pending,
      });
      if (allocated.error) throw allocated.error;
      const nonce = Number(allocated.data);
      if (!Number.isSafeInteger(nonce)) throw new Error("Nonce out of range");
      const wallet = createWalletClient({
        account,
        chain: robinhoodTestnet,
        transport: http(env.ROBINHOOD_RPC_URL),
      });
      const request = await wallet.prepareTransactionRequest({
        to: address,
        nonce,
        data: encodeFunctionData({
          abi: membershipAbi,
          functionName: "mint",
          args: [
            operation.recipient_address as Hex,
            operation.issuance_key as Hex,
          ],
        }),
      });
      const signed = await wallet.signTransaction(request);
      const persisted = await db.rpc("persist_mint_transaction", {
        p_operation: operation.id,
        p_signed: signed,
        p_hash: keccak256(signed),
      });
      if (persisted.error) throw persisted.error;
      // Concurrent signers must broadcast only the transaction that won persistence.
      operation = await reload();
    }
    const hash = operation.transaction_hash as Hex;
    let receipt = await client
      .getTransactionReceipt({ hash })
      .catch(() => null);
    if (!receipt) {
      try {
        await client.sendRawTransaction({
          serializedTransaction: operation.signed_transaction as Hex,
        });
      } catch {
        if (!(await client.getTransaction({ hash }).catch(() => null)))
          throw new ServiceError(
            "BROADCAST_UNAVAILABLE",
            "Mint is saved. Retry to resume broadcasting.",
            503,
            true,
          );
      }
      const broadcast = await db
        .from("chain_operations")
        .update({ status: "broadcast", updated_at: new Date().toISOString() })
        .eq("id", operation.id)
        .eq("status", "signed");
      if (broadcast.error) throw broadcast.error;
      receipt = await client.getTransactionReceipt({ hash }).catch(() => null);
    }
    if (!receipt || (await client.getBlockNumber()) < receipt.blockNumber + 1n)
      return { operationId, status: "pending", transactionHash: hash };
    if (
      (await client.getBlock({ blockNumber: receipt.blockNumber })).hash !==
      receipt.blockHash
    )
      throw new ServiceError(
        "CHAIN_UNAVAILABLE",
        "Chain changed. Retry the mint status check.",
        503,
        true,
      );
    const event = parseEventLogs({
      abi: membershipAbi,
      logs: receipt.logs,
      eventName: "MembershipIssued",
      strict: true,
    }).find(
      (log) =>
        log.address.toLowerCase() === address &&
        log.args.issuanceKey === operation.issuance_key &&
        log.args.recipient.toLowerCase() === operation.recipient_address,
    );
    if (receipt.status === "success" && !event)
      throw new ServiceError(
        "RECEIPT_MISMATCH",
        "Mint receipt requires operator reconciliation.",
        503,
        true,
      );
    const updated = await db
      .from("chain_operations")
      .update({
        status: receipt.status === "success" ? "confirmed" : "reverted",
        token_id: event?.args.tokenId.toString() ?? null,
        receipt_block: receipt.blockNumber.toString(),
        receipt_block_hash: receipt.blockHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", operation.id)
      .in("status", ["signed", "broadcast"]);
    if (updated.error) throw updated.error;
    operation = await reload();
  }
  if (operation.status !== "confirmed" || !operation.token_id)
    return {
      operationId,
      status: operation.status,
      transactionHash: operation.transaction_hash,
    };
  await bindOwnedToken(memberId, operation.token_id, operation.id);
  return {
    operationId,
    status: "confirmed",
    tokenId: operation.token_id,
    transactionHash: operation.transaction_hash,
  };
}
