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

// Phone mask
document.querySelectorAll('input[type="tel"]').forEach(input => {
  input.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.startsWith('7') || v.startsWith('8')) v = v.slice(1);
    let formatted = '+7';
    if (v.length > 0) formatted += ' (' + v.slice(0, 3);
    if (v.length >= 3) formatted += ') ' + v.slice(3, 6);
    if (v.length >= 6) formatted += '-' + v.slice(6, 8);
    if (v.length >= 8) formatted += '-' + v.slice(8, 10);
    e.target.value = formatted;
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
