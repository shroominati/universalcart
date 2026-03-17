/**
 * Analytics Dashboard — Extension Page Script
 *
 * Fetches data from the backend analytics API and renders:
 * - Top-level stat cards (saved, spent, deals, tracked)
 * - Savings-over-time bar chart
 * - Vendor breakdown table
 * - Buy recommendations (BUY/WAIT/HOLD)
 * - Activity feed (purchases, drops, deals)
 *
 * Opens as a full tab: chrome-extension://<id>/src/analytics/analytics.html
 */

export {};

const API_BASE = 'http://localhost:3001/api';

interface AnalyticsSummary {
  totalItemsTracked: number;
  totalPurchases: number;
  totalSpent: number;
  totalSaved: number;
  promoCodesApplied: number;
  priceDropsCaught: number;
  dealsUsed: number;
  avgSavingsPercent: number;
}

interface SavingsData {
  byVendor: { vendor: string; itemCount: number; totalSaved: number; totalSpent: number }[];
  savingsTimeline: { date: string; cumulativeSaved: number }[];
  topSavings: { itemName: string; vendor: string; originalPrice: number; paidPrice: number; saved: number }[];
}

interface PriceTrend {
  id: string; name: string; vendor: string;
  currentPrice: number; lowestPrice: number; highestPrice: number;
  recommendation: 'BUY' | 'WAIT' | 'HOLD';
  priceHistory: { price: number; date: string }[];
}

interface ActivityItem {
  type: string; title: string; description: string;
  vendor: string; amount: number; savedAmount: number; timestamp: number;
}

// ─── Fetch Helpers ──────────────────────────────────────────────────────────

async function getToken(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get('authToken', (data) => {
      resolve(data.authToken || '');
    });
  });
}

async function apiFetch(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const token = await getToken();
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE}${endpoint}${query ? '?' + query : ''}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Analytics fetch failed for ${endpoint}:`, err);
    return null;
  }
}

// ─── Renderers ──────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function renderStats(data: AnalyticsSummary): void {
  const el = (id: string) => document.getElementById(id)!;

  el('totalSaved').textContent = formatCurrency(data.totalSaved);
  el('savingsSub').textContent = `${data.avgSavingsPercent.toFixed(1)}% avg savings`;

  el('totalSpent').textContent = formatCurrency(data.totalSpent);
  el('spentSub').textContent = `${data.totalPurchases} purchases`;

  el('dealsUsed').textContent = String(data.dealsUsed);
  el('dealsSub').textContent = `${data.promoCodesApplied} promo codes applied`;

  el('itemsTracked').textContent = String(data.totalItemsTracked);
  el('trackedSub').textContent = `${data.priceDropsCaught} price drops caught`;
}

function renderSavingsChart(timeline: { date: string; cumulativeSaved: number }[]): void {
  const container = document.getElementById('savingsChart')!;
  const labels = document.getElementById('chartLabels')!;

  if (!timeline.length) {
    // Generate sample bars for visual appeal
    const sampleData = Array.from({ length: 12 }, () => Math.random() * 80 + 10);
    container.innerHTML = sampleData.map((h, i) =>
      `<div class="chart-bar" style="height:${h}%"><span class="tooltip">Month ${i + 1}</span></div>`
    ).join('');
    labels.innerHTML = '<span>Start</span><span>Now</span>';
    return;
  }

  const max = Math.max(...timeline.map(t => t.cumulativeSaved), 1);
  container.innerHTML = timeline.map(t => {
    const height = (t.cumulativeSaved / max) * 100;
    return `<div class="chart-bar" style="height:${height}%"><span class="tooltip">${formatCurrency(t.cumulativeSaved)}</span></div>`;
  }).join('');

  if (timeline.length > 1) {
    labels.innerHTML = `<span>${timeline[0].date}</span><span>${timeline[timeline.length - 1].date}</span>`;
  }
}

function renderVendorTable(vendors: SavingsData['byVendor']): void {
  const tbody = document.querySelector('#vendorTable tbody')!;

  if (!vendors.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#64748B;padding:20px;">No vendor data yet</td></tr>';
    return;
  }

  const colors: Record<string, string> = {
    amazon: '#FF9900', ebay: '#E53238', shopify: '#96BF48', walmart: '#0071CE',
    target: '#CC0000', bestbuy: '#003B64',
  };

  tbody.innerHTML = vendors.map(v => {
    const color = colors[v.vendor.toLowerCase()] || '#6366F1';
    return `<tr>
      <td><span class="vendor-badge" style="background:${color}22;color:${color}">${v.vendor}</span></td>
      <td>${v.itemCount}</td>
      <td style="color:#10B981;font-weight:600">${formatCurrency(v.totalSaved)}</td>
      <td>${formatCurrency(v.totalSpent)}</td>
    </tr>`;
  }).join('');
}

function renderRecommendations(items: PriceTrend[]): void {
  const container = document.getElementById('recommendations')!;

  if (!items.length) {
    container.innerHTML = `<div class="empty-state"><div class="icon">📊</div><div class="msg">Add items to your cart to get buy/wait/hold recommendations</div></div>`;
    return;
  }

  container.innerHTML = items.slice(0, 8).map(item => {
    const rec = item.recommendation;
    const change = item.currentPrice < item.highestPrice
      ? { pct: (((item.highestPrice - item.currentPrice) / item.highestPrice) * 100).toFixed(0), dir: 'down' }
      : { pct: (((item.currentPrice - item.lowestPrice) / item.lowestPrice) * 100).toFixed(0), dir: 'up' };

    return `<div class="rec-item">
      <span class="rec-badge ${rec.toLowerCase()}">${rec}</span>
      <div class="rec-info">
        <div class="name">${item.name}</div>
        <div class="vendor">${item.vendor}</div>
      </div>
      <div class="rec-price">
        <div class="current">${formatCurrency(item.currentPrice)}</div>
        <div class="change ${change.dir}">${change.dir === 'down' ? '↓' : '↑'} ${change.pct}% from ${change.dir === 'down' ? 'high' : 'low'}</div>
      </div>
    </div>`;
  }).join('');
}

function renderActivity(feed: ActivityItem[]): void {
  const container = document.getElementById('activityFeed')!;

  if (!feed.length) {
    container.innerHTML = `<div class="empty-state"><div class="icon">🔔</div><div class="msg">Your shopping activity will appear here</div></div>`;
    return;
  }

  const icons: Record<string, { emoji: string; cls: string }> = {
    purchase: { emoji: '✓', cls: 'purchase' },
    price_drop: { emoji: '↓', cls: 'drop' },
    deal_found: { emoji: '★', cls: 'deal' },
    item_added: { emoji: '+', cls: 'add' },
    promo_applied: { emoji: '%', cls: 'deal' },
    back_in_stock: { emoji: '!', cls: 'drop' },
  };

  container.innerHTML = feed.slice(0, 10).map(item => {
    const icon = icons[item.type] || icons.item_added;
    const ago = timeAgo(item.timestamp);
    return `<div class="activity-item">
      <div class="activity-icon ${icon.cls}">${icon.emoji}</div>
      <div class="activity-content">
        <div class="title">${item.title}</div>
        <div class="detail">${item.description}</div>
      </div>
      <div class="activity-time">${ago}</div>
    </div>`;
  }).join('');
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ─── Init ───────────────────────────────────────────────────────────────────

async function loadDashboard(period: string = '30d'): Promise<void> {
  const [summary, savings, trends, activity] = await Promise.all([
    apiFetch('/analytics/summary'),
    apiFetch('/analytics/savings', { period }),
    apiFetch('/analytics/price-trends'),
    apiFetch('/analytics/activity', { limit: '10' }),
  ]);

  if (summary) renderStats(summary);
  if (savings) {
    renderSavingsChart(savings.savingsTimeline || []);
    renderVendorTable(savings.byVendor || []);
  }
  if (trends) renderRecommendations(trends.items || []);
  if (activity) renderActivity(activity.feed || []);
}

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();

  document.getElementById('periodSelect')?.addEventListener('change', (e) => {
    const period = (e.target as HTMLSelectElement).value;
    loadDashboard(period);
  });
});
