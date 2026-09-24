import { readFile, readdir, writeFile } from "node:fs/promises";
import { encodeAbiParameters } from "viem";

const manifestPath = "deployments/robinhood-testnet.json";
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const dir = "contracts/artifacts/build-info";
const files = (await readdir(dir)).filter(
  (name) => name.endsWith(".json") && !name.endsWith(".output.json"),
);
const source = "project/contracts/contracts/GrindlyMembership.sol";
const builds = await Promise.all(
  files.map(async (name) =>
    JSON.parse(await readFile(`${dir}/${name}`, "utf8")),
  ),
);
const build = builds.find((value) => value.input.sources[source]);
if (!build)
  throw new Error("Build input unavailable; compile the deployed source first");
const api = "https://explorer.testnet.chain.robinhood.com/api";
const body = new URLSearchParams({
  module: "contract",
  action: "verifysourcecode",
  codeformat: "solidity-standard-json-input",
  contractaddress: manifest.address,
  contractname: `${source}:GrindlyMembership`,
  compilerversion: `v${build.solcLongVersion}`,
  sourceCode: JSON.stringify(build.input),
  constructorArguments: encodeAbiParameters(
    [{ type: "address" }, { type: "string" }],
    [manifest.issuer, manifest.metadataBase],
  ).slice(2),
});
const submitted = await (await fetch(api, { method: "POST", body })).json();
console.log({ verificationSubmission: submitted });
if (submitted.status !== "1")
  throw new Error("Explorer did not accept verification");
for (let attempt = 0; attempt < 30; attempt++) {
  const result = await (
    await fetch(
      `${api}?${new URLSearchParams({ module: "contract", action: "checkverifystatus", guid: submitted.result })}`,
    )
  ).json();
  if (String(result.result).includes("Pass - Verified")) {
    manifest.verificationStatus = "verified";
    manifest.compilerLongVersion = build.solcLongVersion;
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    console.log({ verified: true, explorerUrl: manifest.explorerUrl });
    process.exit(0);
  }
  if (!String(result.result).includes("Pending"))
    throw new Error(`Explorer result: ${result.result}`);
  await new Promise((resolve) => setTimeout(resolve, 2_000));
}
throw new Error("Verification still pending; inspect explorer before retrying");
