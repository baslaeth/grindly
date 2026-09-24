import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import {
  createPublicClient,
  createWalletClient,
  encodeDeployData,
  getContractAddress,
  http,
  keccak256,
  type Abi,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { robinhoodTestnet } from "viem/chains";
import { z } from "zod";

const key = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/)
  .parse(process.env.ISSUER_PRIVATE_KEY) as Hex;
const account = privateKeyToAccount(key);
const app = JSON.parse(await readFile("deployments/app-testnet.json", "utf8"));
if (account.address.toLowerCase() !== app.issuerAddress.toLowerCase())
  throw new Error("Issuer does not match app manifest");
const metadataBase = `${app.appUrl}/api/metadata/46630/`;
const artifact = JSON.parse(
  await readFile(
    "contracts/artifacts/contracts/contracts/GrindlyMembership.sol/GrindlyMembership.json",
    "utf8",
  ),
) as { abi: Abi; bytecode: Hex };
const client = createPublicClient({
  chain: robinhoodTestnet,
  transport: http(),
});
const wallet = createWalletClient({
  account,
  chain: robinhoodTestnet,
  transport: http(),
});
if ((await client.getChainId()) !== 46630)
  throw new Error("Refusing unexpected chain");
await mkdir(".local", { recursive: true });
const journalPath = ".local/membership-deployment.json";
const schema = z.object({
  hash: z.string(),
  signed: z.string(),
  address: z.string(),
  metadataBase: z.string(),
  issuer: z.string(),
  bytecodeHash: z.string(),
});
let journal: z.infer<typeof schema>;
try {
  journal = schema.parse(JSON.parse(await readFile(journalPath, "utf8")));
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
    throw error;
  const nonce = await client.getTransactionCount({
    address: account.address,
    blockTag: "pending",
  });
  const request = await wallet.prepareTransactionRequest({
    data: encodeDeployData({
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      args: [account.address, metadataBase],
    }),
    nonce,
  });
  const signed = await wallet.signTransaction(request);
  journal = {
    signed,
    hash: keccak256(signed),
    address: getContractAddress({
      from: account.address,
      nonce: BigInt(nonce),
    }),
    metadataBase,
    issuer: account.address,
    bytecodeHash: keccak256(artifact.bytecode),
  };
  await writeFile(journalPath, JSON.stringify(journal, null, 2), {
    flag: "wx",
    mode: 0o600,
  });
}
if (
  journal.issuer !== account.address ||
  journal.metadataBase !== metadataBase ||
  journal.bytecodeHash !== keccak256(artifact.bytecode)
)
  throw new Error("Deployment inputs changed; inspect persisted journal");
const hash = journal.hash as Hex;
let receipt = await client.getTransactionReceipt({ hash }).catch(() => null);
if (!receipt) {
  try {
    await client.sendRawTransaction({
      serializedTransaction: journal.signed as Hex,
    });
  } catch {
    if (!(await client.getTransaction({ hash }).catch(() => null)))
      throw new Error(
        "Broadcast unavailable; saved transaction can be retried",
      );
  }
  receipt = await client.waitForTransactionReceipt({
    hash,
    confirmations: 2,
    timeout: 120_000,
  });
}
if (
  receipt.status !== "success" ||
  receipt.contractAddress?.toLowerCase() !== journal.address.toLowerCase()
)
  throw new Error("Deployment did not succeed");
const address = receipt.contractAddress;
const issuer = await client.readContract({
  address,
  abi: artifact.abi,
  functionName: "issuer",
});
if (String(issuer).toLowerCase() !== account.address.toLowerCase())
  throw new Error("Deployed issuer mismatch");
const bytecode = await client.getCode({ address });
if (!bytecode) throw new Error("No deployed contract code");
const manifest = {
  chainId: 46630,
  network: robinhoodTestnet.name,
  contractName: "GrindlyMembership",
  address,
  issuer: account.address,
  metadataBase,
  transactionHash: hash,
  blockNumber: receipt.blockNumber.toString(),
  blockHash: receipt.blockHash,
  compilerVersion: "0.8.34",
  optimizerRuns: 200,
  evmVersion: "cancun",
  runtimeCodeHash: keccak256(bytecode),
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  explorerUrl: `${robinhoodTestnet.blockExplorers.default.url}/address/${address}`,
  verificationStatus: "pending",
};
await mkdir("deployments", { recursive: true });
await writeFile(
  "deployments/robinhood-testnet.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
await writeFile(
  "deployments/GrindlyMembership.abi.json",
  JSON.stringify(artifact.abi, null, 2) + "\n",
);
console.log({
  address,
  transactionHash: hash,
  chainId: 46630,
  receiptStatus: receipt.status,
});
