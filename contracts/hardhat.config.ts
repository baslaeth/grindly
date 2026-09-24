import toolbox from "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [toolbox],
  paths: {
    sources: "contracts/contracts",
    tests: "contracts/test",
    artifacts: "contracts/artifacts",
    cache: "contracts/cache",
  },
  solidity: {
    version: "0.8.34",
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
  },
});
