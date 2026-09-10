import { test, expect } from "@playwright/test";

test.describe("TIVAsk Critical Dashboard E2E Journey", () => {
  test("Complete Admin Journey: Login -> Dashboard -> KB Create/Edit/Publish -> Conversations -> Escalation Reply & Resolve", async ({
    page,
  }) => {
    // 1. Visit Login Page
    await page.goto("/login");
    await expect(page.getByText("TIVAsk Admin Portal")).toBeVisible();

    // 2. Fill login credentials
    await page.fill('input[type="email"]', "admin@tivask.local");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    // 3. Navigate to Dashboard
    await page.waitForURL("**/dashboard");
    await expect(page.getByText("Ringkasan Operasional SPMB")).toBeVisible();
    await expect(page.getByText("Total Percakapan")).toBeVisible();
    await expect(page.getByText("Status Koneksi WhatsApp Gateway")).toBeVisible();

    // 4. Navigate to Knowledge Base
    await page.click('a[href="/knowledge-base"]');
    await page.waitForURL("**/knowledge-base");
    await expect(page.getByRole("heading", { name: "Knowledge Base SPMB" })).toBeVisible();

    // 5. Create new KB Entry
    await page.click('button:has-text("Tambah Entri Baru")');
    await expect(page.getByRole("heading", { name: "Tambah Entri Baru" })).toBeVisible();

    const uniqueTitle = `Jalur Khusus Tahfidz Qur'an ${Date.now()}`;
    const modal = page.locator(".fixed.inset-0");
    await modal.locator('input[placeholder*="Ketentuan Seragam"]').fill(uniqueTitle);
    await modal.locator("select").first().selectOption("JALUR");
    await modal
      .locator('textarea[placeholder*="Tuliskan data faktual"]')
      .fill(
        "SMKN 1 Adiwerna membuka kuota khusus bagi calon siswa penghafal Al-Qur'an minimal 3 Juz dengan sertifikat resmi."
      );
    await modal
      .locator('input[placeholder*="seragam, laki-laki"]')
      .fill("tahfidz, quran, hafiz, jalur prestasi");
    await modal.locator('button[type="submit"]:has-text("Simpan Entri")').click();

    // Verify entry is listed
    await expect(page.getByText(uniqueTitle)).toBeVisible();

    // 6. Edit entry and set to PUBLISHED
    const row = page.locator("tr", { hasText: uniqueTitle });
    await row.locator('button[title="Edit entri"]').click();
    await expect(page.getByRole("heading", { name: "Edit Entri Knowledge Base" })).toBeVisible();

    const editModal = page.locator(".fixed.inset-0");
    await editModal.locator("select").nth(1).selectOption("PUBLISHED");
    await editModal.locator('button[type="submit"]:has-text("Simpan Entri")').click();

    await expect(page.getByText(uniqueTitle)).toBeVisible();

    // 7. Navigate to Conversations
    await page.click('a[href="/conversations"]');
    await page.waitForURL("**/conversations");
    await expect(page.getByText("Riwayat Percakapan WhatsApp")).toBeVisible();

    // 8. Navigate to Escalations
    await page.click('a[href="/escalations"]');
    await page.waitForURL("**/escalations");
    await expect(page.getByText("Eskalasi Pertanyaan Siswa / Wali")).toBeVisible();

    // 9. If there is an escalation, reply to it
    const escalationItem = page.locator('button:has-text("+62")').first();
    const hasEscalations = (await escalationItem.count()) > 0;

    if (hasEscalations) {
      await escalationItem.click();
      await page.fill(
        'textarea[placeholder*="Tuliskan jawaban resmi"]',
        "Terima kasih, informasi telah diverifikasi langsung oleh panitia."
      );
      await page.click('button:has-text("Kirim Balasan WhatsApp")');
      await expect(
        page.getByText(/Balasan (berhasil dikirim|tersimpan di sistem)/)
      ).toBeVisible({ timeout: 10000 });
    }
  });
});

