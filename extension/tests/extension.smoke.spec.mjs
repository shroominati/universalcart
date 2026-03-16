import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect, chromium } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function launchExtension() {
  const extensionPath = path.resolve(__dirname, "..");
  const userDataDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "universalcart-extension-")
  );

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--host-resolver-rules=MAP google.com 127.0.0.1, MAP target.com 127.0.0.1",
    ],
  });

  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker");
  }

  const extensionId = new URL(serviceWorker.url()).host;

  return {
    context,
    extensionId,
    cleanup: async () => {
      await context.close();
      fs.rmSync(userDataDir, { recursive: true, force: true });
    },
  };
}

async function openSidePanelPage(context, extensionId) {
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel/index.html`);
  await panel.waitForLoadState("domcontentloaded");
  await panel.evaluate(async () => {
    await chrome.storage.local.clear();
  });
  await panel.reload();
  await expect(panel.locator(".empty h2")).toHaveText("Your cart is empty");
  return panel;
}

test("extension smoke test covers detection, cart metadata, and checkout", async () => {
  const { context, extensionId, cleanup } = await launchExtension();

  try {
    const panel = await openSidePanelPage(context, extensionId);

    const products = [
      {
        url: "http://google.com:4173/google-shopping-switch.html",
        name: "Nintendo Switch 2 Mario Kart Bundle",
      },
      {
        url: "http://google.com:4173/google-shopping-monitor.html",
        name: "Portable Gaming Monitor 15.6",
      },
    ];

    for (const product of products) {
      const page = await context.newPage();
      await page.goto(product.url, { waitUntil: "load" });

      await expect(panel.locator(".det-name")).toContainText(product.name);
      await expect(panel.locator(".det-source")).toContainText(
        "Target via google.com"
      );
      await panel.locator("[data-action='add-detected']").click();

      await page.close();
    }

    await expect(panel.locator(".vendor-name")).toHaveText("Target");
    await expect(panel.locator(".vendor-source")).toContainText(
      "Viewed on google.com"
    );
    await expect(panel.locator(".cart-item")).toHaveCount(2);
    await expect(panel.locator(".cart-item .item-name").first()).toContainText(
      products[0].name
    );
    await expect(panel.locator(".cart-item .item-name").nth(1)).toContainText(
      products[1].name
    );
    await expect(panel.locator(".item-source").first()).toContainText(
      "Target via google.com"
    );

    await panel.locator("[data-action='start-checkout']").click();
    await expect(panel.locator(".review-header h2")).toHaveText(
      "Review Order"
    );

    await panel.locator("[data-action='place-order']").click();
    await expect(panel.locator(".confirm-success h2")).toHaveText(
      "Order Complete",
      {
        timeout: 20_000,
      }
    );
    await expect(panel.locator(".claims-title")).toContainText(
      "Verum Claim Chain"
    );

    await expect(panel.locator("[data-action='view-orders']")).toBeVisible({
      timeout: 20_000,
    });
    await panel.locator("[data-action='view-orders']").click();

    await expect(panel.locator(".order-card")).toHaveCount(1);
    await panel.locator("[data-action='toggle-order']").click();
    await expect(panel.locator(".order-vendor-pill")).toContainText("Target");
  } finally {
    await cleanup();
  }
});
