import "server-only";
import { createPublicClient, http, parseAbi, type Address } from "viem";
import { robinhoodTestnet } from "viem/chains";
import { getEnvironment } from "../environment";
import { ServiceError } from "../errors";

export const membershipAbi = parseAbi([
  "error ERC721NonexistentToken(uint256 tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function ownershipEpoch(uint256 tokenId) view returns (uint256)",
  "function issuer() view returns (address)",
  "function mint(address recipient, bytes32 issuanceKey) returns (uint256)",
  "event MembershipIssued(bytes32 indexed issuanceKey,uint256 indexed tokenId,address indexed recipient)",
]);

export function membershipChain() {
  const env = getEnvironment();
  if (
    env.GRINDLY_STAGE !== "membership" ||
    !env.ROBINHOOD_RPC_URL ||
    !env.MEMBERSHIP_CONTRACT_ADDRESS
  )
    throw new ServiceError(
      "MEMBERSHIP_UNAVAILABLE",
      "Membership service is temporarily unavailable.",
      503,
      true,
    );
  return {
    client: createPublicClient({
      chain: robinhoodTestnet,
      transport: http(env.ROBINHOOD_RPC_URL, {
        timeout: 10_000,
        retryCount: 1,
      }),
    }),
    address: env.MEMBERSHIP_CONTRACT_ADDRESS.toLowerCase() as Address,
  };
}

export async function readOwnership(token: bigint) {
  const { client, address } = membershipChain();
  try {
    if ((await client.getChainId()) !== 46630) throw new Error("Wrong chain");
    const block = await client.getBlock({ blockTag: "latest" });
    const owner = await client.readContract({
      address,
      abi: membershipAbi,
      functionName: "ownerOf",
      args: [token],
      blockNumber: block.number,
    });
    const epoch = await client.readContract({
      address,
      abi: membershipAbi,
      functionName: "ownershipEpoch",
      args: [token],
      blockNumber: block.number,
    });
    if (
      (await client.getBlock({ blockNumber: block.number })).hash !== block.hash
    )
      throw new Error("Chain changed");
    return {
      owner: owner.toLowerCase(),
      epoch: epoch.toString(),
      block: block.number.toString(),
      blockHash: block.hash,
    };
  } catch (error) {
    // A nonexistent token is a denial, while transport/chain errors remain retryable.
    if (
      error instanceof Error &&
      error.message.includes("ERC721NonexistentToken")
    )
      throw new ServiceError("TOKEN_NOT_FOUND", "Token does not exist.", 404);
    throw new ServiceError(
      "CHAIN_UNAVAILABLE",
      "Ownership check unavailable. Please retry.",
      503,
      true,
    );
  }
}
