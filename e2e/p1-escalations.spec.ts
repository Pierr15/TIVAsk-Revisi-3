import { test, expect, type Page } from "@playwright/test";

async function prepare(page: Page) {
  const entries = ["A", "B"].map((id, i) => ({
    id, conversationId: "conversation-" + id, status: "OPEN",
    conversation: { id: "conversation-" + id, phoneNumber: "62800000000" + i, messages: [] },
  }));
  const state = { entries, fail: false, lists: 0, replies: [] as Array<{ path: string; message: string }> };
  await page.addInitScript(() => localStorage.setItem("tivask_token", "isolated-browser-test"));
  await page.route("**/api/**", async route => {
    const req = route.request();
    const url = new URL(req.url());
    const headers = {
      "access-control-allow-origin": "http://127.0.0.1:3100",
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "authorization,content-type",
      "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
    };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (url.pathname === "/api/auth/me") return route.fulfill({ headers, json: { user: { email: "test@example.invalid" } } });
    if (url.pathname === "/api/escalations" && req.method() === "GET") {
      state.lists++;
      return route.fulfill({ headers, json: { escalations: state.entries } });
    }
    if (/\/api\/escalations\/[^/]+\/reply$/.test(url.pathname)) {
      if (state.fail) return route.fulfill({ status: 503, headers, json: { error: "Pengiriman gagal; eskalasi tetap terbuka." } });
      state.replies.push({ path: url.pathname, message: req.postDataJSON().message });
      return route.fulfill({ headers, json: { whatsAppSent: true } });
    }
    // Never forward an unexpected request to a real API.
    return route.fulfill({ status: 500, headers, json: { error: "Unexpected test request: " + url.pathname } });
  });
  await page.goto("/escalations");
  await expect(page.getByRole("heading", { name: "Eskalasi Pertanyaan Siswa / Wali" })).toBeVisible();
  return state;
}

test("polling retains recipient, drafts are separate, and failed sending retains the draft", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const state = await prepare(page);
  const chooseA = page.getByRole("button").filter({ hasText: "+628000000000" });
  const chooseB = page.getByRole("button").filter({ hasText: "+628000000001" });
  await chooseB.click();
  await page.locator("textarea").fill("Jawaban untuk B");
  const initialLists = state.lists;
  await expect.poll(() => state.lists, { timeout: 15000 }).toBeGreaterThan(initialLists);
  await expect(page.getByText("ID Eskalasi: B", { exact: true })).toBeVisible();
  await expect(page.locator("textarea")).toHaveValue("Jawaban untuk B");

  await chooseA.click();
  await expect(page.locator("textarea")).toHaveValue("");
  await page.locator("textarea").fill("Draf A");
  await chooseB.click();
  await expect(page.locator("textarea")).toHaveValue("Jawaban untuk B");
  state.fail = true;
  await page.getByRole("button", { name: "Kirim Balasan WhatsApp" }).click();
  await expect(page.getByText("Pengiriman gagal; eskalasi tetap terbuka.", { exact: true })).toBeVisible();
  await expect(page.locator("textarea")).toHaveValue("Jawaban untuk B");
  expect(state.replies).toEqual([]);

  state.fail = false;
  await page.getByRole("button", { name: "Kirim Balasan WhatsApp" }).click();
  await expect(page.getByText("Balasan diterima gateway WhatsApp dan eskalasi ditandai selesai.", { exact: true })).toBeVisible();
  expect(state.replies).toEqual([{ path: "/api/escalations/B/reply", message: "Jawaban untuk B" }]);
  await chooseA.click();
  await expect(page.locator("textarea")).toHaveValue("Draf A");
  expect(errors).toEqual([]);
});

test("a removed selection cannot transfer its draft to another recipient", async ({ page }) => {
  const state = await prepare(page);
  await page.getByRole("button").filter({ hasText: "+628000000001" }).click();
  await page.locator("textarea").fill("Draf rahasia B");
  state.entries = state.entries.filter(entry => entry.id === "A");
  await page.getByRole("button", { name: "Muat ulang eskalasi" }).click();
  await expect(page.locator("textarea")).toHaveCount(0);
  await page.getByRole("button").filter({ hasText: "+628000000000" }).click();
  await expect(page.locator("textarea")).toHaveValue("");
  expect(state.replies).toEqual([]);
});
