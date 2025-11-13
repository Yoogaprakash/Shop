(() => {
  const STORAGE_KEYS = {
    categories: 'bb_electrical_categories',
    items: 'bb_electrical_items',
    sales: 'bb_electrical_sales',
    settings: 'bb_electrical_settings',
    session: 'bb_electrical_session',
  };

  const ROLE_CREDENTIALS = {
    admin: {
      username: 'admin',
      password: 'admin@123',
      label: 'Admin',
    },
    sales: {
      username: 'sales',
      password: 'sales@123',
      label: 'Sales',
    },
  };

  const defaultData = {
    categories: [
      {
        id: crypto.randomUUID(),
        name: 'Lights',
        description: 'LED bulbs and lighting solutions',
      },
      {
        id: crypto.randomUUID(),
        name: 'Fans',
        description: 'Ceiling and table fans',
      },
    ],
  };

  const defaultItems = (categories) => [
    {
      id: crypto.randomUUID(),
      categoryId: categories[0].id,
      name: 'Philips 9W LED Bulb',
      brand: 'Philips',
      price: 110,
      gstRate: 12,
      stock: 120,
      image:
        'https://images.philips.com/is/image/PhilipsConsumer/8718699749582-GAL-global-001?$jpglarge$&wid=960',
      description: 'Bright and efficient LED bulb with 9W power.',
    },
    {
      id: crypto.randomUUID(),
      categoryId: categories[0].id,
      name: 'Orient 9W LED Bulb',
      brand: 'Orient',
      price: 95,
      gstRate: 12,
      stock: 80,
      image:
        'https://orientappelectricals.com/media/catalog/product/cache/53ecb688178e176eeb79b52eeb2ade36/o/r/orient_-_tona_9w_led_bulb.png',
      description: 'Reliable Orient LED bulb with excellent power savings.',
    },
    {
      id: crypto.randomUUID(),
      categoryId: categories[1].id,
      name: 'Crompton High Breeze Fan',
      brand: 'Crompton',
      price: 2590,
      gstRate: 18,
      stock: 35,
      image:
        'https://www.crompton.co.in/wp-content/uploads/2023/06/high-breeze-fan.png',
      description: '1200mm ceiling fan with superior air delivery.',
    },
    {
      id: crypto.randomUUID(),
      categoryId: categories[1].id,
      name: 'Havells Efficiencia Neo Fan',
      brand: 'Havells',
      price: 2899,
      gstRate: 18,
      stock: 20,
      image:
        'https://havells.com/HavellsProductImages/LICHTECH/ceiling-fans/efficiencia-neo-snow-white.png',
      description: 'BLDC fan with 65% energy savings and remote control.',
    },
  ];

  const DEFAULT_SETTINGS = {
    shopName: 'Bright & Breeze Electricals',
    shopTagline: 'Lighting & Cooling Experts',
    shopAddress: '',
    shopContact: 'Phone: +91-90000 00000',
    upiId: 'brightbreeze@upi',
    gstEnabled: true,
    billSeries: 1,
  };

  function getStoredData(key, fallback) {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : fallback;
    } catch (error) {
      console.error('Failed to parse storage', error);
      return fallback;
    }
  }

  function setStoredData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeItem(item) {
    const priceValue =
      typeof item.price === 'number'
        ? item.price
        : typeof item.price === 'string'
        ? parseFloat(item.price)
        : 0;
    return {
      gstRate: 0,
      brand: '',
      stock: null,
      ...item,
      price: Number.isFinite(priceValue) && priceValue >= 0 ? priceValue : 0,
      gstRate: sanitizeGstRate(item.gstRate),
      brand: typeof item.brand === 'string' ? item.brand.trim() : '',
      stock: sanitizeStock(item.stock),
    };
  }

  const state = {
    categories: [],
    items: [],
    cart: [],
    selectedCategoryId: null,
    settings: { ...DEFAULT_SETTINGS },
    lastTotals: { subtotal: 0, tax: 0, total: 0 },
    activeRole: 'sales',
    customer: {
      name: '',
      phone: '',
    },
    isAuthenticated: false,
    sessionUserId: null,
  };

  let pendingItemImageData = null;

  // DOM references
  const navShopName = document.getElementById('navShopName');
  const navShopIcon = document.getElementById('navShopIcon');
  const categoryList = document.querySelector('#categoryList');
  const categoryTitle = document.querySelector('#categoryTitle');
  const productGrid = document.querySelector('#productGrid');
  const cartTableBody = document.querySelector('#cartTableBody');
  const cartCount = document.querySelector('#cartCount');
  const subtotalValue = document.querySelector('#subtotalValue');
  const taxValue = document.querySelector('#taxValue');
  const totalValue = document.querySelector('#totalValue');
  const payModalTotal = document.querySelector('#payModalTotal');
  const gstHeaderCell = document.getElementById('gstHeaderCell');
  const gstSummaryRow = document.getElementById('gstSummaryRow');

  const categoryModal = document.getElementById('categoryModal');
  const categoryForm = document.getElementById('categoryForm');
  const itemModal = document.getElementById('itemModal');
  const itemForm = document.getElementById('itemForm');
  const itemBrandInput = document.getElementById('itemBrand');
  const itemPriceInput = document.getElementById('itemPrice');
  const itemStockInput = document.getElementById('itemStock');
  const itemImageInput = document.getElementById('itemImage');
  const settingsForm = document.getElementById('settingsForm');
  const shopNameInput = document.getElementById('shopNameInput');
  const shopTaglineInput = document.getElementById('shopTaglineInput');
  const shopAddressInput = document.getElementById('shopAddressInput');
  const shopContactInput = document.getElementById('shopContactInput');
  const upiIdInput = document.getElementById('upiIdInput');
  const billSeriesInput = document.getElementById('billSeriesInput');
  const gstToggle = document.getElementById('gstToggle');
  const settingsQrPreview = document.getElementById('settingsQrPreview');
  const activeRoleLabel = document.getElementById('activeRoleLabel');
  const sessionStatusLabel = document.getElementById('sessionStatusLabel');
  const adminOnlyControls = document.querySelectorAll('.admin-only');
  const customerNameInput = document.getElementById('customerNameInput');
  const customerPhoneInput = document.getElementById('customerPhoneInput');
  const completeSaleBtn = document.getElementById('completeSaleBtn');
  const itemImageFileInput = document.getElementById('itemImageFile');
  const itemImagePreview = document.getElementById('itemImagePreview');
  const resetItemImageBtn = document.getElementById('resetItemImageBtn');
  const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
  const exportItemsBtn = document.getElementById('exportItemsBtn');
  const importItemsBtn = document.getElementById('importItemsBtn');
  const itemImportInput = document.getElementById('itemImportInput');
  const companyNameEl = document.getElementById('companyName');
  const companyTaglineEl = document.getElementById('companyTagline');
  const companyAddressEl = document.getElementById('companyAddress');
  const companyContactEl = document.getElementById('companyContact');
  const openLoginModalBtn = document.getElementById('openLoginModalBtn');

  const settingsModalElement = document.getElementById('settingsModal');
  const payModalElement = document.getElementById('payModal');
  const loginModalElement = document.getElementById('loginModal');
  const payQrImage = document.getElementById('payQrImage');
  const payModalUpi = document.getElementById('payModalUpi');
  const payModalLink = document.getElementById('payModalLink');
  const loginForm = document.getElementById('loginForm');
  const loginUserIdInput = document.getElementById('loginUserId');
  const loginPasswordInput = document.getElementById('loginPassword');
  const loginErrorAlert = document.getElementById('loginErrorAlert');
  const logoutBtn = document.getElementById('logoutBtn');

  const payModalInstance = payModalElement
    ? bootstrap.Modal.getOrCreateInstance(payModalElement)
    : null;
  const settingsModalInstance = settingsModalElement
    ? bootstrap.Modal.getOrCreateInstance(settingsModalElement)
    : null;
  const loginModalInstance = loginModalElement
    ? bootstrap.Modal.getOrCreateInstance(loginModalElement)
    : null;

  function persistSession() {
    if (state.isAuthenticated) {
      setStoredData(STORAGE_KEYS.session, {
        activeRole: state.activeRole,
        userId: state.sessionUserId,
        authenticated: true,
      });
    } else {
      localStorage.removeItem(STORAGE_KEYS.session);
    }
  }

  function isAdmin() {
    return state.activeRole === 'admin';
  }

  function isGstEnabled() {
    return Boolean(state.settings?.gstEnabled);
  }

  function updateSessionUi() {
    const label = getRoleLabel(state.activeRole);
    const userSuffix =
      state.isAuthenticated && state.sessionUserId
        ? ` (${state.sessionUserId})`
        : '';
    if (activeRoleLabel) {
      activeRoleLabel.textContent = state.isAuthenticated
        ? `${label}${userSuffix}`
        : 'Guest';
    }
    if (sessionStatusLabel) {
      sessionStatusLabel.textContent = state.isAuthenticated
        ? 'Logged in as'
        : 'Please log in';
      sessionStatusLabel.classList.toggle('text-warning', !state.isAuthenticated);
    }
    if (openLoginModalBtn) {
      openLoginModalBtn.classList.toggle('d-none', state.isAuthenticated);
    }
    if (logoutBtn) {
      logoutBtn.classList.toggle('d-none', !state.isAuthenticated);
    }
  }

  function syncCustomerInputs() {
    if (customerNameInput) {
      customerNameInput.value = state.customer.name;
    }
    if (customerPhoneInput) {
      customerPhoneInput.value = state.customer.phone;
    }
  }

  function refreshCustomerStateFromInputs() {
    if (customerNameInput) {
      state.customer.name = customerNameInput.value.trim();
    }
    if (customerPhoneInput) {
      state.customer.phone = customerPhoneInput.value.trim();
    }
  }

  function getCustomerSnapshot() {
    const name = state.customer.name?.trim() ?? '';
    const phone = state.customer.phone?.trim() ?? '';
    return {
      name: name || 'Walk-in Customer',
      phone: phone || '',
    };
  }

  function isValidRole(candidate) {
    return candidate === 'admin' || candidate === 'sales';
  }

  function getRoleLabel(role) {
    return ROLE_CREDENTIALS[role]?.label ?? role;
  }

  function clearLoginForm() {
    if (loginForm) {
      loginForm.reset();
    }
    if (loginErrorAlert) {
      loginErrorAlert.classList.add('d-none');
    }
  }

  function showLoginModal() {
    if (!loginModalInstance) {
      return;
    }
    clearLoginForm();
    loginModalInstance.show();
  }

  function ensureAuthenticated() {
    if (!state.isAuthenticated) {
      setTimeout(() => showLoginModal(), 150);
    }
  }

  function handleLoginSubmit(event) {
    event.preventDefault();
    if (!loginUserIdInput || !loginPasswordInput) {
      return;
    }
    const userId = loginUserIdInput.value.trim().toLowerCase();
    const password = loginPasswordInput.value;
    const credentialEntry = Object.entries(ROLE_CREDENTIALS).find(
      ([, creds]) => creds.username.toLowerCase() === userId,
    );
    const [matchedRole, credentials] = credentialEntry ?? [];
    const isValid =
      credentials &&
      password === credentials.password &&
      credentials.username.toLowerCase() === userId;

    if (!isValid) {
      if (loginErrorAlert) {
        loginErrorAlert.classList.remove('d-none');
      }
      return;
    }

    state.isAuthenticated = true;
    state.activeRole = matchedRole;
    state.sessionUserId = credentials.username;
    persistSession();
    setRole(matchedRole, { skipRender: true });
    renderCategories();
    renderProducts();
    renderCart();
    updateRoleUi();
    loginModalInstance?.hide();
    clearLoginForm();
  }

  function handleLogout() {
    state.isAuthenticated = false;
    state.sessionUserId = null;
    state.customer = { name: '', phone: '' };
    persistSession();
    setRole('sales');
    refreshPaymentUi();
    syncCustomerInputs();
    updateRoleUi();
    ensureAuthenticated();
  }

  function isDataUrl(value) {
    return typeof value === 'string' && value.startsWith('data:image');
  }

  function updateItemImagePreview(src) {
    if (!itemImagePreview) {
      return;
    }
    itemImagePreview.src = src || 'assets/img/placeholder.svg';
  }

  function resetItemImageState(imageSource = '') {
    pendingItemImageData = isDataUrl(imageSource) ? imageSource : null;
    updateItemImagePreview(imageSource || 'assets/img/placeholder.svg');
    if (itemImageInput) {
      itemImageInput.value = isDataUrl(imageSource) ? '' : imageSource || '';
    }
    if (itemImageFileInput) {
      itemImageFileInput.value = '';
    }
  }

  function handleItemImageFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      pendingItemImageData = null;
      updateItemImagePreview(itemImageInput?.value || 'assets/img/placeholder.svg');
      return;
    }
    if (file.size > 1024 * 1024 * 2) {
      alert('Please choose an image smaller than 2MB.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      pendingItemImageData = reader.result;
      updateItemImagePreview(pendingItemImageData);
    };
    reader.onerror = () => {
      alert('Unable to read the selected image file.');
    };
    reader.readAsDataURL(file);
  }

  function handleCustomerNameInput(event) {
    state.customer.name = event.target.value;
  }

  function handleCustomerPhoneInput(event) {
    state.customer.phone = event.target.value;
  }

  function updateRoleUi() {
    updateSessionUi();
  }

  function applyRolePermissions() {
    const adminVisible = state.isAuthenticated && isAdmin();
    adminOnlyControls.forEach((element) => {
      const hide = !adminVisible;
      element.classList.toggle('d-none', hide);
      if (hide && element.matches('button, a')) {
        element.setAttribute('tabindex', '-1');
        element.setAttribute('aria-disabled', 'true');
      } else {
        element.removeAttribute('tabindex');
        element.removeAttribute('aria-disabled');
      }
    });

    if (!adminVisible && settingsModalInstance) {
      settingsModalInstance.hide();
    }
  }

  function updateGstVisibility() {
    const enabled = isGstEnabled();
    gstHeaderCell?.classList.toggle('d-none', !enabled);
    gstSummaryRow?.classList.toggle('d-none', !enabled);
    document
      .querySelectorAll('.cart-gst-cell')
      .forEach((cell) => cell.classList.toggle('d-none', !enabled));
  }

  function applySettingsToUi() {
    const {
      shopName,
      shopTagline,
      shopAddress,
      shopContact,
      upiId,
      gstEnabled,
      billSeries,
    } = state.settings;

    if (shopNameInput) {
      shopNameInput.value = shopName ?? '';
    }
    if (shopTaglineInput) {
      shopTaglineInput.value = shopTagline ?? '';
    }
    if (shopAddressInput) {
      shopAddressInput.value = shopAddress ?? '';
    }
    if (shopContactInput) {
      shopContactInput.value = shopContact ?? '';
    }
    if (upiIdInput) {
      upiIdInput.value = upiId ?? '';
    }
    if (billSeriesInput) {
      billSeriesInput.value = billSeries ?? 1;
    }
    if (gstToggle) {
      gstToggle.checked = gstEnabled !== false;
    }
    if (navShopName) {
      navShopName.textContent = shopName || DEFAULT_SETTINGS.shopName;
    }
    if (navShopIcon) {
      const initial = (shopName || DEFAULT_SETTINGS.shopName || '').trim().charAt(0);
      navShopIcon.textContent = initial ? initial.toUpperCase() : '🏪';
    }
    if (companyNameEl) {
      companyNameEl.textContent = shopName || DEFAULT_SETTINGS.shopName;
    }
    if (companyTaglineEl) {
      const taglineText = shopTagline || DEFAULT_SETTINGS.shopTagline;
      companyTaglineEl.textContent = taglineText;
      companyTaglineEl.classList.toggle('d-none', !taglineText);
    }
    if (companyAddressEl) {
      const addressSafe = escapeHtml(shopAddress || '');
      const addressHtml = addressSafe.replace(/\n/g, '<br />');
      companyAddressEl.innerHTML = addressHtml;
      companyAddressEl.classList.toggle('d-none', !shopAddress);
    }
    if (companyContactEl) {
      companyContactEl.textContent =
        shopContact || DEFAULT_SETTINGS.shopContact || '';
    }
    document.title = `${shopName || DEFAULT_SETTINGS.shopName} – Point of Sale`;

    updateGstVisibility();
  }

  function setRole(role, { persist = true, skipRender = false } = {}) {
    state.activeRole = role === 'admin' ? 'admin' : 'sales';
    if (persist) {
      persistSession();
    }
    updateRoleUi();
    applyRolePermissions();
    if (!skipRender) {
      renderCategories();
      renderProducts();
      renderCart();
    }
  }

  function init() {
    if (!categoryList || !productGrid) {
      return;
    }

    const storedCategories = getStoredData(STORAGE_KEYS.categories, null);
    if (storedCategories?.length) {
      state.categories = storedCategories;
    } else {
      state.categories = defaultData.categories;
      setStoredData(STORAGE_KEYS.categories, state.categories);
    }

    const storedItems = getStoredData(STORAGE_KEYS.items, null);
    if (storedItems?.length) {
      state.items = storedItems.map(normalizeItem);
    } else {
      state.items = defaultItems(state.categories).map(normalizeItem);
      setStoredData(STORAGE_KEYS.items, state.items);
    }

    const storedSettings = getStoredData(STORAGE_KEYS.settings, null);
    if (storedSettings) {
      state.settings = {
        ...state.settings,
        ...storedSettings,
      };
    }

    const storedSession = getStoredData(STORAGE_KEYS.session, null);
    if (
      storedSession?.authenticated &&
      storedSession?.activeRole &&
      isValidRole(storedSession.activeRole)
    ) {
      state.activeRole = storedSession.activeRole;
      state.isAuthenticated = true;
      state.sessionUserId =
        storedSession.userId || ROLE_CREDENTIALS[state.activeRole]?.username || null;
    } else {
      state.activeRole = 'sales';
      state.isAuthenticated = false;
      state.sessionUserId = null;
    }

    applySettingsToUi();
    updateSettingsPreview();
    refreshPaymentUi();
    syncCustomerInputs();
    setRole(state.activeRole, { persist: false, skipRender: true });

    state.selectedCategoryId = state.categories[0]?.id ?? null;

    bindEvents();
    renderCategories();
    renderProducts();
    renderCart();
    updateSessionUi();
    ensureAuthenticated();
  }

  function bindEvents() {
    document.getElementById('addCategoryBtn')?.addEventListener('click', () =>
      openCategoryModal(),
    );
    document.getElementById('addItemBtn')?.addEventListener('click', () =>
      openItemModal(),
    );
    document.getElementById('clearCartBtn')?.addEventListener('click', clearCart);
    document.getElementById('printBillBtn')?.addEventListener('click', printBill);
    document.getElementById('payNowBtn')?.addEventListener('click', showPayModal);

    categoryForm?.addEventListener('submit', handleCategorySubmit);
    itemForm?.addEventListener('submit', handleItemSubmit);
    settingsForm?.addEventListener('submit', handleSettingsSubmit);
    upiIdInput?.addEventListener('input', updateSettingsPreview);
    customerNameInput?.addEventListener('input', handleCustomerNameInput);
    customerPhoneInput?.addEventListener('input', handleCustomerPhoneInput);
    itemImageFileInput?.addEventListener('change', handleItemImageFileChange);
    itemImageInput?.addEventListener('input', () =>
      updateItemImagePreview(
        pendingItemImageData || itemImageInput.value.trim() || 'assets/img/placeholder.svg',
      ),
    );
    resetItemImageBtn?.addEventListener('click', () => resetItemImageState(''));
    downloadTemplateBtn?.addEventListener('click', downloadItemTemplate);
    exportItemsBtn?.addEventListener('click', exportItemsWorkbook);
    importItemsBtn?.addEventListener('click', handleImportItemsClick);
    itemImportInput?.addEventListener('change', handleItemImportInput);
    openLoginModalBtn?.addEventListener('click', showLoginModal);
    logoutBtn?.addEventListener('click', handleLogout);
    loginForm?.addEventListener('submit', handleLoginSubmit);
    loginModalElement?.addEventListener('shown.bs.modal', () => {
      loginUserIdInput?.focus();
    });

    completeSaleBtn?.addEventListener('click', () => {
      const sale = recordSale({ silent: true });
      payModalInstance?.hide();
      if (sale) {
        const invoiceModel = buildInvoiceModel({
          lineItems: sale.items,
          totals: {
            subtotal: sale.subtotal,
            tax: sale.tax,
            total: sale.total,
          },
          timestamp: new Date(sale.timestamp),
          billNumber: sale.billNumber,
          customer: sale.customer,
          gstEnabledOverride: sale.gstEnabled,
        });
        printInvoice(invoiceModel);
      }
    });
  }

  function renderCategories() {
    categoryList.innerHTML = '';
    if (!state.categories.length) {
      categoryList.innerHTML =
        '<div class="list-group-item text-muted">No categories yet</div>';
      categoryTitle.textContent = 'Products';
      return;
    }

    state.categories.forEach((category) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
        category.id === state.selectedCategoryId ? 'active' : ''
      }`;
      const actions = isAdmin()
        ? `<span class="btn-group btn-group-sm category-actions">
            <button class="btn btn-outline-light edit-category" data-id="${category.id}" aria-label="Edit category">✎</button>
            <button class="btn btn-outline-light delete-category" data-id="${category.id}" aria-label="Delete category">🗑</button>
          </span>`
        : '';
      button.innerHTML = `
        <span>
          <strong>${category.name}</strong>
          <br />
          <small class="text-muted">${category.description || ''}</small>
        </span>
        ${actions}
      `;

      button.addEventListener('click', (event) => {
        if (
          event.target.closest('.edit-category') ||
          event.target.closest('.delete-category')
        ) {
          return;
        }
        state.selectedCategoryId = category.id;
        renderCategories();
        renderProducts();
      });

      if (isAdmin()) {
        button
          .querySelector('.edit-category')
          ?.addEventListener('click', (event) => {
            event.stopPropagation();
            openCategoryModal(category);
          });

        button
          .querySelector('.delete-category')
          ?.addEventListener('click', (event) => {
            event.stopPropagation();
            deleteCategory(category.id);
          });
      }

      categoryList.appendChild(button);
    });

    const selected = state.categories.find(
      (cat) => cat.id === state.selectedCategoryId,
    );
    categoryTitle.textContent = selected ? selected.name : 'Products';
    populateCategorySelect();
  }

  function renderProducts() {
    productGrid.innerHTML = '';

    const filteredItems = state.items.filter(
      (item) => item.categoryId === state.selectedCategoryId,
    );

    if (!filteredItems.length) {
      productGrid.innerHTML =
        '<div class="col"><div class="alert alert-info mb-0">No items in this category yet.</div></div>';
      return;
    }

    filteredItems.forEach((item) => {
      const availableStock = getAvailableStock(item.id);
      const stockManaged = isStockManaged(item);
      const outOfStock = stockManaged && availableStock <= 0;
      const lowStock = stockManaged && availableStock > 0 && availableStock <= 5;
      const stockBadge = stockManaged
        ? `<span class="badge ${
            outOfStock
              ? 'bg-danger'
              : lowStock
              ? 'bg-warning text-dark'
              : 'bg-success'
          } stock-badge">${formatStockLabel({
            ...item,
            stock: availableStock,
          })}</span>`
        : '<span class="badge bg-success stock-badge">In Stock</span>';

      const col = document.createElement('div');
      col.className = 'col';
      const actionButtons = isAdmin()
        ? `<div class="btn-group btn-group-sm">
              <button class="btn btn-outline-secondary edit-item" data-id="${item.id}">Edit</button>
              <button class="btn btn-outline-danger delete-item" data-id="${item.id}">Delete</button>
           </div>`
        : '';
      col.innerHTML = `
        <div class="card product-card h-100" data-id="${item.id}">
          <img src="${item.image || 'assets/img/placeholder.svg'}" class="card-img-top" alt="${item.name}" onerror="this.onerror=null;this.src='assets/img/placeholder.svg';" />
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div>
                <h5 class="card-title mb-1">${item.name}</h5>
                ${item.brand ? `<div class="text-muted small">${escapeHtml(item.brand)}</div>` : ''}
              </div>
              ${stockBadge}
            </div>
            ${item.description ? `<p class="card-text text-muted small mb-1">${item.description}</p>` : ''}
            <p class="card-text text-muted small mb-2">GST: ${formatGstRateLabel(item.gstRate)}%</p>
            <div class="mt-auto">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="fw-bold text-primary">₹${item.price.toFixed(2)}</span>
                ${actionButtons}
              </div>
              <button class="btn btn-primary w-100 add-to-cart" data-id="${item.id}" ${
                outOfStock ? 'disabled' : ''
              }>
                ${outOfStock ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      `;

      col.querySelector('.add-to-cart').addEventListener('click', () =>
        addToCart(item.id),
      );
      if (isAdmin()) {
        col.querySelector('.edit-item')?.addEventListener('click', () =>
          openItemModal(item),
        );
        col.querySelector('.delete-item')?.addEventListener('click', () =>
          deleteItem(item.id),
        );
      }

      productGrid.appendChild(col);
    });
  }

  function renderCart() {
    cartTableBody.innerHTML = '';
    if (!state.cart.length) {
      cartTableBody.innerHTML =
        '<tr><td colspan="5" class="text-center text-muted">Cart is empty</td></tr>';
      cartCount.textContent = '0 items';
      updateTotals();
      return;
    }

    const gstEnabled = isGstEnabled();

    state.cart.forEach((cartItem) => {
      const item = state.items.find((it) => it.id === cartItem.itemId);
      if (!item) {
        return;
      }

      const price = item.price ?? 0;
      const quantity = cartItem.quantity;
      const stockManaged = isStockManaged(item);
      const remainingStock = stockManaged ? item.stock - quantity : Number.POSITIVE_INFINITY;
      const gstRate = sanitizeGstRate(
        typeof cartItem.gstRate === 'number' ? cartItem.gstRate : item.gstRate,
      );
      cartItem.gstRate = gstRate;

      const lineSubtotal = price * quantity;
      const effectiveGstRate = gstEnabled ? gstRate : 0;
      const gstAmount = lineSubtotal * (effectiveGstRate / 100);
      const lineTotal = lineSubtotal + gstAmount;
      const gstCellClass = gstEnabled ? '' : 'd-none';
      const gstInputState = gstEnabled ? '' : 'disabled';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div class="fw-semibold">${item.name}</div>
          ${item.brand ? `<div class="text-muted small">${escapeHtml(item.brand)}</div>` : ''}
          <small class="text-muted">₹${price.toFixed(2)}</small>
          ${
            stockManaged
              ? `<div class="small ${remainingStock < 0 ? 'text-danger' : 'text-muted'}">
                  Stock left: ${Math.max(0, remainingStock)}
                 </div>`
              : ''
          }
        </td>
        <td class="text-center">
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-outline-secondary decrease" data-id="${item.id}">-</button>
            <span class="btn btn-outline-light disabled">${cartItem.quantity}</span>
            <button class="btn btn-outline-secondary increase" data-id="${item.id}" ${
              stockManaged && cartItem.quantity >= item.stock ? 'disabled' : ''
            }>+</button>
          </div>
        </td>
        <td class="text-center cart-gst-cell ${gstCellClass}">
          <input
            type="number"
            class="form-control form-control-sm cart-gst-input"
            data-id="${item.id}"
            min="0"
            step="0.1"
            value="${formatGstRateInput(gstRate)}"
            ${gstInputState}
          />
        </td>
        <td class="text-end">₹${lineTotal.toFixed(2)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger remove" data-id="${item.id}">✕</button>
        </td>
      `;

      row.querySelector('.decrease').addEventListener('click', () =>
        updateQuantity(item.id, cartItem.quantity - 1),
      );
      row.querySelector('.increase').addEventListener('click', () =>
        updateQuantity(item.id, cartItem.quantity + 1),
      );
      row.querySelector('.remove').addEventListener('click', () =>
        removeFromCart(item.id),
      );
      if (gstEnabled) {
        row
          .querySelector('.cart-gst-input')
          .addEventListener('change', (event) =>
            updateCartGst(item.id, event.target.value),
          );
      }

      cartTableBody.appendChild(row);
    });

    cartCount.textContent = `${state.cart.reduce(
      (sum, item) => sum + item.quantity,
      0,
    )} items`;
    updateTotals();
    updateGstVisibility();
  }

  function downloadItemTemplate() {
    if (!ensureSheetJsAvailable()) {
      return;
    }
    const header = [
      ['Name', 'Brand', 'Price', 'GST', 'Stock', 'Category', 'Description', 'ImageURL'],
    ];
    const itemsSheet = window.XLSX.utils.aoa_to_sheet(header);
    const categoryRows = [
      ['Name', 'Description'],
      ...state.categories.map((category) => [
        category.name,
        category.description || '',
      ]),
    ];
    const categoriesSheet = window.XLSX.utils.aoa_to_sheet(categoryRows);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Items');
    window.XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Categories');
    window.XLSX.writeFile(workbook, 'item-template.xlsx', { compression: true });
  }

  function exportItemsWorkbook() {
    if (!ensureSheetJsAvailable()) {
      return;
    }
    const rows = [
      ['Name', 'Brand', 'Price', 'GST', 'Stock', 'Category', 'Description', 'ImageURL'],
      ...state.items.map((item) => [
        item.name,
        item.brand || '',
        Number(item.price ?? 0),
        sanitizeGstRate(item.gstRate ?? 0),
        isStockManaged(item) ? item.stock : '',
        getCategoryNameById(item.categoryId),
        item.description || '',
        item.image || '',
      ]),
    ];
    const itemsSheet = window.XLSX.utils.aoa_to_sheet(rows);
    const categoryRows = [
      ['Name', 'Description'],
      ...state.categories.map((category) => [
        category.name,
        category.description || '',
      ]),
    ];
    const categoriesSheet = window.XLSX.utils.aoa_to_sheet(categoryRows);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Items');
    window.XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Categories');
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '');
    window.XLSX.writeFile(workbook, `items-export-${timestamp}.xlsx`, {
      compression: true,
    });
  }

  function handleImportItemsClick() {
    if (!ensureSheetJsAvailable()) {
      return;
    }
    itemImportInput?.click();
  }

  function handleItemImportInput(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!ensureSheetJsAvailable()) {
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const data = new Uint8Array(loadEvent.target.result);
        const workbook = window.XLSX.read(data, { type: 'array' });
        applyItemsImport(workbook);
      } catch (error) {
        console.error('Failed to import items', error);
        alert('Unable to import the selected file. Please verify the template format.');
      } finally {
        event.target.value = '';
      }
    };
    reader.onerror = () => {
      alert('Unable to read the selected file.');
      event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  }

  function applyItemsImport(workbook) {
    const sheetNames = workbook.SheetNames ?? [];
    if (!sheetNames.length) {
      alert('The uploaded workbook is empty.');
      return;
    }

    const itemsSheetName =
      sheetNames.find((name) => name.toLowerCase() === 'items') ?? sheetNames[0];
    const itemsSheet = workbook.Sheets[itemsSheetName];
    if (!itemsSheet) {
      alert('Items sheet not found in the workbook.');
      return;
    }

    const categorySheetName = sheetNames.find(
      (name) => name.toLowerCase() === 'categories',
    );
    if (categorySheetName) {
      const categorySheet = workbook.Sheets[categorySheetName];
      if (categorySheet) {
        const categoryRows = window.XLSX.utils.sheet_to_json(categorySheet, {
          header: 1,
          defval: '',
        });
        categoryRows.shift(); // headers
        categoryRows.forEach((row) => {
          const [rawName, rawDescription] = row;
          const name = typeof rawName === 'string' ? rawName.trim() : '';
          if (!name) {
            return;
          }
          const description =
            typeof rawDescription === 'string' ? rawDescription.trim() : '';
          const existing = state.categories.find(
            (cat) => cat.name.trim().toLowerCase() === name.toLowerCase(),
          );
          if (existing) {
            existing.description = description;
          } else {
            const newCategory = {
              id: crypto.randomUUID(),
              name,
              description,
            };
            state.categories.push(newCategory);
          }
        });
      }
    }

    const itemRows = window.XLSX.utils.sheet_to_json(itemsSheet, {
      header: 1,
      defval: '',
    });
    if (!itemRows.length) {
      alert('No item rows found to import.');
      return;
    }
    const headerRow = itemRows.shift().map((cell) =>
      cell?.toString().trim().toLowerCase(),
    );
    const columnIndex = {
      name: headerRow.indexOf('name'),
      brand: headerRow.indexOf('brand'),
      price: headerRow.indexOf('price'),
      gst: headerRow.indexOf('gst'),
      stock: headerRow.indexOf('stock'),
      category: headerRow.indexOf('category'),
      description: headerRow.indexOf('description'),
      image: headerRow.indexOf('imageurl'),
    };

    const getCellValue = (row, index) =>
      index >= 0 && index < row.length ? row[index] : '';

    const categoryLookup = new Map(
      state.categories.map((cat) => [cat.name.trim().toLowerCase(), cat]),
    );

    itemRows.forEach((row) => {
      const rawName = getCellValue(row, columnIndex.name);
      const name =
        typeof rawName === 'string' ? rawName.trim() : rawName?.toString().trim();
      if (!name) {
        return;
      }
      const rawBrand = getCellValue(row, columnIndex.brand);
      const brand =
        typeof rawBrand === 'string'
          ? rawBrand.trim()
          : rawBrand !== undefined && rawBrand !== null
          ? String(rawBrand).trim()
          : '';
      const rawPrice = getCellValue(row, columnIndex.price);
      const price = parseFloat(rawPrice) || 0;
      const gstValue = getCellValue(row, columnIndex.gst);
      const gstRate = sanitizeGstRate(gstValue);
      const stockValue = sanitizeStock(getCellValue(row, columnIndex.stock));
      const categoryNameCell = getCellValue(row, columnIndex.category);
      const categoryName =
        typeof categoryNameCell === 'string'
          ? categoryNameCell.trim()
          : categoryNameCell?.toString().trim();
      const descriptionCell = getCellValue(row, columnIndex.description);
      const description =
        typeof descriptionCell === 'string'
          ? descriptionCell.trim()
          : descriptionCell?.toString().trim() ?? '';
      const image =
        getCellValue(row, columnIndex.image)?.toString().trim() ||
        'assets/img/placeholder.svg';

      let category = categoryLookup.get((categoryName || '').toLowerCase());
      if (!category) {
        if (categoryName) {
          category = {
            id: crypto.randomUUID(),
            name: categoryName,
            description: '',
          };
          state.categories.push(category);
          categoryLookup.set(categoryName.toLowerCase(), category);
        } else if (state.categories.length) {
          category = state.categories[0];
        } else {
          category = {
            id: crypto.randomUUID(),
            name: 'General',
            description: '',
          };
          state.categories.push(category);
          categoryLookup.set('general', category);
        }
      }

      const normalizedItem = normalizeItem({
        id: crypto.randomUUID(),
        name,
        brand,
        price,
        gstRate,
        stock: stockValue,
        categoryId: category?.id ?? null,
        description,
        image,
      });

      const existing = state.items.find((candidate) => {
        const sameName =
          candidate.name.trim().toLowerCase() === normalizedItem.name.trim().toLowerCase();
        const sameBrand =
          (candidate.brand || '').trim().toLowerCase() ===
          (normalizedItem.brand || '').trim().toLowerCase();
        return sameName && sameBrand;
      });

      if (existing) {
        existing.name = normalizedItem.name;
        existing.brand = normalizedItem.brand;
        existing.price = normalizedItem.price;
        existing.gstRate = normalizedItem.gstRate;
        existing.categoryId = normalizedItem.categoryId;
        existing.description = normalizedItem.description;
        existing.image = normalizedItem.image;
        existing.stock = normalizedItem.stock;
      } else {
        state.items.push({
          ...normalizedItem,
          id: normalizedItem.id || crypto.randomUUID(),
        });
      }
    });

    if (!state.categories.find((cat) => cat.id === state.selectedCategoryId)) {
      state.selectedCategoryId = state.categories[0]?.id ?? null;
    }

    setStoredData(STORAGE_KEYS.categories, state.categories);
    setStoredData(STORAGE_KEYS.items, state.items);
    renderCategories();
    renderProducts();
    renderCart();
    alert('Items imported successfully.');
  }

  function updateTotals() {
    const { subtotal, tax, total } = computeTotals(
      state.cart.map((cartItem) => {
        const item = state.items.find((it) => it.id === cartItem.itemId);
        return {
          price: item?.price ?? 0,
          quantity: cartItem.quantity,
          gstRate:
            typeof cartItem.gstRate === 'number'
              ? cartItem.gstRate
              : item?.gstRate ?? 0,
        };
      }),
    );

    subtotalValue.textContent = formatCurrency(subtotal);
    taxValue.textContent = formatCurrency(tax);
    totalValue.textContent = formatCurrency(total);
    payModalTotal.textContent = formatCurrency(total);
    state.lastTotals = { subtotal, tax, total };
    refreshPaymentUi();
    updateGstVisibility();
  }

  function addToCart(itemId) {
    const item = state.items.find((it) => it.id === itemId);
    if (!item) {
      return;
    }
    if (getAvailableStock(itemId) <= 0) {
      alert('This item is out of stock.');
      return;
    }
    const defaultGst = sanitizeGstRate(item?.gstRate ?? 0);
    const existing = state.cart.find((ci) => ci.itemId === itemId);
    if (existing) {
      if (isStockManaged(item) && existing.quantity + 1 > item.stock) {
        alert('Insufficient stock available.');
        return;
      }
      existing.quantity += 1;
      if (typeof existing.gstRate !== 'number') {
        existing.gstRate = defaultGst;
      }
    } else {
      state.cart.push({ itemId, quantity: 1, gstRate: defaultGst });
    }
    renderCart();
    renderProducts();
  }

  function updateQuantity(itemId, quantity) {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    const cartItem = state.cart.find((ci) => ci.itemId === itemId);
    if (cartItem) {
      const product = state.items.find((it) => it.id === itemId);
      if (product && isStockManaged(product) && quantity > product.stock) {
        alert(`Only ${product.stock} unit(s) available in stock.`);
        return;
      }
      cartItem.quantity = quantity;
    }
    renderCart();
    renderProducts();
  }

  function updateCartGst(itemId, gstRateValue) {
    if (!isGstEnabled()) {
      return;
    }
    const cartItem = state.cart.find((ci) => ci.itemId === itemId);
    if (!cartItem) {
      return;
    }
    cartItem.gstRate = sanitizeGstRate(gstRateValue);
    renderCart();
  }

  function removeFromCart(itemId) {
    state.cart = state.cart.filter((ci) => ci.itemId !== itemId);
    renderCart();
    renderProducts();
  }

  function clearCart() {
    if (!state.cart.length) return;
    if (confirm('Remove all items from the cart?')) {
      state.cart = [];
      renderCart();
      renderProducts();
    }
  }

  function openCategoryModal(category) {
    if (!isAdmin()) {
      alert('Only admin users can manage categories.');
      return;
    }
    const modal = bootstrap.Modal.getOrCreateInstance(categoryModal);
    categoryForm.reset();
    document.getElementById('categoryId').value = category?.id ?? '';
    document.getElementById('categoryName').value = category?.name ?? '';
    document.getElementById('categoryDescription').value =
      category?.description ?? '';

    document.getElementById('categoryModalLabel').textContent = category
      ? 'Edit Category'
      : 'Add Category';

    modal.show();
  }

  function handleCategorySubmit(event) {
    event.preventDefault();
    if (!isAdmin()) {
      alert('Only admin users can manage categories.');
      return;
    }
    const idInput = document.getElementById('categoryId').value;
    const name = document.getElementById('categoryName').value.trim();
    const description = document.getElementById('categoryDescription').value.trim();

    if (!name) {
      alert('Category name is required.');
      return;
    }

    if (idInput) {
      const category = state.categories.find((cat) => cat.id === idInput);
      if (category) {
        category.name = name;
        category.description = description;
      }
    } else {
      const newCategory = {
        id: crypto.randomUUID(),
        name,
        description,
      };
      state.categories.push(newCategory);
      state.selectedCategoryId = newCategory.id;
    }

    setStoredData(STORAGE_KEYS.categories, state.categories);
    renderCategories();
    renderProducts();

    bootstrap.Modal.getInstance(categoryModal)?.hide();
  }

  function deleteCategory(categoryId) {
    if (!isAdmin()) {
      alert('Only admin users can manage categories.');
      return;
    }
    const category = state.categories.find((cat) => cat.id === categoryId);
    if (!category) return;
    if (
      !confirm(
        `Delete category "${category.name}" and all its items? This action cannot be undone.`,
      )
    ) {
      return;
    }

    state.categories = state.categories.filter((cat) => cat.id !== categoryId);
    state.items = state.items.filter((item) => item.categoryId !== categoryId);
    setStoredData(STORAGE_KEYS.categories, state.categories);
    setStoredData(STORAGE_KEYS.items, state.items);

    if (state.selectedCategoryId === categoryId) {
      state.selectedCategoryId = state.categories[0]?.id ?? null;
    }
    renderCategories();
    renderProducts();
  }

  function openItemModal(item) {
    if (!state.categories.length) {
      alert('Please add a category before adding items.');
      return;
    }
    if (!isAdmin()) {
      alert('Only admin users can manage products.');
      return;
    }

    const modal = bootstrap.Modal.getOrCreateInstance(itemModal);
    itemForm.reset();

    document.getElementById('itemId').value = item?.id ?? '';
    document.getElementById('itemName').value = item?.name ?? '';
    if (itemBrandInput) {
      itemBrandInput.value = item?.brand ?? '';
    }
    if (itemPriceInput) {
      itemPriceInput.value = item?.price ?? '';
    } else {
      document.getElementById('itemPrice').value = item?.price ?? '';
    }
    if (itemStockInput) {
      itemStockInput.value =
        typeof item?.stock === 'number' && item.stock >= 0 ? item.stock : '';
    }
    resetItemImageState(item?.image ?? '');
    document.getElementById('itemGstRate').value = (item?.gstRate ?? 0).toString();
    document.getElementById('itemDescription').value = item?.description ?? '';
    populateCategorySelect(item?.categoryId ?? state.selectedCategoryId);

    document.getElementById('itemModalLabel').textContent = item
      ? 'Edit Item'
      : 'Add Item';

    modal.show();
  }

  function populateCategorySelect(selectedId = null) {
    const select = document.getElementById('itemCategory');
    if (!select) return;
    select.innerHTML = '';

    state.categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      if (category.id === selectedId) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  function handleItemSubmit(event) {
    event.preventDefault();
    if (!isAdmin()) {
      alert('Only admin users can manage products.');
      return;
    }
    const idInput = document.getElementById('itemId').value;
    const name = document.getElementById('itemName').value.trim();
    const brand = itemBrandInput?.value.trim() ?? '';
    const priceValue =
      itemPriceInput?.value ?? document.getElementById('itemPrice').value;
    const price = parseFloat(priceValue);
    const stockValue = itemStockInput?.value ?? '';
    const stock = sanitizeStock(stockValue);
    const existingItem = idInput ? state.items.find((it) => it.id === idInput) : null;
    const imageUrlInput = itemImageInput?.value.trim() ?? '';
    const finalImage =
      pendingItemImageData ||
      imageUrlInput ||
      existingItem?.image ||
      'assets/img/placeholder.svg';
    const gstRateInput = document.getElementById('itemGstRate').value;
    const gstRate = sanitizeGstRate(gstRateInput);
    const categoryId = document.getElementById('itemCategory').value;
    const description = document
      .getElementById('itemDescription')
      .value.trim();

    if (!name || Number.isNaN(price) || price < 0) {
      alert('Please provide valid item details.');
      return;
    }

    if (idInput) {
      if (existingItem) {
        existingItem.name = name;
        existingItem.price = price;
        existingItem.brand = brand;
        existingItem.image = finalImage;
        existingItem.categoryId = categoryId;
        existingItem.description = description;
        existingItem.gstRate = gstRate;
        existingItem.stock = stock;
      }
    } else {
      state.items.push({
        id: crypto.randomUUID(),
        name,
        price,
        brand,
        image: finalImage,
        categoryId,
        description,
        gstRate,
        stock,
      });
    }

    setStoredData(STORAGE_KEYS.items, state.items);
    renderProducts();
    renderCart();

    pendingItemImageData = null;
    bootstrap.Modal.getInstance(itemModal)?.hide();
  }

  function deleteItem(itemId) {
    if (!isAdmin()) {
      alert('Only admin users can manage products.');
      return;
    }
    const item = state.items.find((it) => it.id === itemId);
    if (!item) return;
    if (!confirm(`Delete "${item.name}"?`)) {
      return;
    }

    state.items = state.items.filter((it) => it.id !== itemId);
    setStoredData(STORAGE_KEYS.items, state.items);
    removeFromCart(itemId);
    renderProducts();
  }

  function showPayModal() {
    if (!state.cart.length) {
      alert('Cart is empty.');
      return;
    }
    updateTotals();
    refreshPaymentUi();
    payModalInstance?.show();
  }

  function recordSale({ silent = false } = {}) {
    refreshCustomerStateFromInputs();
    if (!state.cart.length) {
      if (!silent) {
        alert('Cart is empty.');
      }
      return null;
    }

    const sales = getStoredData(STORAGE_KEYS.sales, []);
    const timestamp = new Date();
    const gstEnabled = isGstEnabled();
    const billSeries = state.settings.billSeries ?? DEFAULT_SETTINGS.billSeries;
    const billNumber = generateBillNumber(timestamp, billSeries);
    const customerInfo = getCustomerSnapshot();

    const lineItems = state.cart
      .map((cartItem) => {
        const product = state.items.find((it) => it.id === cartItem.itemId);
        const baseGstRate =
          typeof cartItem.gstRate === 'number'
            ? cartItem.gstRate
            : product?.gstRate ?? 0;
        return buildInvoiceLineItem({
          product,
          quantity: cartItem.quantity,
          gstRate: baseGstRate,
          gstEnabledOverride: gstEnabled,
        });
      })
      .filter(Boolean);

    if (!lineItems.length) {
      if (!silent) {
        alert('No valid items to record.');
      }
      return null;
    }

    const totals = calculateTotalsFromLineItems(lineItems);

    const saleRecord = {
      id: crypto.randomUUID(),
      billNumber,
      timestamp: timestamp.toISOString(),
      items: lineItems,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      gstEnabled,
      customer: customerInfo,
    };

    lineItems.forEach((lineItem) => {
      const product = state.items.find((prod) => prod.id === lineItem.id);
      if (product && isStockManaged(product)) {
        product.stock = Math.max(0, product.stock - lineItem.quantity);
      }
    });

    sales.push(saleRecord);
    setStoredData(STORAGE_KEYS.sales, sales);
    setStoredData(STORAGE_KEYS.items, state.items);

    state.settings.billSeries = billSeries + 1;
    setStoredData(STORAGE_KEYS.settings, state.settings);
    applySettingsToUi();

    state.cart = [];
    state.customer = { name: '', phone: '' };
    syncCustomerInputs();
    renderCart();
    renderProducts();

    if (!silent) {
      alert('Payment recorded successfully!');
    }

    return saleRecord;
  }

  function computeTotals(items) {
    const gstEnabled = isGstEnabled();
    const totals = items.reduce(
      (acc, item) => {
        const price = item.price ?? 0;
        const quantity = item.quantity ?? 0;
        const gstRate =
          typeof item.gstRate === 'number' && !Number.isNaN(item.gstRate)
            ? Math.max(0, item.gstRate)
            : 0;
        const lineSubtotal = price * quantity;
        const effectiveRate = gstEnabled ? gstRate : 0;
        const lineTax = lineSubtotal * (effectiveRate / 100);
        acc.subtotal += lineSubtotal;
        acc.tax += lineTax;
        acc.total += lineSubtotal + lineTax;
        return acc;
      },
      { subtotal: 0, tax: 0, total: 0 },
    );

    return {
      subtotal: roundCurrency(totals.subtotal),
      tax: roundCurrency(totals.tax),
      total: roundCurrency(totals.total),
    };
  }

  function sanitizeGstRate(value) {
    const parsed =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
        ? parseFloat(value)
        : 0;
    if (Number.isNaN(parsed) || parsed < 0) {
      return 0;
    }
    return Math.round(parsed * 100) / 100;
  }

  function sanitizeStock(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
        ? parseInt(value, 10)
        : Number.NaN;
    if (Number.isNaN(parsed) || parsed < 0) {
      return null;
    }
    return Math.floor(parsed);
  }

  function isStockManaged(item) {
    return typeof item?.stock === 'number' && item.stock >= 0;
  }

  function getCartQuantity(itemId) {
    return state.cart
      .filter((entry) => entry.itemId === itemId)
      .reduce((sum, entry) => sum + entry.quantity, 0);
  }

  function getAvailableStock(itemId) {
    const item = state.items.find((it) => it.id === itemId);
    if (!isStockManaged(item)) {
      return Number.POSITIVE_INFINITY;
    }
    const remaining = item.stock - getCartQuantity(itemId);
    return remaining < 0 ? 0 : remaining;
  }

  function formatStockLabel(item) {
    if (!isStockManaged(item)) {
      return 'In Stock';
    }
    if (item.stock <= 0) {
      return 'Out of Stock';
    }
    if (item.stock <= 5) {
      return `Low stock (${item.stock})`;
    }
    return `${item.stock} in stock`;
  }

  function ensureSheetJsAvailable() {
    if (typeof window.XLSX === 'undefined') {
      alert('Spreadsheet library not loaded. Check your network connection and try again.');
      return false;
    }
    return true;
  }

  function getCategoryNameById(categoryId) {
    return (
      state.categories.find((category) => category.id === categoryId)?.name ??
      'Uncategorised'
    );
  }

  function formatGstRateLabel(rate) {
    const sanitized = sanitizeGstRate(rate);
    return Number.isInteger(sanitized)
      ? sanitized.toFixed(0)
      : sanitized.toString();
  }

  function formatGstRateInput(rate) {
    return sanitizeGstRate(rate).toString();
  }

  function roundCurrency(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function formatAmountForUpi(amount) {
    return roundCurrency(amount).toFixed(2);
  }

  function sanitizeUpiId(rawUpi) {
    if (!rawUpi) {
      return '';
    }
    return rawUpi.replace(/\s+/g, '').toLowerCase();
  }

  function isValidUpiId(upiId) {
    return /^[a-z0-9._-]+@[a-z0-9.-]+$/.test(upiId);
  }

  function buildUpiUri(upiId, amount) {
    const effectiveUpi = sanitizeUpiId(upiId) || DEFAULT_SETTINGS.upiId;
    const amountString = formatAmountForUpi(amount);
    return `upi://pay?pa=${effectiveUpi}&pn=Bill&am=${amountString}`;
  }

  function buildQrUrl(upiId, amount, size = 220) {
    const uri = buildUpiUri(upiId, amount);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
      uri,
    )}`;
  }

  function updateSettingsPreview() {
    if (!settingsQrPreview) {
      return;
    }
    const candidateUpi = sanitizeUpiId(upiIdInput?.value?.trim() ?? '');
    const previewUpi =
      candidateUpi || state.settings.upiId || DEFAULT_SETTINGS.upiId;
    settingsQrPreview.src = buildQrUrl(previewUpi, 0, 180);
  }

  function handleSettingsSubmit(event) {
    event.preventDefault();
    if (!isAdmin()) {
      alert('Only admin users can update settings.');
      return;
    }
    if (!upiIdInput) {
      return;
    }
    const rawValue = upiIdInput.value.trim();
    const sanitizedValue = sanitizeUpiId(rawValue);
    if (!sanitizedValue || !isValidUpiId(sanitizedValue)) {
      alert('Please enter a valid UPI ID (e.g. shopname@bank).');
      return;
    }
    const shopName = shopNameInput?.value?.trim() || DEFAULT_SETTINGS.shopName;
    const shopTagline = shopTaglineInput?.value?.trim() ?? '';
    const shopAddress = shopAddressInput?.value?.trim() ?? '';
    const shopContact = shopContactInput?.value?.trim() ?? '';
    const billSeriesValue = parseInt(billSeriesInput?.value ?? '1', 10);
    const gstEnabled = gstToggle ? gstToggle.checked : true;

    state.settings = {
      ...state.settings,
      shopName,
      shopTagline,
      shopAddress,
      shopContact,
      upiId: sanitizedValue,
      gstEnabled,
      billSeries: Number.isNaN(billSeriesValue) || billSeriesValue < 1 ? 1 : billSeriesValue,
    };
    setStoredData(STORAGE_KEYS.settings, state.settings);
    applySettingsToUi();
    updateSettingsPreview();
    refreshPaymentUi();
    renderCart();
    alert('Settings updated successfully.');
  }

  function refreshPaymentUi() {
    const upiId = state.settings.upiId || DEFAULT_SETTINGS.upiId;
    const amount = state.lastTotals.total ?? 0;
    if (upiIdInput && document.activeElement !== upiIdInput) {
      upiIdInput.value = upiId;
    }
    if (settingsQrPreview && document.activeElement !== upiIdInput) {
      settingsQrPreview.src = buildQrUrl(upiId, 0, 180);
    }
    if (payModalUpi) {
      payModalUpi.textContent = upiId;
    }
    if (payModalLink) {
      const uri = buildUpiUri(upiId, amount);
      payModalLink.textContent = uri;
      payModalLink.href = uri;
    }
    if (payQrImage) {
      payQrImage.src = buildQrUrl(upiId, amount);
    }
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) {
      return '';
    }
    return value
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  function generateBillNumber(timestamp = new Date(), series = 1) {
    const pad = (value, length = 2) => value.toString().padStart(length, '0');
    const year = timestamp.getFullYear();
    const month = pad(timestamp.getMonth() + 1);
    const day = pad(timestamp.getDate());
    const hours = pad(timestamp.getHours());
    const minutes = pad(timestamp.getMinutes());
    const seconds = pad(timestamp.getSeconds());
    const seriesPart = pad(series, 4);
    return `BILL${year}${month}${day}${hours}${minutes}${seconds}-${seriesPart}`;
  }

  function sanitizeFilename(name, fallback = 'invoice') {
    const safe = (name || fallback).toString().trim();
    return safe.replace(/[^a-z0-9-_\.]+/gi, '_') || fallback;
  }

  function buildInvoiceLineItem({
    product,
    quantity,
    gstRate,
    gstEnabledOverride,
  }) {
    if (!quantity || quantity <= 0) {
      return null;
    }
    const unitPrice = product?.price ?? 0;
    const sanitizedRate = sanitizeGstRate(gstRate);
    const brand = typeof product?.brand === 'string' ? product.brand.trim() : '';
    const gstEnabled =
      typeof gstEnabledOverride === 'boolean'
        ? gstEnabledOverride
        : isGstEnabled();
    const appliedRate = gstEnabled ? sanitizedRate : 0;
    const lineSubtotal = unitPrice * quantity;
    const gstAmount = lineSubtotal * (appliedRate / 100);

    return {
      id: product?.id ?? null,
      name: product?.name ?? 'Unknown Item',
      brand,
      quantity,
      price: unitPrice,
      gstRate: appliedRate,
      lineSubtotal: roundCurrency(lineSubtotal),
      gstAmount: roundCurrency(gstAmount),
      lineTotal: roundCurrency(lineSubtotal + gstAmount),
    };
  }

  function calculateTotalsFromLineItems(lineItems) {
    const sums = lineItems.reduce(
      (acc, item) => {
        acc.subtotal += item.lineSubtotal ?? item.price * item.quantity;
        acc.tax += item.gstAmount ?? 0;
        acc.total += item.lineTotal ?? item.lineSubtotal + (item.gstAmount ?? 0);
        return acc;
      },
      { subtotal: 0, tax: 0, total: 0 },
    );
    return {
      subtotal: roundCurrency(sums.subtotal),
      tax: roundCurrency(sums.tax),
      total: roundCurrency(sums.total),
    };
  }

  function buildInvoiceModel({
    lineItems,
    totals,
    timestamp = new Date(),
    billNumber = null,
    customer = null,
    gstEnabledOverride,
  }) {
    const gstEnabled =
      typeof gstEnabledOverride === 'boolean'
        ? gstEnabledOverride
        : isGstEnabled();
    const {
      shopName,
      shopTagline,
      shopAddress,
      shopContact,
    } = state.settings;

    return {
      shopName: shopName || DEFAULT_SETTINGS.shopName,
      shopTagline: shopTagline || '',
      shopAddress: shopAddress || '',
      shopContact: shopContact || '',
      gstEnabled,
      items: lineItems,
      totals,
      timestamp,
      billNumber,
      customer,
    };
  }

  function buildInvoiceFragments(model) {
    const {
      shopName,
      shopTagline,
      shopAddress,
      shopContact,
      gstEnabled,
      items,
      totals,
      timestamp,
      billNumber,
      customer,
    } = model;

    const dateString = new Date(timestamp).toLocaleString();
    const addressHtml = shopAddress
      ? escapeHtml(shopAddress).replace(/\n/g, '<br />')
      : '';
    const contactHtml = escapeHtml(shopContact || '');
    const taglineHtml = escapeHtml(shopTagline || '');
    const billHtml = billNumber ? escapeHtml(billNumber) : '';
    const customerName = escapeHtml(customer?.name || 'Walk-in Customer');
    const customerPhone = escapeHtml(customer?.phone || 'N/A');
    const customerHtml = `
      <div class="invoice-meta-row"><span class="label">Customer:</span><span>${customerName}</span></div>
      <div class="invoice-meta-row"><span class="label">Phone:</span><span>${customerPhone}</span></div>
    `;

    const tableHeader = gstEnabled
      ? `<tr>
            <th>Item</th>
            <th class="text-end">Qty</th>
            <th class="text-end">Rate (₹)</th>
            <th class="text-center">GST %</th>
            <th class="text-end">Line Total (₹)</th>
         </tr>`
      : `<tr>
            <th>Item</th>
            <th class="text-end">Qty</th>
            <th class="text-end">Rate (₹)</th>
            <th class="text-end">Line Total (₹)</th>
         </tr>`;

    const lineRows =
      items && items.length
        ? items
            .map((item) => {
              const baseName = escapeHtml(item.name ?? 'Item');
              const brandLabel = item.brand ? escapeHtml(item.brand) : '';
              const name = brandLabel ? `${brandLabel} – ${baseName}` : baseName;
              const qty = item.quantity ?? 0;
              const price = (item.price ?? 0).toFixed(2);
              const lineTotal = (item.lineTotal ?? 0).toFixed(2);
              if (gstEnabled) {
                const gstRateDisplay = formatGstRateLabel(item.gstRate ?? 0);
                const base = (item.lineSubtotal ?? 0).toFixed(2);
                const gstAmount = (item.gstAmount ?? 0).toFixed(2);
                return `<tr>
                  <td>${name}</td>
                  <td class="text-end">${qty}</td>
                  <td class="text-end">${price}</td>
                  <td class="text-center">${gstRateDisplay}%</td>
                  <td class="text-end">${lineTotal}</td>
                </tr>
                <tr>
                  <td colspan="4" class="small-text text-end">
                    Base: ₹${base} | GST: ₹${gstAmount}
                  </td>
                  <td></td>
                </tr>`;
              }
              return `<tr>
                <td>${name}</td>
                <td class="text-end">${qty}</td>
                <td class="text-end">${price}</td>
                <td class="text-end">${lineTotal}</td>
              </tr>`;
            })
            .join('')
        : `<tr><td colspan="${gstEnabled ? 5 : 4}" class="text-center text-muted">No items</td></tr>`;

    const subtotalLabel = gstEnabled ? 'Subtotal (ex GST)' : 'Subtotal';
    const subtotalFormatted = formatCurrency(totals.subtotal);
    const taxFormatted = formatCurrency(totals.tax);
    const totalFormatted = formatCurrency(totals.total);
    const summaryRows = [
      `<div class="summary-row"><span>${subtotalLabel}</span><span>${subtotalFormatted}</span></div>`,
      gstEnabled
        ? `<div class="summary-row"><span>GST Total</span><span>${taxFormatted}</span></div>`
        : '',
      `<div class="summary-row summary-row-total"><span>Grand Total</span><span>${totalFormatted}</span></div>`,
    ]
      .filter(Boolean)
      .join('');

    const tableFooter = `
      <tfoot>
        <tr class="subtotal-row">
          <td colspan="${gstEnabled ? 4 : 3}" class="text-end">${subtotalLabel}</td>
          <td class="text-end">${subtotalFormatted}</td>
        </tr>
        ${
          gstEnabled
            ? `<tr class="subtotal-row">
                 <td colspan="4" class="text-end">GST Total</td>
                 <td class="text-end">${taxFormatted}</td>
               </tr>`
            : ''
        }
        <tr class="subtotal-row grand-total-row">
          <td colspan="${gstEnabled ? 4 : 3}" class="text-end">Grand Total</td>
          <td class="text-end">${totalFormatted}</td>
        </tr>
      </tfoot>
    `;

    const styles = `
      html, body { background-color: #ffffff !important; color: #111111 !important; margin: 0; padding: 0; }
      body { margin: 0 !important; padding: 0 !important; }
      .invoice-wrapper { font-family: Arial, sans-serif; color: #111111; background-color: #fff; padding: 12px 22px 22px; }
      .invoice-header { text-align: center; margin-bottom: 10px; }
      .invoice-header h1 { margin-bottom: 4px; font-size: 24px; }
      .invoice-meta { margin-bottom: 12px; font-size: 13px; }
      .invoice-meta-row { display: flex; justify-content: space-between; margin-bottom: 4px; gap: 12px; }
      .invoice-meta-row .label { font-weight: 600; color: #555; }
      .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
      .invoice-table th, .invoice-table td { border: 1px solid #ccc; padding: 8px; }
      .invoice-table th { background-color: #f6f7fb; }
      .invoice-table tfoot td { font-weight: 600; background-color: #f1f2f9; }
      .invoice-table tfoot .grand-total-row td { background-color: #1f6feb; color: #fff; }
      .text-end { text-align: right; }
      .text-center { text-align: center; }
      .small-text { font-size: 12px; color: #666; }
      .text-muted { color: #777; }
      .invoice-summary { border: 1px solid #d4d4d4; border-radius: 8px; overflow: hidden; }
      .invoice-summary .summary-row { display: flex; justify-content: space-between; padding: 10px 14px; background-color: #f9fafc; font-size: 13px; }
      .invoice-summary .summary-row:nth-child(odd) { background-color: #ffffff; }
      .invoice-summary .summary-row span:last-child { font-weight: 600; }
      .invoice-summary .summary-row-total { background: linear-gradient(135deg, #1f6feb, #274bdb); color: #fff; font-size: 15px; }
      .invoice-summary .summary-row-total span:last-child { font-weight: 700; }
      .invoice-footer { font-size: 12px; color: #666; text-align: center; margin-top: 12px; }
    `;

    const content = `
      <div class="invoice-wrapper">
        <div class="invoice-header">
          <h1>${escapeHtml(shopName || DEFAULT_SETTINGS.shopName)}</h1>
          ${taglineHtml ? `<div class="small-text">${taglineHtml}</div>` : ''}
          ${addressHtml ? `<div class="small-text text-muted">${addressHtml}</div>` : ''}
          ${contactHtml ? `<div class="small-text">${contactHtml}</div>` : ''}
        </div>
        <div class="invoice-meta">
          ${billHtml ? `<div class="invoice-meta-row"><span class="label">Bill No:</span><span>${billHtml}</span></div>` : ''}
          <div class="invoice-meta-row"><span class="label">Date:</span><span>${escapeHtml(dateString)}</span></div>
          ${customerHtml}
        </div>
        <table class="invoice-table">
          <thead>${tableHeader}</thead>
          <tbody>${lineRows}</tbody>
          ${tableFooter}
        </table>
        <div class="invoice-summary">${summaryRows}</div>
        <div class="invoice-footer">Thank you for shopping with us!</div>
      </div>
    `;

    return { styles, content };
  }

  function renderInvoiceHtml(model, { wrapWithDocument = true } = {}) {
    const fragments = buildInvoiceFragments(model);
    if (wrapWithDocument) {
      return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Invoice - ${escapeHtml(
        model.shopName || DEFAULT_SETTINGS.shopName,
      )}</title><style>@page { margin: 6mm 10mm 14mm 10mm; }</style><style>${fragments.styles}</style></head><body style="background:#ffffff;color:#111111;margin:0;">${fragments.content}</body></html>`;
    }
    return `<style>${fragments.styles}</style>${fragments.content}`;
  }

  function printInvoice(invoiceModel) {
    const filenameBase = sanitizeFilename(
      invoiceModel.billNumber || generateBillNumber(new Date(), state.settings.billSeries ?? 1),
      'invoice',
    );
    const filename = `${filenameBase}.pdf`;

    const html2pdfLib =
      typeof window.html2pdf === 'function'
        ? window.html2pdf
        : typeof window.html2pdf?.default === 'function'
        ? window.html2pdf.default
        : null;

    if (typeof html2pdfLib === 'function') {
      const container = document.createElement('div');
      container.className = 'invoice-export-container';
      container.style.position = 'fixed';
      container.style.left = '0';
      container.style.top = '0';
      container.style.width = '100%';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      container.innerHTML = renderInvoiceHtml(invoiceModel, { wrapWithDocument: false });
      document.body.appendChild(container);
      const target = container.querySelector('.invoice-wrapper') || container;
      container.style.backgroundColor = '#ffffff';
      container.style.color = '#111111';

      html2pdfLib()
        .set({
          margin: [4, 10, 14, 10],
          filename,
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(target)
        .save()
        .finally(() => {
          document.body.removeChild(container);
        });
      return;
    }

    const invoiceWindow = window.open('', 'PRINT', 'height=700,width=900');
    if (!invoiceWindow) {
      alert('Enable pop-ups to print the bill.');
      return;
    }

    const htmlDocument = renderInvoiceHtml(invoiceModel, { wrapWithDocument: true });
    invoiceWindow.document.write(htmlDocument);
    invoiceWindow.document.close();

    const handlePrint = () => {
      try {
        invoiceWindow.focus();
        invoiceWindow.print();
      } catch (error) {
        console.warn('Unable to trigger print automatically', error);
      }
    };

    invoiceWindow.onafterprint = () => {
      try {
        invoiceWindow.close();
      } catch (error) {
        console.warn('Unable to close invoice window after print', error);
      }
    };

    if (invoiceWindow.document.readyState === 'complete') {
      handlePrint();
    } else {
      invoiceWindow.onload = handlePrint;
    }

    setTimeout(() => {
      try {
        invoiceWindow.close();
      } catch (error) {
        console.warn('Unable to close invoice window', error);
      }
    }, 3000);
  }

  function printBill() {
    refreshCustomerStateFromInputs();
    if (!state.cart.length) {
      alert('Cart is empty.');
      return;
    }

    const gstEnabled = isGstEnabled();
    const lineItems = state.cart
      .map((cartItem) => {
        const product = state.items.find((it) => it.id === cartItem.itemId);
        const baseGstRate =
          typeof cartItem.gstRate === 'number'
            ? cartItem.gstRate
            : product?.gstRate ?? 0;
        return buildInvoiceLineItem({
          product,
          quantity: cartItem.quantity,
          gstRate: baseGstRate,
          gstEnabledOverride: gstEnabled,
        });
      })
      .filter(Boolean);

    if (!lineItems.length) {
      alert('No valid items to print.');
      return;
    }

    const totals = calculateTotalsFromLineItems(lineItems);
    const previewBill = generateBillNumber(
      new Date(),
      state.settings.billSeries ?? DEFAULT_SETTINGS.billSeries,
    );
    const invoiceModel = buildInvoiceModel({
      lineItems,
      totals,
      timestamp: new Date(),
      billNumber: previewBill,
      customer: getCustomerSnapshot(),
      gstEnabledOverride: gstEnabled,
    });

    printInvoice(invoiceModel);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

