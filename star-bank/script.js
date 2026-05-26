// Header scroll effect
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 20);
});

// Mobile burger menu
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
burger.addEventListener('click', () => {
  nav.classList.toggle('open');
  burger.classList.toggle('active');
});

// Close nav on link click
nav.querySelectorAll('.nav__link').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    burger.classList.remove('active');
  });
});

// Form submission
function handleForm(e) {
  e.preventDefault();
  document.getElementById('modal').classList.add('open');
  e.target.reset();
}

// Close modal
function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// Animate numbers on scroll
const stats = document.querySelectorAll('.stat__num');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animation = 'fadeInUp .5s ease forwards';
    }
  });
}, { threshold: 0.5 });

stats.forEach(s => observer.observe(s));

// Card hover tilt effect
document.querySelectorAll('.card-mock').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(600px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-6px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// Ukrainian phone mask +380 (0XX) XXX-XX-XX
document.querySelectorAll('input[type="tel"]').forEach(input => {
  input.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '');
    // Remove leading 380 or 0 prefix duplicates
    if (v.startsWith('380')) v = v.slice(3);
    else if (v.startsWith('80')) v = v.slice(2);
    else if (v.startsWith('0')) v = v.slice(1);
    // Limit to 9 digits after country code
    v = v.slice(0, 9);
    let formatted = '+380';
    if (v.length > 0) formatted += ' (0' + v.slice(0, 2);
    if (v.length >= 2) formatted += ') ' + v.slice(2, 5);
    if (v.length >= 5) formatted += '-' + v.slice(5, 7);
    if (v.length >= 7) formatted += '-' + v.slice(7, 9);
    e.target.value = formatted;
  });
  input.addEventListener('focus', (e) => {
    if (!e.target.value) e.target.value = '+380 (0';
  });
  input.addEventListener('blur', (e) => {
    if (e.target.value === '+380 (0') e.target.value = '';
  });
});

// Smooth reveal on scroll
const revealEls = document.querySelectorAll('.service-card, .product-card, .contact-item, .about__img-card');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

revealEls.forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity .5s ease, transform .5s ease';
  revealObserver.observe(el);
});
