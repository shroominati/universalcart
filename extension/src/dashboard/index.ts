/**
 * Checkout Dashboard Controller
 *
 * Connects to the backend WebSocket and renders real-time
 * checkout progress for each vendor. Shows step-by-step updates,
 * promo code applications, and final order totals.
 */

export {};

interface VendorState {
  jobId: string;
  vendor: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  currentStep: string;
  stepDetail: string;
  itemsProcessed: number;
  totalItems: number;
  orderTotal?: number;
  promoApplied?: string;
  promoDiscount?: string;
  steps: StepState[];
}

interface StepState {
  name: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'failed';
  detail?: string;
}

interface EventEntry {
  time: string;
  type: 'progress' | 'success' | 'error' | 'promo';
  message: string;
}

const CHECKOUT_STEPS = [
  { name: 'initializing', label: 'Initializing' },
  { name: 'adding_items', label: 'Adding Items' },
  { name: 'navigating_checkout', label: 'Going to Checkout' },
  { name: 'filling_shipping', label: 'Filling Shipping' },
  { name: 'filling_payment', label: 'Filling Payment' },
  { name: 'applying_promos', label: 'Scanning Promos' },
  { name: 'reviewing_order', label: 'Reviewing Order' },
  { name: 'placing_order', label: 'Placing Order' },
];

class DashboardController {
  private ws: WebSocket | null = null;
  private vendors: Map<string, VendorState> = new Map();
  private events: EventEntry[] = [];
  private reconnectTimer: number | null = null;
  private totalSavings = 0;

  constructor() {
    this.connect();
  }

  // ─── WebSocket Connection ──────────────────────────────────────────────

  private connect() {
    const wsUrl = `ws://localhost:3001/ws`;
    this.showConnecting(true);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[Dashboard] Connected to WebSocket');
        this.showConnecting(false);

        // Subscribe
        this.ws?.send(JSON.stringify({
          type: 'subscribe',
          userId: 'default',
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (err) {
          console.debug('[Dashboard] Invalid message:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[Dashboard] WebSocket closed, reconnecting...');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.showConnecting(true);
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.showConnecting(true);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  private showConnecting(show: boolean) {
    const el = document.getElementById('connecting');
    if (el) el.style.display = show ? 'flex' : 'none';
  }

  // ─── Message Handling ──────────────────────────────────────────────────

  private handleMessage(msg: any) {
    switch (msg.type) {
      case 'checkout:progress':
        this.handleProgress(msg.data);
        break;
      case 'checkout:complete':
        this.handleComplete(msg.data);
        break;
      case 'checkout:failed':
        this.handleFailed(msg.data);
        break;
      case 'checkout:all_done':
        this.handleAllDone(msg.data);
        break;
      case 'promo:applied':
        this.handlePromo(msg.data);
        break;
      case 'price_scout:result':
        this.handlePriceScout(msg.data);
        break;
      case 'queue:status':
        this.addEvent('progress', msg.data.message || 'Queue status update');
        break;
    }
  }

  private handleProgress(data: any) {
    const { jobId, vendor, step, stepDetail, itemsProcessed, totalItems, promoApplied, promoDiscount, orderTotal } = data;

    let state = this.vendors.get(vendor);
    if (!state) {
      state = this.createVendorState(jobId, vendor, totalItems);
      this.vendors.set(vendor, state);
    }

    state.status = 'running';
    state.currentStep = step;
    state.stepDetail = stepDetail;
    state.itemsProcessed = itemsProcessed || state.itemsProcessed;
    state.totalItems = totalItems || state.totalItems;
    if (orderTotal) state.orderTotal = orderTotal;
    if (promoApplied) state.promoApplied = promoApplied;
    if (promoDiscount) state.promoDiscount = promoDiscount;

    // Update step states
    this.updateStepStates(state, step);

    this.addEvent('progress', `${vendor}: ${stepDetail}`);
    this.render();
  }

  private handleComplete(data: any) {
    const state = this.vendors.get(data.vendor);
    if (state) {
      state.status = 'completed';
      state.orderTotal = data.orderTotal;
      if (data.promoApplied) state.promoApplied = data.promoApplied;
      if (data.promoDiscount) state.promoDiscount = data.promoDiscount;

      // Mark all steps done
      state.steps.forEach(s => s.status = 'done');
    }

    this.addEvent('success', `${data.vendor}: Order placed! Total: $${data.orderTotal?.toFixed(2) || '??'}`);
    this.render();
  }

  private handleFailed(data: any) {
    const state = this.vendors.get(data.vendor);
    if (state) {
      state.status = 'failed';
      state.stepDetail = data.error || 'Unknown error';

      // Mark current step as failed
      const currentStepObj = state.steps.find(s => s.name === data.step);
      if (currentStepObj) currentStepObj.status = 'failed';
    }

    this.addEvent('error', `${data.vendor}: Failed — ${data.error || 'Unknown error'}`);
    this.render();
  }

  private handleAllDone(data: any) {
    const banner = document.getElementById('all-done-banner');
    const savings = document.getElementById('total-savings');
    if (banner) {
      banner.classList.add('show');
      if (savings && this.totalSavings > 0) {
        savings.textContent = `Saved $${this.totalSavings.toFixed(2)} with promos`;
        savings.style.display = '';
      }
    }

    this.addEvent('success', `All done! ${data.completed} succeeded, ${data.failed} failed.`);
    this.render();
  }

  private handlePromo(data: any) {
    this.addEvent('promo', `${data.vendor}: Applied code "${data.code}" — ${data.discount}`);
    this.render();
  }

  private handlePriceScout(data: any) {
    if (data.bestAlternative) {
      this.addEvent('progress',
        `Price Scout: Found ${data.productName} cheaper at ${data.bestAlternative.vendor} — save $${data.bestSavings.toFixed(2)}`
      );
    }
  }

  // ─── State Helpers ─────────────────────────────────────────────────────

  private createVendorState(jobId: string, vendor: string, totalItems: number): VendorState {
    return {
      jobId,
      vendor,
      status: 'queued',
      currentStep: 'initializing',
      stepDetail: 'Waiting...',
      itemsProcessed: 0,
      totalItems,
      steps: CHECKOUT_STEPS.map(s => ({
        name: s.name,
        label: s.label,
        status: 'pending' as const,
      })),
    };
  }

  private updateStepStates(state: VendorState, currentStep: string) {
    let foundCurrent = false;
    for (const step of state.steps) {
      if (step.name === currentStep) {
        step.status = 'active';
        step.detail = state.stepDetail;
        foundCurrent = true;
      } else if (!foundCurrent) {
        step.status = 'done';
      } else {
        step.status = 'pending';
      }
    }
  }

  private addEvent(type: EventEntry['type'], message: string) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false });
    this.events.unshift({ time, type, message });
    if (this.events.length > 100) this.events = this.events.slice(0, 100);
  }

  // ─── Rendering ─────────────────────────────────────────────────────────

  private render() {
    const emptyState = document.getElementById('empty-state')!;
    const summaryBar = document.getElementById('summary-bar')!;
    const vendorGrid = document.getElementById('vendor-grid')!;
    const eventLog = document.getElementById('event-log')!;

    if (this.vendors.size === 0) {
      emptyState.style.display = 'block';
      summaryBar.style.display = 'none';
      vendorGrid.innerHTML = '';
      eventLog.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    summaryBar.style.display = 'flex';
    eventLog.style.display = 'block';

    // Update summary stats
    const states = Array.from(this.vendors.values());
    const completedCount = states.filter(s => s.status === 'completed').length;
    const failedCount = states.filter(s => s.status === 'failed').length;
    const totalItems = states.reduce((sum, s) => sum + s.totalItems, 0);
    const totalCost = states.reduce((sum, s) => sum + (s.orderTotal || 0), 0);

    document.getElementById('stat-vendors')!.textContent = states.length.toString();
    document.getElementById('stat-items')!.textContent = totalItems.toString();
    document.getElementById('stat-completed')!.textContent = completedCount.toString();
    document.getElementById('stat-failed')!.textContent = failedCount.toString();
    document.getElementById('stat-savings')!.textContent = `$${this.totalSavings.toFixed(2)}`;
    document.getElementById('stat-total')!.textContent = `$${totalCost.toFixed(2)}`;

    // Render vendor cards
    vendorGrid.innerHTML = states.map(state => this.renderVendorCard(state)).join('');

    // Render event log
    const logBody = document.getElementById('event-log-body')!;
    logBody.innerHTML = this.events.slice(0, 50).map(e => `
      <div class="event-item">
        <span class="event-time">${e.time}</span>
        <span class="event-dot ${e.type}"></span>
        <span class="event-msg">${this.escapeHtml(e.message)}</span>
      </div>
    `).join('');
  }

  private renderVendorCard(state: VendorState): string {
    const statusClass = state.status === 'running' ? 'status-running'
      : state.status === 'completed' ? 'status-completed'
      : state.status === 'failed' ? 'status-failed'
      : 'status-queued';

    const statusLabel = state.status === 'running' ? 'In Progress'
      : state.status === 'completed' ? 'Completed'
      : state.status === 'failed' ? 'Failed'
      : 'Queued';

    return `
      <div class="vendor-card">
        <div class="vendor-card-header">
          <span class="vendor-card-name">${this.escapeHtml(state.vendor)}</span>
          <span class="vendor-card-status ${statusClass}">
            <span class="status-dot"></span>
            ${statusLabel}
          </span>
        </div>
        <div class="vendor-steps">
          ${state.steps.map((step, i) => `
            <div class="step-item step-${step.status}">
              <div class="step-icon">
                ${step.status === 'done' ? '✓' : step.status === 'failed' ? '✕' : step.status === 'active' ? '●' : (i + 1)}
              </div>
              <div class="step-info">
                <div class="step-name">${step.label}</div>
                ${step.status === 'active' && state.stepDetail
                  ? `<div class="step-detail">${this.escapeHtml(state.stepDetail)}</div>`
                  : step.status === 'failed' && state.stepDetail
                  ? `<div class="step-detail" style="color:var(--error)">${this.escapeHtml(state.stepDetail)}</div>`
                  : ''
                }
              </div>
            </div>
          `).join('')}
        </div>
        <div class="vendor-card-footer">
          <div>
            <div class="footer-items">${state.itemsProcessed}/${state.totalItems} items</div>
            ${state.promoApplied
              ? `<div class="footer-promo">🏷 ${this.escapeHtml(state.promoApplied)} — ${this.escapeHtml(state.promoDiscount || '')}</div>`
              : ''
            }
          </div>
          ${state.orderTotal
            ? `<div class="footer-total">$${state.orderTotal.toFixed(2)}</div>`
            : '<div class="footer-total" style="color:var(--text-muted)">—</div>'
          }
        </div>
      </div>
    `;
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Initialize
new DashboardController();
