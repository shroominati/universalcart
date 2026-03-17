/**
 * Settings Page Controller
 *
 * Manages shipping profiles, payment methods, and API configuration.
 * All data saved to chrome.storage.local and synced to backend vault.
 */

export {};

const API_BASE = 'http://localhost:3001/api';

// ─── Load saved data on page open ──────────────────────────────────────────

async function loadSaved() {
  const data = await chrome.storage.local.get([
    'uc_shipping', 'uc_payment_display', 'uc_config',
  ]);

  if (data.uc_shipping) {
    const s = data.uc_shipping;
    setVal('ship-name', s.fullName);
    setVal('ship-email', s.email);
    setVal('ship-address1', s.address1);
    setVal('ship-address2', s.address2 || '');
    setVal('ship-city', s.city);
    setVal('ship-state', s.state);
    setVal('ship-zip', s.zip);
    setVal('ship-phone', s.phone);
    setVal('ship-country', s.country || 'US');
  }

  if (data.uc_payment_display) {
    const p = data.uc_payment_display;
    const container = document.getElementById('saved-payment')!;
    container.innerHTML = `
      <div class="saved-card">
        <div>
          <div class="info">${p.display || 'Saved card'}</div>
          <div class="detail">Encrypted and stored securely</div>
        </div>
        <button class="delete-btn" id="delete-payment">Remove</button>
      </div>
    `;
    document.getElementById('delete-payment')?.addEventListener('click', async () => {
      await chrome.storage.local.remove('uc_payment_display');
      container.innerHTML = '';
    });
  }

  if (data.uc_config) {
    const c = data.uc_config;
    if (c.anthropicKey) setVal('api-anthropic', c.anthropicKey);
    if (c.serpKey) setVal('api-serp', c.serpKey);
    if (c.backendUrl) setVal('api-backend', c.backendUrl);
  }
}

// ─── Save Shipping ─────────────────────────────────────────────────────────

document.getElementById('save-shipping-btn')?.addEventListener('click', async () => {
  const shipping = {
    fullName: getVal('ship-name'),
    email: getVal('ship-email'),
    address1: getVal('ship-address1'),
    address2: getVal('ship-address2') || undefined,
    city: getVal('ship-city'),
    state: getVal('ship-state'),
    zip: getVal('ship-zip'),
    country: getVal('ship-country'),
    phone: getVal('ship-phone'),
    label: 'Default',
    isDefault: true,
  };

  if (!shipping.fullName || !shipping.address1 || !shipping.city || !shipping.zip) {
    showStatus('shipping-status', 'Please fill in all required fields', 'error');
    return;
  }

  // Save locally
  await chrome.storage.local.set({ uc_shipping: shipping });

  // Sync to backend vault
  try {
    const backendUrl = getVal('api-backend') || API_BASE;
    const response = await fetch(`${backendUrl}/checkout/profiles/shipping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shipping),
    });

    if (response.ok) {
      showStatus('shipping-status', 'Shipping address saved and encrypted!', 'success');
    } else {
      showStatus('shipping-status', 'Saved locally. Backend sync failed (is the server running?)', 'success');
    }
  } catch {
    showStatus('shipping-status', 'Saved locally. Start the backend to enable checkout agents.', 'success');
  }
});

// ─── Save Payment ──────────────────────────────────────────────────────────

document.getElementById('save-payment-btn')?.addEventListener('click', async () => {
  const payment = {
    cardName: getVal('pay-name'),
    cardNumber: getVal('pay-number').replace(/\s/g, ''),
    expMonth: getVal('pay-month'),
    expYear: getVal('pay-year'),
    cvv: getVal('pay-cvv'),
    isDefault: true,
  };

  if (!payment.cardName || !payment.cardNumber || !payment.expMonth || !payment.cvv) {
    showStatus('payment-status', 'Please fill in all card fields', 'error');
    return;
  }

  // Only save display info locally (never store full card number in extension)
  const last4 = payment.cardNumber.slice(-4);
  const display = { display: `Card ending in ${last4}`, last4 };
  await chrome.storage.local.set({ uc_payment_display: display });

  // Send to backend vault for encrypted storage
  try {
    const backendUrl = getVal('api-backend') || API_BASE;
    const response = await fetch(`${backendUrl}/checkout/profiles/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });

    if (response.ok) {
      showStatus('payment-status', `Card ending in ${last4} saved and encrypted!`, 'success');

      // Clear sensitive fields
      setVal('pay-number', '');
      setVal('pay-cvv', '');

      // Show saved card
      const container = document.getElementById('saved-payment')!;
      container.innerHTML = `
        <div class="saved-card">
          <div>
            <div class="info">Card ending in ${last4}</div>
            <div class="detail">Encrypted with AES-256-GCM</div>
          </div>
          <button class="delete-btn" id="delete-payment">Remove</button>
        </div>
      `;
    } else {
      showStatus('payment-status', 'Failed to save. Is the backend running?', 'error');
    }
  } catch {
    showStatus('payment-status', 'Backend not reachable. Start the server first.', 'error');
  }
});

// ─── Save Config ───────────────────────────────────────────────────────────

document.getElementById('save-config-btn')?.addEventListener('click', async () => {
  const config = {
    anthropicKey: getVal('api-anthropic'),
    serpKey: getVal('api-serp'),
    backendUrl: getVal('api-backend') || 'http://localhost:3001',
  };

  await chrome.storage.local.set({ uc_config: config });
  showStatus('config-status', 'Configuration saved!', 'success');
});

// ─── Test Connection ───────────────────────────────────────────────────────

document.getElementById('test-connection-btn')?.addEventListener('click', async () => {
  const backendUrl = getVal('api-backend') || API_BASE;

  try {
    const response = await fetch(`${backendUrl}/health`);
    if (response.ok) {
      const data = await response.json();
      const services = Object.entries(data.services || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      showStatus('config-status', `Connected! Services: ${services}`, 'success');
    } else {
      showStatus('config-status', `Server responded with ${response.status}`, 'error');
    }
  } catch {
    showStatus('config-status', 'Cannot reach backend. Make sure it is running.', 'error');
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function getVal(id: string): string {
  return (document.getElementById(id) as HTMLInputElement)?.value?.trim() || '';
}

function setVal(id: string, value: string) {
  const el = document.getElementById(id) as HTMLInputElement;
  if (el) el.value = value;
}

function showStatus(id: string, message: string, type: 'success' | 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.className = `status-msg status-${type}`;
  setTimeout(() => { el.className = 'status-msg'; }, 5000);
}

// ─── Card number formatting ────────────────────────────────────────────────

document.getElementById('pay-number')?.addEventListener('input', (e) => {
  const input = e.target as HTMLInputElement;
  let value = input.value.replace(/\D/g, '');
  if (value.length > 16) value = value.substring(0, 16);
  // Add spaces every 4 digits
  input.value = value.replace(/(.{4})/g, '$1 ').trim();
});

// ─── Initialize ────────────────────────────────────────────────────────────

loadSaved();
