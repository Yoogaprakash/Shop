(() => {
  const STORAGE_KEYS = {
    categories: 'bb_electrical_categories',
    items: 'bb_electrical_items',
    sales: 'bb_electrical_sales',
    settings: 'bb_electrical_settings',
    session: 'bb_electrical_session',
  };

  const state = {
    sales: [],
    categories: [],
    items: [],
  };

  const dailyTotalEl = document.getElementById('dailyTotal');
  const monthlyTotalEl = document.getElementById('monthlyTotal');
  const yearlyTotalEl = document.getElementById('yearlyTotal');
  const dailyCountEl = document.getElementById('dailyCount');
  const monthlyCountEl = document.getElementById('monthlyCount');
  const yearlyCountEl = document.getElementById('yearlyCount');
  const salesTableBody = document.getElementById('salesTableBody');
  const filterByDate = document.getElementById('filterByDate');
  const filterByCategory = document.getElementById('filterByCategory');
  const filterByCustomer = document.getElementById('filterByCustomer');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const clearSalesBtn = document.getElementById('clearSalesBtn');

  function init() {
    if (!enforceAdminRole()) {
      return;
    }
    state.sales = getStoredData(STORAGE_KEYS.sales, []);
    state.categories = getStoredData(STORAGE_KEYS.categories, []);
    state.items = getStoredData(STORAGE_KEYS.items, []);

    // If a central store is active, listen for updates and merge them into the report view
    if (window.CentralStore) {
      document.addEventListener('central-data-updated', () => {
        state.sales = getStoredData(STORAGE_KEYS.sales, []);
        state.categories = getStoredData(STORAGE_KEYS.categories, []);
        state.items = getStoredData(STORAGE_KEYS.items, []);
        renderSummary();
        renderTable();
      });

      document.addEventListener('central-sale-added', (e) => {
        try {
          const sale = e.detail;
          if (sale && sale.id) {
            state.sales.push(sale);
            renderSummary();
            renderTable();
          }
        } catch (err) {
          console.warn('Error handling central-sale-added', err);
        }
      });
    }
    populateCategoryFilter();
    renderSummary();
    renderTable();
    bindEvents();
  }

  function bindEvents() {
    filterByDate?.addEventListener('change', renderTable);
    filterByCustomer?.addEventListener('input', renderTable);
    filterByCategory?.addEventListener('change', renderTable);
    exportCsvBtn?.addEventListener('click', exportCsv);
    clearSalesBtn?.addEventListener('click', clearSalesData);
  }

  function populateCategoryFilter() {
    if (!filterByCategory) return;
    state.categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      filterByCategory.appendChild(option);
    });
  }

  function renderSummary() {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const monthKey = now.toISOString().slice(0, 7);
    const yearKey = now.getFullYear().toString();

    const summary = state.sales.reduce(
      (acc, sale) => {
        const saleDate = new Date(sale.timestamp);
        const saleDay = saleDate.toISOString().slice(0, 10);
        const saleMonth = saleDate.toISOString().slice(0, 7);
        const saleYear = saleDate.getFullYear().toString();

        if (saleDay === todayKey) {
          acc.daily.total += sale.total;
          acc.daily.count += 1;
        }
        if (saleMonth === monthKey) {
          acc.monthly.total += sale.total;
          acc.monthly.count += 1;
        }
        if (saleYear === yearKey) {
          acc.yearly.total += sale.total;
          acc.yearly.count += 1;
        }
        return acc;
      },
      {
        daily: { total: 0, count: 0 },
        monthly: { total: 0, count: 0 },
        yearly: { total: 0, count: 0 },
      },
    );

    dailyTotalEl.textContent = formatCurrency(summary.daily.total);
    monthlyTotalEl.textContent = formatCurrency(summary.monthly.total);
    yearlyTotalEl.textContent = formatCurrency(summary.yearly.total);
    dailyCountEl.textContent = `${summary.daily.count} orders`;
    monthlyCountEl.textContent = `${summary.monthly.count} orders`;
    yearlyCountEl.textContent = `${summary.yearly.count} orders`;
  }

  function renderTable() {
    salesTableBody.innerHTML = '';

    if (!state.sales.length) {
      salesTableBody.innerHTML =
        '<tr><td colspan="7" class="text-center text-muted">No sales recorded yet.</td></tr>';
      return;
    }

    const selectedDate = filterByDate?.value;
    const selectedCategory = filterByCategory?.value;
    const customerQuery = filterByCustomer?.value?.trim().toLowerCase() ?? '';

    const filtered = state.sales.filter((sale) => {
      const matchesDate = selectedDate
        ? sale.timestamp.slice(0, 10) === selectedDate
        : true;

      if (!matchesDate) return false;

      const customerMatch = customerQuery
        ? (sale.customer?.name || sale.customer?.phone || '')
            .toLowerCase()
            .includes(customerQuery)
        : true;

      if (!customerMatch) return false;

      if (!selectedCategory) return true;

      return sale.items.some((item) => {
        const itemCategoryId = resolveCategoryId(item.id);
        return itemCategoryId === selectedCategory;
      });
    });

    if (!filtered.length) {
      salesTableBody.innerHTML =
        '<tr><td colspan="7" class="text-center text-muted">No sales match the filter.</td></tr>';
      return;
    }

    filtered
      .sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .forEach((sale) => {
        const row = document.createElement('tr');
        const categorySplit = summarizeByCategory(sale.items)
          .map((entry) => `${entry.name}: ${formatCurrency(entry.total)}`)
          .join('<br />');
        const customerCell = sale.customer && (sale.customer.name || sale.customer.phone)
          ? `${sale.customer.name || ''}${sale.customer.phone ? `<br /><span class="text-muted small">${sale.customer.phone}</span>` : ''}`
          : '-';
        row.innerHTML = `
          <td>${new Date(sale.timestamp).toLocaleString()}</td>
          <td>
            ${sale.items.map(renderSaleItem).join('')}
          </td>
          <td>${customerCell}</td>
          <td>${formatCurrency(sale.total)}</td>
          <td>${formatCurrency(sale.tax)}</td>
          <td>${formatCurrency(sale.subtotal)}</td>
          <td>${categorySplit || '-'}</td>
        `;
        salesTableBody.appendChild(row);
      });
  }

  function summarizeByCategory(items) {
    const map = new Map();
    items.forEach((item) => {
      const categoryId = resolveCategoryId(item.id);
      const categoryName =
        state.categories.find((cat) => cat.id === categoryId)?.name ?? 'Other';
      const current = map.get(categoryId) ?? { name: categoryName, total: 0 };
      current.total += getItemTotal(item);
      map.set(categoryId, current);
    });
    return Array.from(map.values());
  }

  function resolveCategoryId(itemId) {
    return state.items.find((item) => item.id === itemId)?.categoryId ?? null;
  }

  function getItemGstRate(item) {
    if (typeof item.gstRate === 'number' && !Number.isNaN(item.gstRate)) {
      return Math.max(0, item.gstRate);
    }
    const product = state.items.find((prod) => prod.id === item.id);
    if (
      product &&
      typeof product.gstRate === 'number' &&
      !Number.isNaN(product.gstRate)
    ) {
      return Math.max(0, product.gstRate);
    }
    return 0;
  }

  function getItemSubtotal(item) {
    const price = item.price ?? 0;
    const quantity = item.quantity ?? 0;
    return price * quantity;
  }

  function getItemGstAmount(item) {
    if (typeof item.gstAmount === 'number' && !Number.isNaN(item.gstAmount)) {
      return item.gstAmount;
    }
    return getItemSubtotal(item) * (getItemGstRate(item) / 100);
  }

  function getItemTotal(item) {
    if (typeof item.lineTotal === 'number' && !Number.isNaN(item.lineTotal)) {
      return item.lineTotal;
    }
    return getItemSubtotal(item) + getItemGstAmount(item);
  }

  function formatGstRate(rate) {
    const sanitized = Math.round(Math.max(0, rate) * 100) / 100;
    return Number.isInteger(sanitized)
      ? sanitized.toFixed(0)
      : sanitized.toString();
  }

  function renderSaleItem(item) {
    const quantity = item.quantity ?? 0;
    const gstRate = formatGstRate(getItemGstRate(item));
    const gstAmount = formatCurrency(getItemGstAmount(item));
    const nameLabel = item.brand ? `${item.brand} – ${item.name}` : item.name;
    return `<div>${nameLabel} <span class="text-muted">×${quantity}</span><br /><span class="text-muted small">GST ${gstRate}% • Tax ${gstAmount}</span></div>`;
  }

  function exportCsv() {
    if (!state.sales.length) {
      alert('No sales data to export.');
      return;
    }

    const header = ['Sale ID', 'Date', 'Customer', 'Items', 'Subtotal', 'Tax', 'Total'];
    const rows = state.sales.map((sale) => {
      const customerParts = [];
      if (sale.customer?.name) customerParts.push(sale.customer.name);
      if (sale.customer?.phone) customerParts.push(sale.customer.phone);
      const customerValue = customerParts.join(' | ');
      return [
        sale.id,
        new Date(sale.timestamp).toLocaleString(),
        customerValue,
        sale.items
          .map(
            (item) =>
              `${item.brand ? `${item.brand} – ` : ''}${item.name} (x${item.quantity}, GST ${formatGstRate(
                getItemGstRate(item),
              )}%)`,
          )
          .join('; '),
        sale.subtotal.toFixed(2),
        sale.tax.toFixed(2),
        sale.total.toFixed(2),
      ];
    });

    const csvContent = [header, ...rows]
      .map((row) => row.map((col) => `"${col.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function clearSalesData() {
    if (!state.sales.length) {
      alert('Sales data is already empty.');
      return;
    }

    if (!confirm('Clear all recorded sales? This cannot be undone.')) {
      return;
    }

    localStorage.removeItem(STORAGE_KEYS.sales);
    state.sales = [];
    renderSummary();
    renderTable();
  }

  function getStoredData(key, fallback) {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : fallback;
    } catch (error) {
      console.error('Failed to read storage', error);
      return fallback;
    }
  }

  function enforceAdminRole() {
    const session = getStoredData(STORAGE_KEYS.session, null);
    if (session?.authenticated && session?.activeRole === 'admin') {
      return true;
    }
    document.body.innerHTML = `
      <div class="container py-5 text-center">
        <div class="alert alert-warning d-inline-block text-start">
          <h4 class="alert-heading">Access Restricted</h4>
          <p class="mb-3">Reports are available only to Admin users.</p>
          <hr />
          <a class="btn btn-primary" href="index.html">Back to Billing</a>
        </div>
      </div>
    `;
    return false;
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

