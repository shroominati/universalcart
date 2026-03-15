import { getCart, addItem, getCartCount, addPromos } from "./lib/store.js";

// Open side panel on extension icon click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Context menu: right-click "Add to UniversalCart"
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "uc-add-page",
    title: "Add to UniversalCart",
    contexts: ["page", "link", "image"],
  });
  updateBadge();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "uc-add-page" || !tab?.id) return;

  async function addFallbackItem() {
    const domain = new URL(tab.url).hostname.replace(/^www\./, "");
    const item = {
      id: `item_${Date.now()}`,
      name: tab.title || domain,
      price: 0,
      image: "",
      quantity: 1,
      url: tab.url,
      vendor: { name: domain, domain, did: "", favicon: "", accentColor: "" },
      needsPrice: true,
    };
    await addItem(item);
    updateBadge();
  }

  try {
    const result = await chrome.tabs.sendMessage(tab.id, {
      type: "DETECT_PRODUCT",
    });
    const response = Array.isArray(result) ? result[0] : result;
    if (response?.product) {
      await addItem(response.product);
      updateBadge();
    } else {
      await addFallbackItem();
    }
  } catch {
    await addFallbackItem();
  }
});

// Handle messages from content script and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ADD_ITEM") {
    addItem(message.item).then(() => {
      updateBadge();
      sendResponse({ ok: true });
    });
    return true; // async
  }

  if (message.type === "GET_CART") {
    getCart().then((cart) => sendResponse({ cart }));
    return true;
  }

  if (message.type === "BADGE_UPDATE") {
    updateBadge();
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === "OPEN_SIDE_PANEL") {
    if (sender.tab) {
      chrome.sidePanel.open({ tabId: sender.tab.id });
    }
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === "PROMOS_DETECTED") {
    if (message.promos && message.promos.length > 0) {
      addPromos(message.promos).then(() => sendResponse({ ok: true }));
      return true;
    }
    sendResponse({ ok: true });
    return false;
  }
});

// Keep badge count in sync with cart
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.uc_cart) {
    updateBadge();
  }
});

async function updateBadge() {
  const count = await getCartCount();
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
  // Flash green briefly on update, then settle to indigo
  chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
  setTimeout(() => {
    chrome.action.setBadgeBackgroundColor({ color: "#6366f1" });
  }, 800);
}
