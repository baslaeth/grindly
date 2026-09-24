import { reconcileMints } from "../src/server/membership/reconciliation";
for (const result of await reconcileMints()) {
  console.log(result);
  if (result.status === "retry-required") process.exitCode = 1;
}
