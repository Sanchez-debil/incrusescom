/**
 * cabinet.js — Star Bank Ukraine Personal Cabinet
 * Handles: session guard, user data, section navigation,
 * transactions, payments, transfers, deposits, settings, modals, toasts.
 */

/* ===== UTILITIES ===== */

/** Format Ukrainian hryvnia: 12 450,00 ₴ */
function formatUAH(amount) {
  return amount.toLocaleString('uk-UA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' ₴';
}

/** Format date in Ukrainian */
function formatDateUA(dateStr) {
  const months = [
    'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
    'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'
  ];
  const d = new Date(dateStr);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Get current date in Ukrainian format */
function getTodayUA() {
  const days = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота'];
  const months = [
    'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
    'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'
  ];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

/** Get greeting based on time */
function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Доброго ранку';
  if (h >= 12 && h < 18) return 'Доброго дня';
  if (h >= 18 && h < 22) return 'Доброго вечора';
  return 'Доброї ночі';
}

/** Get user from localStorage */
function getUser() {
  try { return JSON.parse(localStorage.getItem('sb_user')) || null; }
  catch { return null; }
}

/** Save user to localStorage */
function saveUser(data) {
  localStorage.setItem('sb_user', JSON.stringify(data));
}

/** Check session */
function hasSession() {
  return localStorage.getItem('sb_session') === 'true';
}

/** Clear session */
function clearSession() {
  localStorage.removeItem('sb_session');
}

/** Get initials from name */
function getInitials(firstName, lastName) {
  return ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase() || 'КС';
}

/* ===== TOAST ===== */
function showToast(message, type = 'default', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.textContent = icon + ' ' + message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 320);
  }, duration);
}

/* ===== MODAL ===== */
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}
function closeAllModals() {
  document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
}

/* ===== FAKE TRANSACTIONS ===== */
const TRANSACTIONS = [
  { id: 1, icon: '💰', merchant: 'Зарплата', date: 'сьогодні 09:12', amount: 25000, type: 'income', category: 'income' },
  { id: 2, icon: '🛒', merchant: 'Сільпо', date: 'вчора 18:45', amount: -342.5, type: 'expense', category: 'shopping' },
  { id: 3, icon: '📱', merchant: 'lifecell', date: 'вчора 15:20', amount: -100, type: 'expense', category: 'telecom' },
  { id: 4, icon: '🏧', merchant: 'Зняття готівки ATB', date: '3 дні тому', amount: -500, type: 'expense', category: 'cash' },
  { id: 5, icon: '🔄', merchant: 'Переказ від Іваненко О.В.', date: '4 дні тому', amount: 1500, type: 'income', category: 'transfer' },
  { id: 6, icon: '🍕', merchant: "Domino's Pizza", date: '5 днів тому', amount: -285, type: 'expense', category: 'food' },
  { id: 7, icon: '⛽', merchant: 'ОККО АЗС', date: '6 днів тому', amount: -1200, type: 'expense', category: 'transport' },
  { id: 8, icon: '💡', merchant: 'Київенерго', date: '7 днів тому', amount: -487.3, type: 'expense', category: 'utilities' },
  { id: 9, icon: '🎬', merchant: 'Netflix', date: '8 днів тому', amount: -199, type: 'expense', category: 'entertainment' },
  { id: 10, icon: '💊', merchant: 'Аптека АНЦ', date: '10 днів тому', amount: -156.5, type: 'expense', category: 'health' },
];

/* ===== RENDER TRANSACTIONS ===== */
function renderTransactions(containerEl, transactions) {
  containerEl.innerHTML = '';
  transactions.forEach(tx => {
    const item = document.createElement('div');
    item.className = 'transaction-item';
    const isIncome = tx.amount > 0;
    const amtStr = (isIncome ? '+' : '') + formatUAH(Math.abs(tx.amount));
    item.innerHTML = `
      <div class="transaction-icon">${tx.icon}</div>
      <div class="transaction-info">
        <div class="transaction-merchant">${tx.merchant}</div>
        <div class="transaction-date">${tx.date}</div>
      </div>
      <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">${amtStr}</div>
    `;
    containerEl.appendChild(item);
  });
}

/* ===== SECTION NAVIGATION ===== */
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-section]');
  const mobileNavItems = document.querySelectorAll('.mobile-nav-item[data-section]');

  function activateSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.cabinet-section').forEach(s => s.classList.remove('active'));
    // Show target
    const target = document.getElementById('section-' + sectionId);
    if (target) target.classList.add('active');

    // Update nav items
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.section === sectionId);
    });
    mobileNavItems.forEach(item => {
      item.classList.toggle('active', item.dataset.section === sectionId);
    });

    // Update topbar title
    const titles = {
      home: 'Головна',
      cards: 'Мої картки',
      payments: 'Платежі',
      transfers: 'Перекази',
      deposits: 'Вклади',
      settings: 'Налаштування'
    };
    const topbarTitle = document.getElementById('topbar-title');
    if (topbarTitle) topbarTitle.textContent = titles[sectionId] || 'Кабінет';

    // Close mobile sidebar
    closeMobileSidebar();
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => activateSection(item.dataset.section));
  });
  mobileNavItems.forEach(item => {
    item.addEventListener('click', () => activateSection(item.dataset.section));
  });
}

/* ===== SIDEBAR MOBILE ===== */
function initMobileSidebar() {
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', closeMobileSidebar);
  }
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

/* ===== POPULATE USER DATA ===== */
function populateUserData(user) {
  if (!user) return;

  const initials = getInitials(user.firstName, user.lastName);
  const fullName = [user.lastName, user.firstName, user.patronymic].filter(Boolean).join(' ');

  // All initials circles
  document.querySelectorAll('[data-user-initials]').forEach(el => el.textContent = initials);
  // All full name fields
  document.querySelectorAll('[data-user-fullname]').forEach(el => el.textContent = fullName);
  // Phone
  document.querySelectorAll('[data-user-phone]').forEach(el => el.textContent = user.phone || '');
  // First name
  document.querySelectorAll('[data-user-firstname]').forEach(el => el.textContent = user.firstName || '');
  // Email
  document.querySelectorAll('[data-user-email]').foreach?.(el => el.textContent = user.email || '');

  // Greeting
  const greetingEl = document.getElementById('greeting-text');
  if (greetingEl) greetingEl.textContent = `${getGreeting()}, ${user.firstName}! 👋`;

  // Date
  const dateEl = document.getElementById('greeting-date');
  if (dateEl) dateEl.textContent = getTodayUA();

  // Verification banner
  const banner = document.getElementById('verify-banner');
  if (banner) {
    banner.style.display = user.isVerified ? 'none' : 'flex';
  }

  // Settings form pre-fill
  const settLastname = document.getElementById('sett-lastname');
  const settFirstname = document.getElementById('sett-firstname');
  const settPatronymic = document.getElementById('sett-patronymic');
  const settDob = document.getElementById('sett-dob');
  const settEmail = document.getElementById('sett-email');
  const settPhone = document.getElementById('sett-phone');
  if (settLastname) settLastname.value = user.lastName || '';
  if (settFirstname) settFirstname.value = user.firstName || '';
  if (settPatronymic) settPatronymic.value = user.patronymic || '';
  if (settDob) settDob.value = user.dob || '';
  if (settEmail) settEmail.value = user.email || '';
  if (settPhone) settPhone.value = user.phone || '';

  // Virtual card last 4 digits (based on phone)
  const phone = user.phone || '';
  const last4 = phone.replace(/\D/g, '').slice(-4) || '8891';
  document.querySelectorAll('[data-card-last4]').forEach(el => el.textContent = last4);
  document.querySelectorAll('[data-card-holder]').forEach(el => {
    const holder = ((user.lastName || '') + ' ' + (user.firstName || '')).trim().toUpperCase();
    el.textContent = holder || 'ІВАНЕНКО ОЛЕКСІЙ';
  });

  // Profile initials in settings
  const settInitials = document.getElementById('settings-initials');
  if (settInitials) settInitials.textContent = initials;
}

/* ===== QUICK ACTIONS ===== */
function initQuickActions() {
  const actions = {
    'qa-deposit': showDepositModal,
    'qa-transfer': showTransferModal,
    'qa-pay': showPayModal,
    'qa-convert': showConvertModal,
    'qa-statement': showStatementModal,
    'qa-more': showMoreModal
  };

  Object.entries(actions).forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  });
}

function showDepositModal() {
  const m = document.getElementById('modal-deposit');
  if (m) m.classList.add('open');
}

function showTransferModal() {
  const m = document.getElementById('modal-transfer');
  if (m) m.classList.add('open');
}

function showPayModal() {
  // Switch to payments section
  document.querySelectorAll('.cabinet-section').forEach(s => s.classList.remove('active'));
  const s = document.getElementById('section-payments');
  if (s) s.classList.add('active');
  document.querySelectorAll('.nav-item[data-section]').forEach(item => {
    item.classList.toggle('active', item.dataset.section === 'payments');
  });
  const topbarTitle = document.getElementById('topbar-title');
  if (topbarTitle) topbarTitle.textContent = 'Платежі';
}

function showConvertModal() {
  const m = document.getElementById('modal-convert');
  if (m) m.classList.add('open');
}

function showStatementModal() {
  const m = document.getElementById('modal-statement');
  if (m) m.classList.add('open');
}

function showMoreModal() {
  showToast('Більше функцій скоро з\'являться!', 'default');
}

/* ===== PAYMENTS ===== */
function initPayments() {
  const categories = document.querySelectorAll('.payment-category');
  const formWrap = document.getElementById('payment-form-wrap');
  const formTitle = document.getElementById('payment-form-category');

  categories.forEach(cat => {
    cat.addEventListener('click', () => {
      categories.forEach(c => c.classList.remove('active'));
      cat.classList.add('active');
      if (formWrap) formWrap.classList.add('visible');
      if (formTitle) formTitle.textContent = cat.querySelector('.payment-category__name')?.textContent || 'Оплата';
    });
  });

  const payForm = document.getElementById('payment-form');
  if (payForm) {
    payForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = document.getElementById('pay-amount')?.value;
      if (!amount || parseFloat(amount) <= 0) {
        showToast('Введіть суму оплати', 'error');
        return;
      }
      closeAllModals();
      if (formWrap) formWrap.classList.remove('visible');
      categories.forEach(c => c.classList.remove('active'));
      payForm.reset();
      showToast(`Оплату ${parseFloat(amount).toFixed(2)} ₴ успішно проведено!`, 'success');
    });
  }
}

/* ===== TRANSFERS ===== */
function initTransfers() {
  const tabs = document.querySelectorAll('.transfer-tab');
  const panels = document.querySelectorAll('.transfer-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById('transfer-panel-' + tab.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });

  // Phone transfer
  const phoneTransferForm = document.getElementById('phone-transfer-form');
  if (phoneTransferForm) {
    // Apply phone mask
    const phoneInput = document.getElementById('transfer-phone');
    if (phoneInput) {
      phoneInput.addEventListener('input', () => {
        let v = phoneInput.value.replace(/\D/g, '');
        if (v.startsWith('380')) v = v.slice(3);
        else if (v.startsWith('0')) v = v.slice(1);
        v = v.slice(0, 9);
        let f = '+380';
        if (v.length > 0) f += ' (0' + v.slice(0, 2);
        if (v.length >= 2) f += ') ' + v.slice(2, 5);
        if (v.length >= 5) f += '-' + v.slice(5, 7);
        if (v.length >= 7) f += '-' + v.slice(7, 9);
        phoneInput.value = f;
      });
    }

    phoneTransferForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('transfer-phone-amount')?.value || 0);
      if (amount <= 0) { showToast('Введіть суму переказу', 'error'); return; }
      if (amount > 12450) { showToast('Недостатньо коштів на рахунку', 'error'); return; }
      phoneTransferForm.reset();
      showToast(`Переказ ${formatUAH(amount)} успішно відправлено!`, 'success');
    });
  }

  // IBAN transfer
  const ibanTransferForm = document.getElementById('iban-transfer-form');
  if (ibanTransferForm) {
    const ibanInput = document.getElementById('transfer-iban');
    if (ibanInput) {
      ibanInput.addEventListener('input', () => {
        let v = ibanInput.value.replace(/\s/g, '').toUpperCase();
        if (v.length > 29) v = v.slice(0, 29);
        // Format as groups
        ibanInput.value = v;
      });
    }

    ibanTransferForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('transfer-iban-amount')?.value || 0);
      const iban = document.getElementById('transfer-iban')?.value.trim();
      if (!iban || iban.length < 10) { showToast('Введіть коректний IBAN', 'error'); return; }
      if (amount <= 0) { showToast('Введіть суму переказу', 'error'); return; }
      if (amount > 12450) { showToast('Недостатньо коштів на рахунку', 'error'); return; }
      ibanTransferForm.reset();
      showToast(`Переказ ${formatUAH(amount)} успішно відправлено!`, 'success');
    });
  }
}

/* ===== DEPOSIT PRODUCTS ===== */
function initDeposits() {
  document.querySelectorAll('.open-deposit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const product = btn.dataset.product || 'Зоряний';
      showToast(`Відкриття вкладу «${product}»: наш менеджер зв'яжеться з вами`, 'success');
    });
  });

  const topupBtn = document.getElementById('deposit-topup-btn');
  if (topupBtn) {
    topupBtn.addEventListener('click', () => {
      const m = document.getElementById('modal-deposit-topup');
      if (m) m.classList.add('open');
    });
  }

  const detailsBtn = document.getElementById('deposit-details-btn');
  if (detailsBtn) {
    detailsBtn.addEventListener('click', () => showToast('Деталі вкладу: підготовка виписки...', 'default'));
  }
}

/* ===== SETTINGS ===== */
function initSettings() {
  const settingsForm = document.getElementById('settings-profile-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = getUser();
      if (!user) return;
      user.lastName = document.getElementById('sett-lastname')?.value || user.lastName;
      user.firstName = document.getElementById('sett-firstname')?.value || user.firstName;
      user.patronymic = document.getElementById('sett-patronymic')?.value || user.patronymic;
      user.dob = document.getElementById('sett-dob')?.value || user.dob;
      saveUser(user);
      populateUserData(user);
      showToast('Дані профілю збережено!', 'success');
    });
  }

  const pwdForm = document.getElementById('settings-password-form');
  if (pwdForm) {
    pwdForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = getUser();
      const oldPwd = document.getElementById('sett-old-pwd')?.value;
      const newPwd = document.getElementById('sett-new-pwd')?.value;
      const confirmPwd = document.getElementById('sett-confirm-pwd')?.value;

      if (!user || oldPwd !== user.password) {
        showToast('Невірний поточний пароль', 'error'); return;
      }
      if (!newPwd || newPwd.length < 8) {
        showToast('Новий пароль повинен містити щонайменше 8 символів', 'error'); return;
      }
      if (newPwd !== confirmPwd) {
        showToast('Паролі не збігаються', 'error'); return;
      }

      user.password = newPwd;
      saveUser(user);
      pwdForm.reset();
      showToast('Пароль успішно змінено!', 'success');
    });
  }

  // Password visibility toggles in settings
  document.querySelectorAll('[data-toggle-password]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.togglePassword;
      const input = document.getElementById(targetId);
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
        btn.textContent = input.type === 'password' ? '👁' : '🙈';
      }
    });
  });

  // Notification toggles (just cosmetic — save state)
  document.querySelectorAll('.toggle-switch input[type="checkbox"]').forEach(toggle => {
    toggle.addEventListener('change', () => {
      const label = toggle.closest('.toggle-item')?.querySelector('.toggle-item__name')?.textContent;
      showToast(`${label}: ${toggle.checked ? 'увімкнено' : 'вимкнено'}`, 'success');
    });
  });

  // Delete account
  const deleteBtn = document.getElementById('delete-account-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      const confirmed = confirm(
        'Ви впевнені, що хочете видалити акаунт?\n\n' +
        'Ця дія є незворотною. Всі ваші дані будуть видалені.'
      );
      if (confirmed) {
        localStorage.removeItem('sb_user');
        localStorage.removeItem('sb_session');
        window.location.href = 'index.html';
      }
    });
  }
}

/* ===== LOGOUT ===== */
function initLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearSession();
      window.location.href = 'login.html';
    });
  }
}

/* ===== CARD ACTIONS ===== */
function initCardActions() {
  const blockBtn = document.getElementById('card-block-btn');
  const reissueBtn = document.getElementById('card-reissue-btn');
  const settBtn = document.getElementById('card-settings-btn');
  const reqBtn = document.getElementById('card-requisites-btn');
  const copyIban = document.getElementById('copy-iban-btn');
  const orderCard = document.getElementById('order-new-card-btn');

  if (blockBtn) blockBtn.addEventListener('click', () =>
    showToast('Тимчасове блокування картки застосовано', 'success'));
  if (reissueBtn) reissueBtn.addEventListener('click', () =>
    showToast('Заявку на перевипуск картки надіслано', 'success'));
  if (settBtn) settBtn.addEventListener('click', () =>
    showToast('Налаштування картки: функція в розробці', 'default'));
  if (reqBtn) reqBtn.addEventListener('click', () => {
    const m = document.getElementById('modal-requisites');
    if (m) m.classList.add('open');
  });
  if (copyIban) {
    copyIban.addEventListener('click', () => {
      navigator.clipboard?.writeText('UA21322313000026001000000001')
        .then(() => showToast('IBAN скопійовано!', 'success'))
        .catch(() => showToast('IBAN: UA21 3223 1300 0002 6001 0000 0001', 'default'));
    });
  }
  if (orderCard) {
    orderCard.addEventListener('click', () =>
      showToast('Заявку на нову картку буде оброблено протягом 3 робочих днів', 'success'));
  }
}

/* ===== QUICK ACTION MODALS FORMS ===== */
function initModalForms() {
  // Deposit form
  const depositForm = document.getElementById('modal-deposit-form');
  if (depositForm) {
    depositForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('modal-deposit-amount')?.value || 0);
      if (amount <= 0) { showToast('Введіть суму', 'error'); return; }
      closeAllModals();
      depositForm.reset();
      showToast(`Поповнення ${formatUAH(amount)} успішно оброблено!`, 'success');
    });
  }

  // Transfer modal form
  const transferModalForm = document.getElementById('modal-transfer-form');
  if (transferModalForm) {
    transferModalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('modal-transfer-amount')?.value || 0);
      if (amount <= 0) { showToast('Введіть суму', 'error'); return; }
      if (amount > 12450) { showToast('Недостатньо коштів', 'error'); return; }
      closeAllModals();
      transferModalForm.reset();
      showToast(`Переказ ${formatUAH(amount)} відправлено!`, 'success');
    });
  }

  // Convert modal
  const convertForm = document.getElementById('modal-convert-form');
  if (convertForm) {
    convertForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('modal-convert-amount')?.value || 0);
      if (amount <= 0) { showToast('Введіть суму', 'error'); return; }
      closeAllModals();
      convertForm.reset();
      showToast(`Конвертацію ${formatUAH(amount)} виконано!`, 'success');
    });
  }

  // Deposit top-up
  const depositTopupForm = document.getElementById('deposit-topup-form');
  if (depositTopupForm) {
    depositTopupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('deposit-topup-amount')?.value || 0);
      if (amount <= 0) { showToast('Введіть суму', 'error'); return; }
      closeAllModals();
      depositTopupForm.reset();
      showToast(`Вклад поповнено на ${formatUAH(amount)}!`, 'success');
    });
  }

  // Close modal buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.closeModal;
      if (id) closeModal(id);
      else closeAllModals();
    });
  });

  // Click outside modal
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAllModals();
    });
  });

  // Statement modal close
  const stmtClose = document.getElementById('stmt-close');
  if (stmtClose) stmtClose.addEventListener('click', () => closeModal('modal-statement'));
}

/* ===== NOTIFICATION BELL ===== */
function initNotifications() {
  const bell = document.getElementById('notif-bell');
  const panel = document.getElementById('notif-panel');

  if (bell && panel) {
    bell.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    });
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && e.target !== bell) {
        panel.style.display = 'none';
      }
    });
  }
}

/* ===== IBAN COPY ===== */
function initIBANCopy() {
  document.querySelectorAll('.iban-display[data-copy]').forEach(el => {
    el.addEventListener('click', () => {
      const text = el.dataset.copy || el.textContent.trim();
      navigator.clipboard?.writeText(text.replace(/\s/g, ''))
        .then(() => showToast('IBAN скопійовано!', 'success'))
        .catch(() => showToast('IBAN: ' + text, 'default'));
    });
  });
}

/* ===== PASSWORD STRENGTH IN SETTINGS ===== */
function initPasswordStrength() {
  const newPwdInput = document.getElementById('sett-new-pwd');
  const bar = document.getElementById('sett-strength-bar');
  const label = document.getElementById('sett-strength-label');
  if (!newPwdInput || !bar || !label) return;

  const strengthLabels = ['', 'Слабкий', 'Середній', 'Надійний', 'Дуже надійний'];

  function calcStrength(pwd) {
    if (!pwd) return 0;
    let s = 0;
    if (pwd.length >= 8) s++;
    if (pwd.length >= 12) s++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++;
    if (/\d/.test(pwd)) s++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) s++;
    return Math.min(4, s);
  }

  newPwdInput.addEventListener('input', () => {
    const s = calcStrength(newPwdInput.value);
    const segs = bar.querySelectorAll('.strength-segment');
    segs.forEach((seg, i) => {
      seg.className = 'strength-segment';
      if (i < s) seg.classList.add('active-' + s);
    });
    label.className = 'strength-label' + (s ? ' s' + s : '');
    label.textContent = strengthLabels[s];
  });
}

/* ===== MAIN INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  // Session guard
  if (!hasSession()) {
    window.location.href = 'login.html';
    return;
  }

  const user = getUser();

  // Populate UI
  populateUserData(user);

  // Render transactions
  const txList = document.getElementById('transactions-list');
  if (txList) renderTransactions(txList, TRANSACTIONS.slice(0, 6));

  // Init everything
  initNavigation();
  initMobileSidebar();
  initQuickActions();
  initPayments();
  initTransfers();
  initDeposits();
  initSettings();
  initLogout();
  initCardActions();
  initModalForms();
  initNotifications();
  initIBANCopy();
  initPasswordStrength();

  // Show 'home' section by default
  const homeSection = document.getElementById('section-home');
  if (homeSection) homeSection.classList.add('active');
  const homeNavItem = document.querySelector('.nav-item[data-section="home"]');
  if (homeNavItem) homeNavItem.classList.add('active');
  const mobileHomeItem = document.querySelector('.mobile-nav-item[data-section="home"]');
  if (mobileHomeItem) mobileHomeItem.classList.add('active');
});
