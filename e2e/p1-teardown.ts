export default async function teardown() {
  // Explicit teardown avoids Windows shell descendants surviving taskkill.
  const response = await fetch("http://127.0.0.1:3100/__p1_test_shutdown", {
    method: "POST",
    headers: { "x-p1-test": "shutdown" },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Unable to stop P1 frontend test server");
  await response.text();
}
