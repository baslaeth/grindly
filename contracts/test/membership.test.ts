import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getAddress, zeroAddress, zeroHash } from "viem";

describe("GrindlyMembership", async () => {
  const { viem } = await network.create();
  const [issuer, alice, bob] = await viem.getWalletClients();
  const key = `0x${"11".repeat(32)}` as const;
  const base = "https://grindly.example/api/metadata/46630/";
  async function fixture() {
    return viem.deployContract("GrindlyMembership", [
      issuer.account.address,
      base,
    ]);
  }

  it("mints only for the issuer and emits the reconciliation event", async () => {
    const nft = await fixture();
    await assert.rejects(
      nft.write.mint([alice.account.address, key], { account: alice.account }),
      /IssuerOnly/,
    );
    await viem.assertions.emitWithArgs(
      nft.write.mint([alice.account.address, key]),
      nft,
      "MembershipIssued",
      [key, 1n, getAddress(alice.account.address)],
    );
    assert.equal(
      await nft.read.ownerOf([1n]),
      getAddress(alice.account.address),
    );
    assert.equal(await nft.read.ownershipEpoch([1n]), 1n);
  });

  it("retries one issuance without creating another token or epoch", async () => {
    const nft = await fixture();
    await nft.write.mint([alice.account.address, key]);
    await nft.write.mint([alice.account.address, key]);
    assert.equal(await nft.read.totalIssued(), 1n);
    assert.equal(await nft.read.tokenForIssuance([key]), 1n);
    assert.equal(await nft.read.ownershipEpoch([1n]), 1n);
    await assert.rejects(
      nft.write.mint([bob.account.address, key]),
      /IssuanceRecipientMismatch/,
    );
  });

  it("preserves idempotency after transfer without recovering the token", async () => {
    const nft = await fixture();
    await nft.write.mint([alice.account.address, key]);
    await nft.write.transferFrom(
      [alice.account.address, bob.account.address, 1n],
      { account: alice.account },
    );
    await nft.write.mint([alice.account.address, key]);
    assert.equal(await nft.read.ownerOf([1n]), getAddress(bob.account.address));
    assert.equal(await nft.read.totalIssued(), 1n);
    assert.equal(await nft.read.ownershipEpoch([1n]), 2n);
  });

  it("changes epochs on transfer away and back and keeps metadata stable", async () => {
    const nft = await fixture();
    await nft.write.mint([alice.account.address, key]);
    const uri = await nft.read.tokenURI([1n]);
    await nft.write.transferFrom(
      [alice.account.address, bob.account.address, 1n],
      { account: alice.account },
    );
    await nft.write.transferFrom(
      [bob.account.address, alice.account.address, 1n],
      { account: bob.account },
    );
    assert.equal(await nft.read.ownershipEpoch([1n]), 3n);
    assert.equal(
      await nft.read.ownerOf([1n]),
      getAddress(alice.account.address),
    );
    assert.equal(await nft.read.tokenURI([1n]), uri);
    assert.equal(uri, `${base}1`);
  });

  it("allows standard approvals and denies unauthorized transfers", async () => {
    const nft = await fixture();
    await nft.write.mint([alice.account.address, key]);
    await assert.rejects(
      nft.write.transferFrom([alice.account.address, bob.account.address, 1n]),
      /ERC721InsufficientApproval/,
    );
    await nft.write.approve([issuer.account.address, 1n], {
      account: alice.account,
    });
    await nft.write.transferFrom([
      alice.account.address,
      bob.account.address,
      1n,
    ]);
    assert.equal(await nft.read.getApproved([1n]), zeroAddress);
  });

  it("invalidates the epoch on a self transfer", async () => {
    const nft = await fixture();
    await nft.write.mint([alice.account.address, key]);
    await nft.write.transferFrom(
      [alice.account.address, alice.account.address, 1n],
      { account: alice.account },
    );
    assert.equal(await nft.read.ownershipEpoch([1n]), 2n);
  });

  it("rejects zero keys and recipients and unknown metadata", async () => {
    const nft = await fixture();
    await assert.rejects(nft.write.mint([zeroAddress, key]), /InvalidIssuance/);
    await assert.rejects(
      nft.write.mint([alice.account.address, zeroHash]),
      /InvalidIssuance/,
    );
    await assert.rejects(nft.read.tokenURI([99n]), /ERC721NonexistentToken/);
    assert.equal(await nft.read.totalIssued(), 0n);
  });

  it("supports ERC721 and metadata interfaces", async () => {
    const nft = await fixture();
    assert.equal(await nft.read.supportsInterface(["0x80ac58cd"]), true);
    assert.equal(await nft.read.supportsInterface(["0x5b5e139f"]), true);
  });

  it("rolls back rejected safe mints, including issuance keys and epochs", async () => {
    const nft = await fixture();
    await assert.rejects(
      nft.write.mint([nft.address, key]),
      /ERC721InvalidReceiver/,
    );
    assert.equal(await nft.read.totalIssued(), 0n);
    assert.equal(await nft.read.tokenForIssuance([key]), 0n);
    assert.equal(await nft.read.ownershipEpoch([1n]), 0n);
    await nft.write.mint([alice.account.address, key]);
    assert.equal(await nft.read.totalIssued(), 1n);
  });

  it("supports operator safe transfers and rejects non-receivers", async () => {
    const nft = await fixture();
    await nft.write.mint([alice.account.address, key]);
    await nft.write.setApprovalForAll([issuer.account.address, true], {
      account: alice.account,
    });
    await assert.rejects(
      nft.write.safeTransferFrom([alice.account.address, nft.address, 1n]),
      /ERC721InvalidReceiver/,
    );
    assert.equal(await nft.read.ownershipEpoch([1n]), 1n);
    await nft.write.safeTransferFrom([
      alice.account.address,
      bob.account.address,
      1n,
    ]);
    assert.equal(await nft.read.ownerOf([1n]), getAddress(bob.account.address));
  });

  it("rejects unusable deployment configuration", async () => {
    await assert.rejects(
      viem.deployContract("GrindlyMembership", [zeroAddress, base]),
      /InvalidConfiguration/,
    );
    await assert.rejects(
      viem.deployContract("GrindlyMembership", [issuer.account.address, ""]),
      /InvalidConfiguration/,
    );
    await assert.rejects(
      viem.deployContract("GrindlyMembership", [
        issuer.account.address,
        "https://grindly.example",
      ]),
      /InvalidConfiguration/,
    );
  });
});
