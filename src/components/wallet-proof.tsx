"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createConfig,
  http,
  WagmiProvider,
  useConnection,
  useConnect,
  useConnectors,
  useDisconnect,
  useSignMessage,
  useSwitchChain,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { robinhoodTestnet } from "viem/chains";
import { Wallet, Unplug, Signature } from "lucide-react";

export function WalletProof({ boundAddress }: { boundAddress: string | null }) {
  const [queryClient] = useState(() => new QueryClient());
  const [config] = useState(() =>
    createConfig({
      chains: [robinhoodTestnet],
      connectors: [injected()],
      ssr: true,
      transports: { [robinhoodTestnet.id]: http() },
    }),
  );
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletControls boundAddress={boundAddress} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

async function post(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error?.message ?? "Wallet verification unavailable. Please retry.",
    );
  return result;
}

function WalletControls({ boundAddress }: { boundAddress: string | null }) {
  const connection = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const sign = useSignMessage();
  const switchChain = useSwitchChain();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function verify() {
    const address = connection.address;
    if (!address) return;
    setBusy(true);
    setError("");
    try {
      if (connection.chainId !== robinhoodTestnet.id)
        await switchChain.mutateAsync({ chainId: robinhoodTestnet.id });
      const challenge = await post("/api/wallet/challenge", {
        address,
        chainId: robinhoodTestnet.id,
      });
      const signature = await sign.mutateAsync({
        account: address,
        message: challenge.message,
      });
      await post("/api/wallet/verify", {
        challengeId: challenge.challengeId,
        signature,
      });
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? (error.message.split("\n")[0] ?? "Wallet verification failed.")
          : "Wallet verification failed. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (boundAddress)
    return (
      <div>
        <p className="form-message">Wallet ownership verified</p>
        <p className="email-target">{boundAddress}</p>
      </div>
    );
  return (
    <div className="account-state">
      {connection.address && (
        <p className="email-target">{connection.address}</p>
      )}
      <div className="form-actions">
        {connection.isConnected ? (
          <>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={verify}
            >
              <Signature size={16} aria-hidden="true" />
              {busy ? "Verifying..." : "Verify wallet"}
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => disconnect.mutate()}
            >
              <Unplug size={16} aria-hidden="true" />
              Disconnect
            </button>
          </>
        ) : (
          connectors.map((connector) => (
            <button
              type="button"
              className="button"
              key={connector.uid}
              disabled={connect.isPending}
              onClick={() => {
                setError("");
                connect.mutate(
                  { connector },
                  {
                    onError: () =>
                      setError(
                        "Wallet connection unavailable. Open Grindly in a browser with an injected EVM wallet and retry.",
                      ),
                  },
                );
              }}
            >
              <Wallet size={16} aria-hidden="true" />
              Connect{" "}
              {connector.name === "Injected" ? "wallet" : connector.name}
            </button>
          ))
        )}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
