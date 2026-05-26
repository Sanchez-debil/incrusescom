/**
 * auth.js — Star Bank Ukraine
 * Handles: register wizard, login, verify, OTP, phone mask,
 * password strength, localStorage user management, Diia simulation.
 */

/* ===== UTILITIES ===== */

/** Format phone to display: +380 (0XX) XXX-XX-XX */
function formatPhoneUA(digits) {
  let v = digits.replace(/\D/g, '');
  if (v.startsWith('380')) v = v.slice(3);
  else if (v.startsWith('0')) v = v.slice(1);
  v = v.slice(0, 9);
  let f = '+380';
  if (v.length > 0) f += ' (0' + v.slice(0, 2);
  if (v.length >= 2) f += ') ' + v.slice(2, 5);
  if (v.length >= 5) f += '-' + v.slice(5, 7);
  if (v.length >= 7) f += '-' + v.slice(7, 9);
  return f;
}

/** Apply phone mask to input element */
function applyPhoneMask(input) {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') {
      const val = input.value;
      // Prevent deleting prefix +380 (0
      if (val.length <= 8) {
        e.preventDefault();
        return;
      }
    }
  });
  input.addEventListener('input', () => {
    let v = input.value.replace(/\D/g, '');
    if (v.startsWith('380')) v = v.slice(3);
    else if (v.startsWith('80')) v = v.slice(2);
    else if (v.startsWith('0')) v = v.slice(1);
    v = v.slice(0, 9);
    let f = '+380';
    if (v.length > 0) f += ' (0' + v.slice(0, 2);
    if (v.length >= 2) f += ') ' + v.slice(2, 5);
    if (v.length >= 5) f += '-' + v.slice(5, 7);
    if (v.length >= 7) f += '-' + v.slice(7, 9);
    input.value = f;
  });
  input.addEventListener('focus', () => {
    if (!input.value || input.value === '+380') {
      input.value = '+380 (0';
    }
  });
  input.addEventListener('blur', () => {
    if (input.value === '+380 (0') input.value = '';
  });
}

/** Extract raw phone digits: 380XXXXXXXXX */
function getRawPhone(input) {
  return '+380' + input.value.replace(/\D/g, '').slice(-9);
}

/** Calculate password strength 0-4 */
function calcStrength(pwd) {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) score++;
  return Math.min(4, score);
}

const strengthLabels = ['', 'Слабкий', 'Середній', 'Надійний', 'Дуже надійний'];

/** Update strength bar UI */
function updateStrengthBar(pwd, barEl, labelEl) {
  const s = calcStrength(pwd);
  const segs = barEl.querySelectorAll('.strength-segment');
  segs.forEach((seg, i) => {
    seg.className = 'strength-segment';
    if (i < s) seg.classList.add('active-' + s);
  });
  labelEl.className = 'strength-label' + (s ? ' s' + s : '');
  labelEl.textContent = strengthLabels[s];
}

/** Show inline error */
function showError(inputEl, msg) {
  const errEl = inputEl.closest('.form-group')?.querySelector('.form-error');
  inputEl.classList.add('error');
  if (errEl) { errEl.textContent = msg; errEl.classList.add('visible'); }
}

/** Clear inline error */
function clearError(inputEl) {
  const errEl = inputEl.closest('.form-group')?.querySelector('.form-error');
  inputEl.classList.remove('error');
  if (errEl) errEl.classList.remove('visible');
}

/** Validate email */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validate phone (must have 9 digits after +380) */
function isValidPhone(phoneFormatted) {
  const digits = phoneFormatted.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('380');
}

/** Save user to localStorage */
function saveUser(data) {
  localStorage.setItem('sb_user', JSON.stringify(data));
}

/** Get user from localStorage */
function getUser() {
  try { return JSON.parse(localStorage.getItem('sb_user')) || null; }
  catch { return null; }
}

/** Set session */
function setSession() {
  localStorage.setItem('sb_session', 'true');
}

/** Check session */
function hasSession() {
  return localStorage.getItem('sb_session') === 'true';
}

/** Clear session */
function clearSession() {
  localStorage.removeItem('sb_session');
}

/* ===== OTP INPUT LOGIC ===== */
function initOTPInputs(containerEl) {
  const inputs = containerEl.querySelectorAll('.otp-input');
  inputs.forEach((inp, idx) => {
    inp.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val ? val[val.length - 1] : '';
      if (val && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }
      inp.classList.toggle('filled', !!inp.value);
      inp.classList.remove('error');
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !inp.value && idx > 0) {
        inputs[idx - 1].focus();
        inputs[idx - 1].value = '';
        inputs[idx - 1].classList.remove('filled');
      }
      if (e.key === 'ArrowLeft' && idx > 0) inputs[idx - 1].focus();
      if (e.key === 'ArrowRight' && idx < inputs.length - 1) inputs[idx + 1].focus();
    });
    inp.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      text.split('').slice(0, inputs.length - idx).forEach((ch, i) => {
        if (inputs[idx + i]) {
          inputs[idx + i].value = ch;
          inputs[idx + i].classList.add('filled');
          inputs[idx + i].classList.remove('error');
        }
      });
      const next = Math.min(idx + text.length, inputs.length - 1);
      inputs[next].focus();
    });
  });
}

function getOTPValue(containerEl) {
  return Array.from(containerEl.querySelectorAll('.otp-input'))
    .map(i => i.value).join('');
}

function setOTPError(containerEl) {
  containerEl.querySelectorAll('.otp-input').forEach(i => {
    i.classList.add('error');
    i.classList.remove('filled');
    i.value = '';
  });
  containerEl.querySelector('.otp-input').focus();
}

/* ===== OTP COUNTDOWN ===== */
function startOTPCountdown(countdownEl, resendEl, seconds, onResend) {
  let remaining = seconds;
  countdownEl.textContent = remaining + 'с';
  const interval = setInterval(() => {
    remaining--;
    countdownEl.textContent = remaining + 'с';
    if (remaining <= 0) {
      clearInterval(interval);
      countdownEl.textContent = '';
      if (resendEl) resendEl.classList.add('visible');
    }
  }, 1000);
  if (resendEl) {
    resendEl.classList.remove('visible');
    resendEl.onclick = () => {
      resendEl.classList.remove('visible');
      startOTPCountdown(countdownEl, resendEl, seconds, onResend);
      if (onResend) onResend();
    };
  }
  return interval;
}

/* ===== DIIA QR SVG ===== */
function getDiiaQRSVG() {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
    <rect width="100" height="100" fill="white"/>
    <!-- Top-left finder -->
    <rect x="8" y="8" width="22" height="22" fill="#1A1A2E"/>
    <rect x="11" y="11" width="16" height="16" fill="white"/>
    <rect x="14" y="14" width="10" height="10" fill="#1A1A2E"/>
    <!-- Top-right finder -->
    <rect x="70" y="8" width="22" height="22" fill="#1A1A2E"/>
    <rect x="73" y="11" width="16" height="16" fill="white"/>
    <rect x="76" y="14" width="10" height="10" fill="#1A1A2E"/>
    <!-- Bottom-left finder -->
    <rect x="8" y="70" width="22" height="22" fill="#1A1A2E"/>
    <rect x="11" y="73" width="16" height="16" fill="white"/>
    <rect x="14" y="76" width="10" height="10" fill="#1A1A2E"/>
    <!-- Data modules -->
    <rect x="36" y="8" width="4" height="4" fill="#1A1A2E"/>
    <rect x="42" y="8" width="4" height="4" fill="#1A1A2E"/>
    <rect x="50" y="8" width="4" height="4" fill="#1A1A2E"/>
    <rect x="58" y="8" width="4" height="4" fill="#1A1A2E"/>
    <rect x="36" y="14" width="4" height="4" fill="#1A1A2E"/>
    <rect x="50" y="14" width="4" height="4" fill="#1A1A2E"/>
    <rect x="58" y="14" width="4" height="4" fill="#1A1A2E"/>
    <rect x="64" y="14" width="4" height="4" fill="#1A1A2E"/>
    <rect x="42" y="20" width="4" height="4" fill="#1A1A2E"/>
    <rect x="56" y="20" width="4" height="4" fill="#1A1A2E"/>
    <rect x="36" y="26" width="4" height="4" fill="#1A1A2E"/>
    <rect x="44" y="26" width="4" height="4" fill="#1A1A2E"/>
    <rect x="52" y="26" width="4" height="4" fill="#1A1A2E"/>
    <rect x="60" y="26" width="4" height="4" fill="#1A1A2E"/>
    <rect x="8" y="36" width="4" height="4" fill="#1A1A2E"/>
    <rect x="14" y="36" width="4" height="4" fill="#1A1A2E"/>
    <rect x="20" y="36" width="4" height="4" fill="#1A1A2E"/>
    <rect x="28" y="36" width="4" height="4" fill="#1A1A2E"/>
    <rect x="36" y="36" width="4" height="4" fill="#1A1A2E"/>
    <rect x="44" y="36" width="4" height="4" fill="#1A1A2E"/>
    <rect x="52" y="36" width="4" height="4" fill="#1A1A2E"/>
    <rect x="60" y="36" width="4" height="4" fill="#1A1A2E"/>
    <rect x="70" y="36" width="4" height="4" fill="#1A1A2E"/>
    <rect x="78" y="36" width="4" height="4" fill="#1A1A2E"/>
    <rect x="88" y="36" width="4" height="4" fill="#1A1A2E"/>
    <rect x="8" y="42" width="4" height="4" fill="#1A1A2E"/>
    <rect x="16" y="42" width="4" height="4" fill="#1A1A2E"/>
    <rect x="24" y="42" width="4" height="4" fill="#1A1A2E"/>
    <rect x="34" y="42" width="4" height="4" fill="#1A1A2E"/>
    <rect x="46" y="42" width="4" height="4" fill="#1A1A2E"/>
    <rect x="54" y="42" width="4" height="4" fill="#1A1A2E"/>
    <rect x="64" y="42" width="4" height="4" fill="#1A1A2E"/>
    <rect x="72" y="42" width="4" height="4" fill="#1A1A2E"/>
    <rect x="80" y="42" width="4" height="4" fill="#1A1A2E"/>
    <rect x="88" y="42" width="4" height="4" fill="#1A1A2E"/>
    <rect x="8" y="50" width="4" height="4" fill="#1A1A2E"/>
    <rect x="20" y="50" width="4" height="4" fill="#1A1A2E"/>
    <rect x="28" y="50" width="4" height="4" fill="#1A1A2E"/>
    <rect x="40" y="50" width="4" height="4" fill="#1A1A2E"/>
    <rect x="50" y="50" width="4" height="4" fill="#1A1A2E"/>
    <rect x="60" y="50" width="4" height="4" fill="#1A1A2E"/>
    <rect x="70" y="50" width="4" height="4" fill="#1A1A2E"/>
    <rect x="82" y="50" width="4" height="4" fill="#1A1A2E"/>
    <rect x="10" y="58" width="4" height="4" fill="#1A1A2E"/>
    <rect x="18" y="58" width="4" height="4" fill="#1A1A2E"/>
    <rect x="26" y="58" width="4" height="4" fill="#1A1A2E"/>
    <rect x="36" y="58" width="4" height="4" fill="#1A1A2E"/>
    <rect x="46" y="58" width="4" height="4" fill="#1A1A2E"/>
    <rect x="56" y="58" width="4" height="4" fill="#1A1A2E"/>
    <rect x="66" y="58" width="4" height="4" fill="#1A1A2E"/>
    <rect x="76" y="58" width="4" height="4" fill="#1A1A2E"/>
    <rect x="86" y="58" width="4" height="4" fill="#1A1A2E"/>
    <rect x="36" y="70" width="4" height="4" fill="#1A1A2E"/>
    <rect x="44" y="70" width="4" height="4" fill="#1A1A2E"/>
    <rect x="52" y="70" width="4" height="4" fill="#1A1A2E"/>
    <rect x="60" y="70" width="4" height="4" fill="#1A1A2E"/>
    <rect x="68" y="70" width="4" height="4" fill="#1A1A2E"/>
    <rect x="76" y="70" width="4" height="4" fill="#1A1A2E"/>
    <rect x="84" y="70" width="4" height="4" fill="#1A1A2E"/>
    <rect x="36" y="78" width="4" height="4" fill="#1A1A2E"/>
    <rect x="44" y="78" width="4" height="4" fill="#1A1A2E"/>
    <rect x="56" y="78" width="4" height="4" fill="#1A1A2E"/>
    <rect x="64" y="78" width="4" height="4" fill="#1A1A2E"/>
    <rect x="80" y="78" width="4" height="4" fill="#1A1A2E"/>
    <rect x="88" y="78" width="4" height="4" fill="#1A1A2E"/>
    <rect x="36" y="86" width="4" height="4" fill="#1A1A2E"/>
    <rect x="48" y="86" width="4" height="4" fill="#1A1A2E"/>
    <rect x="58" y="86" width="4" height="4" fill="#1A1A2E"/>
    <rect x="68" y="86" width="4" height="4" fill="#1A1A2E"/>
    <rect x="78" y="86" width="4" height="4" fill="#1A1A2E"/>
    <rect x="86" y="86" width="4" height="4" fill="#1A1A2E"/>
    <!-- Diia logo center -->
    <rect x="44" y="44" width="12" height="12" rx="2" fill="#1976D2"/>
    <text x="50" y="53" text-anchor="middle" fill="white" font-size="9" font-weight="bold" font-family="Arial">Д</text>
  </svg>`;
}

/* ===== MASK PHONE ON EXISTING FORMATTED DISPLAY ===== */
function maskPhoneMiddle(phone) {
  const d = phone.replace(/\D/g, '');
  if (d.length < 10) return phone;
  const area = d.slice(3, 5);
  const last2 = d.slice(-2);
  return `+380 ${area[0] === '0' ? '' : '(0'}${area}...**${last2}`;
}

/* ===== LOGIN PAGE ===== */
function initLoginPage() {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  // If already logged in, redirect
  if (hasSession()) {
    window.location.href = 'cabinet.html';
    return;
  }

  const identifierInput = document.getElementById('login-identifier');
  const passwordInput = document.getElementById('login-password');
  const toggleBtn = document.getElementById('toggle-password');
  const alertEl = document.getElementById('login-alert');
  const diiaBtn = document.getElementById('diia-login-btn');
  const diiaModal = document.getElementById('diia-modal');
  const diiaCloseBtn = document.getElementById('diia-modal-close');

  // Toggle password visibility
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.textContent = '🙈';
      } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = '👁';
      }
    });
  }

  // Clear errors on input
  [identifierInput, passwordInput].forEach(inp => {
    if (inp) inp.addEventListener('input', () => {
      clearError(inp);
      if (alertEl) alertEl.style.display = 'none';
    });
  });

  // Form submit
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;

    const identifier = identifierInput.value.trim();
    const password = passwordInput.value;

    if (!identifier) {
      showError(identifierInput, 'Введіть телефон або email');
      valid = false;
    }
    if (!password) {
      showError(passwordInput, 'Введіть пароль');
      valid = false;
    }
    if (!valid) return;

    // Check user in localStorage
    const user = getUser();
    if (!user) {
      if (alertEl) {
        alertEl.textContent = 'Користувача не знайдено. Зареєструйтесь.';
        alertEl.style.display = 'flex';
      }
      return;
    }

    const phoneMatch = identifier.replace(/\D/g, '') === user.phone.replace(/\D/g, '');
    const emailMatch = identifier.toLowerCase() === (user.email || '').toLowerCase();

    if (!phoneMatch && !emailMatch) {
      if (alertEl) {
        alertEl.textContent = 'Телефон або email не знайдено.';
        alertEl.style.display = 'flex';
      }
      return;
    }
    if (password !== user.password) {
      showError(passwordInput, 'Невірний пароль');
      if (alertEl) {
        alertEl.textContent = 'Невірний пароль. Перевірте та спробуйте знову.';
        alertEl.style.display = 'flex';
      }
      return;
    }

    setSession();
    window.location.href = 'cabinet.html';
  });

  // Diia login
  if (diiaBtn && diiaModal) {
    const qrWrap = document.getElementById('diia-qr');
    if (qrWrap) qrWrap.innerHTML = getDiiaQRSVG();

    diiaBtn.addEventListener('click', () => {
      diiaModal.classList.add('open');
      let secs = 298;
      const timerEl = document.getElementById('diia-login-timer');
      const interval = setInterval(() => {
        secs--;
        if (timerEl) {
          const m = Math.floor(secs / 60).toString().padStart(2, '0');
          const s = (secs % 60).toString().padStart(2, '0');
          timerEl.textContent = `${m}:${s}`;
        }
        if (secs <= 0) clearInterval(interval);
      }, 1000);

      // Auto-success simulation after 3s
      setTimeout(() => {
        clearInterval(interval);
        // Check if there is a user, or create a demo one
        if (!getUser()) {
          saveUser({
            firstName: 'Демо',
            lastName: 'Користувач',
            patronymic: '',
            dob: '1990-01-01',
            gender: 'male',
            phone: '+380501234567',
            email: 'demo@starbank.ua',
            password: 'Diia@2024',
            isVerified: true,
            verificationMethod: 'diia',
            createdAt: new Date().toISOString()
          });
        } else {
          const u = getUser();
          u.isVerified = true;
          u.verificationMethod = 'diia';
          saveUser(u);
        }
        setSession();
        window.location.href = 'cabinet.html';
      }, 3000);
    });

    if (diiaCloseBtn) {
      diiaCloseBtn.addEventListener('click', () => {
        diiaModal.classList.remove('open');
      });
    }
    diiaModal.addEventListener('click', (e) => {
      if (e.target === diiaModal) diiaModal.classList.remove('open');
    });
  }
}

/* ===== REGISTER PAGE ===== */
function initRegisterPage() {
  const wizard = document.getElementById('register-wizard');
  if (!wizard) return;

  if (hasSession()) {
    window.location.href = 'cabinet.html';
    return;
  }

  let currentStep = 1;
  const totalSteps = 4;
  const formData = {};

  function showStep(n) {
    document.querySelectorAll('.wizard-step').forEach(s => s.style.display = 'none');
    const stepEl = document.getElementById('step-' + n);
    if (stepEl) stepEl.style.display = 'block';
    updateProgressBar(n);
    currentStep = n;
  }

  function updateProgressBar(active) {
    document.querySelectorAll('.step-item').forEach((item, i) => {
      const num = i + 1;
      item.classList.remove('active', 'completed');
      if (num < active) item.classList.add('completed');
      else if (num === active) item.classList.add('active');
      const circle = item.querySelector('.step-circle');
      if (circle) {
        if (num < active) circle.textContent = '✓';
        else circle.textContent = num;
      }
    });
    document.querySelectorAll('.step-line').forEach((line, i) => {
      line.classList.remove('completed', 'active');
      if (i + 1 < active) line.classList.add('completed');
      else if (i + 1 === active - 1) line.classList.add('active');
    });
  }

  showStep(1);

  /* STEP 1 */
  const step1Next = document.getElementById('step1-next');
  if (step1Next) {
    step1Next.addEventListener('click', () => {
      const lastName = document.getElementById('reg-lastname');
      const firstName = document.getElementById('reg-firstname');
      const dob = document.getElementById('reg-dob');
      let valid = true;

      if (!lastName.value.trim()) { showError(lastName, "Введіть прізвище"); valid = false; }
      else clearError(lastName);
      if (!firstName.value.trim()) { showError(firstName, "Введіть ім'я"); valid = false; }
      else clearError(firstName);
      if (!dob.value) { showError(dob, "Введіть дату народження"); valid = false; }
      else {
        const age = (new Date() - new Date(dob.value)) / (365.25 * 24 * 3600 * 1000);
        if (age < 18) { showError(dob, "Вам має бути 18 або більше років"); valid = false; }
        else clearError(dob);
      }

      if (!valid) return;

      formData.lastName = lastName.value.trim();
      formData.firstName = firstName.value.trim();
      formData.patronymic = document.getElementById('reg-patronymic')?.value.trim() || '';
      formData.dob = dob.value;
      const genderRadio = document.querySelector('input[name="gender"]:checked');
      formData.gender = genderRadio ? genderRadio.value : 'male';

      showStep(2);
    });
  }

  /* STEP 2 */
  const phoneInput = document.getElementById('reg-phone');
  if (phoneInput) applyPhoneMask(phoneInput);

  const step2Back = document.getElementById('step2-back');
  const step2Next = document.getElementById('step2-next');
  if (step2Back) step2Back.addEventListener('click', () => showStep(1));
  if (step2Next) {
    step2Next.addEventListener('click', () => {
      const phone = phoneInput;
      const email = document.getElementById('reg-email');
      let valid = true;

      if (!isValidPhone(phone.value)) { showError(phone, "Введіть коректний номер у форматі +380"); valid = false; }
      else clearError(phone);
      if (!isValidEmail(email.value.trim())) { showError(email, "Введіть коректний email"); valid = false; }
      else clearError(email);

      if (!valid) return;
      formData.phone = getRawPhone(phone);
      formData.email = email.value.trim().toLowerCase();

      // Update OTP hint with masked phone
      const otpHintPhone = document.getElementById('otp-phone-hint');
      if (otpHintPhone) {
        const last4 = formData.phone.slice(-4);
        const area = formData.phone.slice(4, 6);
        otpHintPhone.textContent = `+380 (0${area}) ***-**-${last4.slice(0, 2)}${last4.slice(2)}`;
      }

      // Start OTP countdown
      const countdownEl = document.getElementById('otp-countdown');
      const resendEl = document.getElementById('otp-resend-link');
      if (countdownEl) startOTPCountdown(countdownEl, resendEl, 60, () => {});

      showStep(3);
    });
  }

  /* STEP 3 — OTP */
  const otpContainer = document.getElementById('otp-container');
  if (otpContainer) initOTPInputs(otpContainer);

  const step3Back = document.getElementById('step3-back');
  const step3Next = document.getElementById('step3-confirm');
  if (step3Back) step3Back.addEventListener('click', () => showStep(2));
  if (step3Next) {
    step3Next.addEventListener('click', () => {
      const code = getOTPValue(otpContainer);
      const errEl = document.getElementById('otp-error');
      if (code.length < 6) {
        if (otpContainer) setOTPError(otpContainer);
        if (errEl) { errEl.textContent = 'Введіть 6-значний код'; errEl.classList.add('visible'); }
        return;
      }
      if (code !== '123456') {
        if (otpContainer) setOTPError(otpContainer);
        if (errEl) { errEl.textContent = 'Невірний код. Спробуйте знову.'; errEl.classList.add('visible'); }
        return;
      }
      if (errEl) errEl.classList.remove('visible');
      formData.phoneVerified = true;
      showStep(4);
    });
  }

  /* STEP 4 — Password */
  const pwdInput = document.getElementById('reg-password');
  const pwdConfirm = document.getElementById('reg-password-confirm');
  const togglePwd = document.getElementById('toggle-reg-password');
  const toggleConfirm = document.getElementById('toggle-reg-confirm');
  const strengthBar = document.getElementById('strength-bar');
  const strengthLabel = document.getElementById('strength-label');

  if (pwdInput && strengthBar && strengthLabel) {
    pwdInput.addEventListener('input', () => {
      updateStrengthBar(pwdInput.value, strengthBar, strengthLabel);
      clearError(pwdInput);
    });
  }
  if (pwdConfirm) pwdConfirm.addEventListener('input', () => clearError(pwdConfirm));

  if (togglePwd && pwdInput) {
    togglePwd.addEventListener('click', () => {
      pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
      togglePwd.textContent = pwdInput.type === 'password' ? '👁' : '🙈';
    });
  }
  if (toggleConfirm && pwdConfirm) {
    toggleConfirm.addEventListener('click', () => {
      pwdConfirm.type = pwdConfirm.type === 'password' ? 'text' : 'password';
      toggleConfirm.textContent = pwdConfirm.type === 'password' ? '👁' : '🙈';
    });
  }

  const step4Back = document.getElementById('step4-back');
  const submitBtn = document.getElementById('reg-submit');
  if (step4Back) step4Back.addEventListener('click', () => showStep(3));

  if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      let valid = true;

      if (!pwdInput.value || pwdInput.value.length < 8) {
        showError(pwdInput, 'Пароль повинен містити щонайменше 8 символів'); valid = false;
      }
      if (calcStrength(pwdInput.value) < 2) {
        showError(pwdInput, 'Пароль надто слабкий'); valid = false;
      }
      if (pwdInput.value !== pwdConfirm.value) {
        showError(pwdConfirm, 'Паролі не збігаються'); valid = false;
      }

      const agreeTerms = document.getElementById('agree-terms');
      const agreeAge = document.getElementById('agree-age');
      const termsErr = document.getElementById('terms-error');

      if (agreeTerms && !agreeTerms.checked) {
        if (termsErr) { termsErr.textContent = 'Прийміть умови використання'; termsErr.classList.add('visible'); }
        valid = false;
      } else if (termsErr) termsErr.classList.remove('visible');

      if (agreeAge && !agreeAge.checked) {
        if (termsErr) { termsErr.textContent = 'Підтвердіть, що вам виповнилося 18 років'; termsErr.classList.add('visible'); }
        valid = false;
      }

      if (!valid) return;

      formData.password = pwdInput.value;
      formData.isVerified = false;
      formData.verificationMethod = null;
      formData.createdAt = new Date().toISOString();

      saveUser(formData);
      setSession();
      window.location.href = 'verify.html';
    });
  }
}

/* ===== VERIFY PAGE ===== */
function initVerifyPage() {
  if (!document.getElementById('verify-root')) return;

  if (!hasSession()) {
    window.location.href = 'login.html';
    return;
  }

  const user = getUser();

  // Show username in header if available
  const userNameEl = document.getElementById('verify-username');
  if (userNameEl && user) {
    userNameEl.textContent = user.firstName + ' ' + user.lastName;
  }

  // Stage management
  let currentStage = 'choose'; // choose | diia | manual | processing | success | pending
  let diiaCountdownInterval = null;
  let docType = 'id'; // id | passport

  const stages = {
    choose: document.getElementById('stage-choose'),
    diia: document.getElementById('stage-diia'),
    manual: document.getElementById('stage-manual'),
    processing: document.getElementById('stage-processing'),
    success: document.getElementById('stage-success'),
    pending: document.getElementById('stage-pending')
  };

  function showStage(name) {
    Object.entries(stages).forEach(([key, el]) => {
      if (el) el.style.display = key === name ? 'block' : 'none';
    });
    currentStage = name;
    updateBreadcrumb(name);
  }

  function updateBreadcrumb(stage) {
    const crumbs = document.querySelectorAll('.verify-crumb');
    if (!crumbs.length) return;
    crumbs.forEach(c => c.classList.remove('active', 'done'));
    const map = { choose: 0, diia: 1, manual: 1, processing: 2, success: 3, pending: 3 };
    const activeIdx = map[stage] || 0;
    crumbs.forEach((c, i) => {
      if (i < activeIdx) c.classList.add('done');
      else if (i === activeIdx) c.classList.add('active');
    });
  }

  showStage('choose');

  // Method selection
  const diiaMethodBtn = document.getElementById('method-diia');
  const manualMethodBtn = document.getElementById('method-manual');

  if (diiaMethodBtn) {
    diiaMethodBtn.addEventListener('click', () => {
      document.querySelectorAll('.method-card').forEach(c => {
        c.classList.remove('selected', 'selected--diia');
      });
      diiaMethodBtn.classList.add('selected', 'selected--diia');
      setTimeout(() => startDiiaVerification(), 400);
    });
  }

  if (manualMethodBtn) {
    manualMethodBtn.addEventListener('click', () => {
      document.querySelectorAll('.method-card').forEach(c => {
        c.classList.remove('selected', 'selected--diia');
      });
      manualMethodBtn.classList.add('selected');
      setTimeout(() => startManualVerification(), 400);
    });
  }

  /* DIIA PATH */
  function startDiiaVerification() {
    const qrWrap = document.getElementById('verify-diia-qr');
    if (qrWrap) qrWrap.innerHTML = getDiiaQRSVG();
    showStage('diia');
    startDiiaCountdown();

    // Show "Перевірити статус" after 5s
    setTimeout(() => {
      const checkBtn = document.getElementById('diia-check-status');
      if (checkBtn) checkBtn.style.display = 'inline-flex';
    }, 5000);
  }

  function startDiiaCountdown() {
    let secs = 298;
    const timerEl = document.getElementById('diia-verify-timer');
    if (diiaCountdownInterval) clearInterval(diiaCountdownInterval);
    diiaCountdownInterval = setInterval(() => {
      secs--;
      if (timerEl) {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;
      }
      if (secs <= 0) clearInterval(diiaCountdownInterval);
    }, 1000);
  }

  const diiaCheckBtn = document.getElementById('diia-check-status');
  if (diiaCheckBtn) {
    diiaCheckBtn.addEventListener('click', () => {
      if (diiaCountdownInterval) clearInterval(diiaCountdownInterval);
      showProcessing('diia');
    });
  }

  const diiaOpenBtn = document.getElementById('diia-open-app');
  if (diiaOpenBtn) {
    diiaOpenBtn.addEventListener('click', () => {
      // Try deep link, fallback to app store
      window.location.href = 'diia://share';
    });
  }

  const diiaBack = document.getElementById('diia-back');
  if (diiaBack) diiaBack.addEventListener('click', () => {
    if (diiaCountdownInterval) clearInterval(diiaCountdownInterval);
    showStage('choose');
  });

  /* MANUAL PATH */
  let manualSubStage = 'doctype'; // doctype | upload | data | selfie

  function startManualVerification() {
    showManualSub('doctype');
    showStage('manual');
  }

  function showManualSub(sub) {
    ['doctype', 'upload', 'data', 'selfie'].forEach(s => {
      const el = document.getElementById('manual-' + s);
      if (el) el.style.display = s === sub ? 'block' : 'none';
    });
    manualSubStage = sub;
  }

  // Doc type selection
  document.querySelectorAll('.doc-type-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.doc-type-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      docType = card.dataset.type || 'id';
      updateUploadLabels();
    });
  });

  function updateUploadLabels() {
    const label1 = document.getElementById('upload-label-1');
    const label2 = document.getElementById('upload-label-2');
    if (docType === 'id') {
      if (label1) label1.textContent = 'Лицьова сторона';
      if (label2) label2.textContent = 'Зворотна сторона';
    } else {
      if (label1) label1.textContent = 'Сторінка з фото';
      if (label2) label2.textContent = 'Сторінка прописки';
    }
    // Show/hide doc number fields
    const idFields = document.getElementById('doc-id-fields');
    const passportFields = document.getElementById('doc-passport-fields');
    if (idFields) idFields.style.display = docType === 'id' ? 'block' : 'none';
    if (passportFields) passportFields.style.display = docType === 'passport' ? 'block' : 'none';
  }

  const doctypeNext = document.getElementById('manual-doctype-next');
  const doctypeBack = document.getElementById('manual-doctype-back');
  if (doctypeNext) doctypeNext.addEventListener('click', () => showManualSub('upload'));
  if (doctypeBack) doctypeBack.addEventListener('click', () => showStage('choose'));

  const uploadNext = document.getElementById('manual-upload-next');
  const uploadBack = document.getElementById('manual-upload-back');
  if (uploadNext) uploadNext.addEventListener('click', () => {
    updateUploadLabels();
    showManualSub('data');
  });
  if (uploadBack) uploadBack.addEventListener('click', () => showManualSub('doctype'));

  const dataNext = document.getElementById('manual-data-next');
  const dataBack = document.getElementById('manual-data-back');
  if (dataNext) dataNext.addEventListener('click', () => showManualSub('selfie'));
  if (dataBack) dataBack.addEventListener('click', () => showManualSub('upload'));

  const selfieNext = document.getElementById('manual-selfie-next');
  const selfieBack = document.getElementById('manual-selfie-back');
  if (selfieBack) selfieBack.addEventListener('click', () => showManualSub('data'));
  if (selfieNext) selfieNext.addEventListener('click', () => showProcessing('manual'));

  // IPN checkbox
  const noIpnCheck = document.getElementById('no-ipn');
  const ipnGroup = document.getElementById('ipn-group');
  if (noIpnCheck && ipnGroup) {
    noIpnCheck.addEventListener('change', () => {
      ipnGroup.style.display = noIpnCheck.checked ? 'none' : 'block';
    });
  }

  // Upload zones
  initUploadZones();

  /* PROCESSING */
  function showProcessing(method) {
    showStage('processing');
    const steps = document.querySelectorAll('.processing-step');

    steps.forEach((s, i) => {
      s.classList.remove('appear', 'done');
      const iconEl = s.querySelector('.processing-step__icon');
      if (iconEl) iconEl.textContent = (i + 1).toString();
    });

    let delay = 300;
    steps.forEach((step, i) => {
      setTimeout(() => {
        step.classList.add('appear');
        if (i > 0) {
          setTimeout(() => {
            steps[i - 1].classList.add('done');
            const icon = steps[i - 1].querySelector('.processing-step__icon');
            if (icon) icon.textContent = '✓';
          }, 200);
        }
      }, delay);
      delay += 600;
    });

    const finishDelay = delay + 200;
    setTimeout(() => {
      steps.forEach(step => {
        step.classList.add('done');
        const icon = step.querySelector('.processing-step__icon');
        if (icon) icon.textContent = '✓';
      });

      // Update user
      const u = getUser();
      if (u) {
        if (method === 'diia') {
          u.isVerified = true;
          u.verificationMethod = 'diia';
        } else {
          u.isVerified = false;
          u.verificationMethod = 'manual';
          u.verificationStatus = 'pending';
        }
        saveUser(u);
      }

      setTimeout(() => {
        showStage(method === 'diia' ? 'success' : 'pending');
        // Update pending email
        if (method !== 'diia') {
          const emailEl = document.getElementById('pending-email');
          if (emailEl && u) emailEl.textContent = u.email || 'ваш email';
        }
      }, 500);
    }, finishDelay);
  }

  /* SUCCESS / PENDING to cabinet */
  ['go-cabinet-success', 'go-cabinet-pending'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => {
      window.location.href = 'cabinet.html';
    });
  });
}

/* ===== UPLOAD ZONES ===== */
function initUploadZones() {
  document.querySelectorAll('.upload-zone').forEach(zone => {
    const fileInput = zone.querySelector('input[type="file"]');
    if (!fileInput) return;

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const files = e.dataTransfer?.files;
      if (files?.[0]) handleUploadFile(zone, files[0]);
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) handleUploadFile(zone, fileInput.files[0]);
    });
  });
}

function handleUploadFile(zone, file) {
  if (!file.type.startsWith('image/')) return;
  zone.classList.add('has-file');
  const reader = new FileReader();
  reader.onload = (e) => {
    zone.innerHTML = `
      <img class="upload-preview" src="${e.target.result}" alt="Preview" />
      <div class="upload-filename">✓ ${file.name}</div>
      <input type="file" accept="image/*" style="position:absolute;inset:0;opacity:0;cursor:pointer;">
    `;
    const newInput = zone.querySelector('input[type="file"]');
    newInput.addEventListener('change', () => {
      if (newInput.files[0]) handleUploadFile(zone, newInput.files[0]);
    });
  };
  reader.readAsDataURL(file);
}

/* ===== INIT ON DOM READY ===== */
document.addEventListener('DOMContentLoaded', () => {
  initLoginPage();
  initRegisterPage();
  initVerifyPage();
  initUploadZones();
});
