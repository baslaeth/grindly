import { z } from "zod";

const observations = z.object({
  provider: z.string().optional(),
  network: z.string().optional(),
  asset: z.string().optional(),
  observedAt: z.string().nullable().optional(),
  readings: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
        unit: z.string().optional(),
      }),
    )
    .max(60)
    .optional(),
  excerpt: z.string().optional(),
  publicationDateProvenance: z.string().optional(),
  limitations: z.string().optional(),
  market: z.string().optional(),
  price: z.string().optional(),
  bid: z.string().optional(),
  ask: z.string().optional(),
  volume: z.string().optional(),
  start: z.iso.datetime().optional(),
  endExclusive: z.iso.datetime().optional(),
  receivedBuckets: z.number().optional(),
  expectedBuckets: z.number().optional(),
  missingBuckets: z.number().optional(),
  candles: z
    .array(
      z.tuple([
        z.number().int().nonnegative().max(253402300799),
        z.number(),
        z.number(),
        z.number(),
        z.number(),
        z.number(),
      ]),
    )
    .max(168)
    .optional(),
  chain: z.number().optional(),
  block: z.string().optional(),
  hasBytecode: z.boolean().nullable().optional(),
  receipts: z
    .array(
      z.object({
        hash: z.string(),
        status: z.string(),
        confirmed: z.boolean().optional(),
      }),
    )
    .optional(),
});

export function SourceObservations({ facts }: { facts: string }) {
  let value: z.infer<typeof observations> | null = null;
  try {
    const parsed = observations.safeParse(JSON.parse(facts));
    if (parsed.success) value = parsed.data;
  } catch {
    /* Older document snapshots and unavailable-source notes are plain text. */
  }
  if (!value) return <p className="source-facts">{facts}</p>;
  return (
    <>
      {value.provider && (
        <p>
          {value.provider} / {value.network} / {value.asset}. Observation time:{" "}
          {value.observedAt ??
            "Unknown; retrieval time is not observation time"}
          .
        </p>
      )}
      {value.readings && (
        <dl className="source-readings">
          {value.readings.map((r, i) => (
            <div key={i}>
              <dt>{r.label}</dt>
              <dd className="source-facts">
                {r.value}
                {r.unit ? ` (${r.unit})` : ""}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {value.excerpt && (
        <blockquote className="source-facts">{value.excerpt}</blockquote>
      )}
      {value.publicationDateProvenance && (
        <p>{value.publicationDateProvenance}</p>
      )}
      {value.price && (
        <dl className="source-readings">
          <div>
            <dt>Market</dt>
            <dd>{value.market}</dd>
          </div>
          <div>
            <dt>Observed spot price (USD)</dt>
            <dd>{value.price}</dd>
          </div>
          <div>
            <dt>Bid / ask (USD)</dt>
            <dd>
              {value.bid ?? "Unknown"} / {value.ask ?? "Unknown"}
            </dd>
          </div>
          <div>
            <dt>Reported volume (base asset)</dt>
            <dd>{value.volume ?? "Unknown"}</dd>
          </div>
        </dl>
      )}
      {value.candles && (
        <>
          <p>
            {value.market}: {value.receivedBuckets}/{value.expectedBuckets}{" "}
            completed hourly observations. Missing:{" "}
            {value.missingBuckets ?? "Unknown"}.
          </p>
          <p>
            {value.start} to {value.endExclusive} (end excluded).
          </p>
          <div
            className="source-table"
            tabIndex={0}
            role="region"
            aria-label="Hourly market observations"
          >
            <table>
              <caption>
                Single-venue hourly observations, not a forecast result
              </caption>
              <thead>
                <tr>
                  <th>Hour (UTC)</th>
                  <th>Low</th>
                  <th>High</th>
                  <th>Open</th>
                  <th>Close</th>
                  <th>Volume</th>
                </tr>
              </thead>
              <tbody>
                {value.candles.map(([time, low, high, open, close, volume]) => (
                  <tr key={time}>
                    <td>
                      {new Date(time * 1000)
                        .toISOString()
                        .slice(0, 16)
                        .replace("T", " ")}
                    </td>
                    {[low, high, open, close, volume].map((n, i) => (
                      <td key={i}>{n}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {value.chain && (
        <>
          <p>
            Chain {value.chain}, block {value.block}. Bytecode at the supplied
            address:{" "}
            {value.hasBytecode === null
              ? "Unknown"
              : value.hasBytecode
                ? "present"
                : "not observed"}
            .
          </p>
          {value.receipts?.map((r) => (
            <p className="source-facts" key={r.hash}>
              Transaction {r.hash}: {r.status}
              {r.confirmed === true
                ? "; confirmed in the recorded observation"
                : "; confirmation unknown"}
              .
            </p>
          ))}
        </>
      )}
      {value.limitations && (
        <p>
          <strong>Limits:</strong> {value.limitations}
        </p>
      )}
    </>
  );
}
