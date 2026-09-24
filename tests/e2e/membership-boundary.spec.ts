import { expect, test } from "@playwright/test";
test("membership mutations require the exact origin and fail closed without auth", async ({
  request,
}) => {
  for (const route of ["mint", "bind", "check"]) {
    const cross = await request.post(`/api/membership/${route}`, {
      headers: { Origin: "https://attacker.example" },
      data: { tokenId: "1" },
    });
    expect(cross.status()).toBe(403);
    const anonymous = await request.post(`/api/membership/${route}`, {
      headers: { Origin: "http://127.0.0.1:3100" },
      data: { tokenId: "1" },
    });
    expect(anonymous.status()).toBe(503);
    expect(anonymous.headers()["cache-control"]).toBe("no-store");
  }
});
test("metadata rejects invalid token ids and fails closed when unconfigured", async ({
  request,
}) => {
  expect((await request.get("/api/metadata/46630/not-a-token")).status()).toBe(
    400,
  );
  const response = await request.get("/api/metadata/46630/1");
  expect(response.status()).toBe(503);
  expect(response.headers()["cache-control"]).toBe("no-store");
});
