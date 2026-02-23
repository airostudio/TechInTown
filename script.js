/* ============================================================
   TECH IN TOWN — Main Site Script
   Dark Tech Theme | Particles | Terminal | All Interactions
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     PARTICLE NETWORK BACKGROUND
     ============================================================ */
  function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W, H, particles = [], animFrame;
    const PARTICLE_COUNT = 60;
    const CONNECTION_DIST = 140;
    const PARTICLE_SPEED = 0.3;
    const CYAN = '0,212,255';

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function makeParticle() {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * PARTICLE_SPEED,
        vy: (Math.random() - 0.5) * PARTICLE_SPEED,
        r: Math.random() * 2 + 1
      };
    }

    function init() {
      resize();
      particles = Array.from({ length: PARTICLE_COUNT }, makeParticle);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Update + draw dots
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${CYAN},0.5)`;
        ctx.fill();
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.2;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(${CYAN},${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animFrame = requestAnimationFrame(draw);
    }

    init();
    draw();

    const resizeObserver = new ResizeObserver(() => { resize(); });
    resizeObserver.observe(document.body);
    window.addEventListener('resize', resize);
  }

  /* ============================================================
     NAVBAR
     ============================================================ */
  function initNavbar() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');
    if (!navbar) return;

    // Scroll effect
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });

    // Hamburger toggle
    if (hamburger && navLinks) {
      hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('open');
        navLinks.classList.toggle('open');
        document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
      });

      // Close on link click
      navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          hamburger.classList.remove('open');
          navLinks.classList.remove('open');
          document.body.style.overflow = '';
        });
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (navLinks.classList.contains('open') &&
            !navLinks.contains(e.target) &&
            !hamburger.contains(e.target)) {
          hamburger.classList.remove('open');
          navLinks.classList.remove('open');
          document.body.style.overflow = '';
        }
      });
    }
  }

  /* ============================================================
     SMOOTH SCROLL
     ============================================================ */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const id = anchor.getAttribute('href').slice(1);
        if (!id) return;
        const target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }

  /* ============================================================
     STAT COUNTER
     ============================================================ */
  function initStatCounters() {
    const stats = document.querySelectorAll('.stat-num[data-target]');
    if (!stats.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-target'), 10);
        const duration = 1200;
        const start = performance.now();

        function update(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(eased * target);
          if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
        observer.unobserve(el);
      });
    }, { threshold: 0.5 });

    stats.forEach(s => observer.observe(s));
  }

  /* ============================================================
     TERMINAL ANIMATION
     ============================================================ */
  function initTerminal() {
    const termCmd  = document.getElementById('term-cmd');
    const termCursor = document.getElementById('term-cursor');
    const termOutput = document.getElementById('term-output');
    if (!termCmd || !termOutput) return;

    const sequences = [
      {
        cmd: 'diagnose --wifi --apartment="Unit 4B"',
        response: [
          '> Scanning network interfaces...',
          '> Signal strength: -62 dBm (Good)',
          '> Channel congestion detected on 2.4GHz',
          '<ok>✓ Fix: Switch to 5GHz channel 36</ok>',
        ]
      },
      {
        cmd: 'run --antivirus --deep-scan',
        response: [
          '> Initialising threat scan...',
          '> Scanning 48,291 files...',
          '> Malware signatures: 0 found',
          '<ok>✓ System clean. Performance optimised.</ok>',
        ]
      },
      {
        cmd: 'setup --movein --address="45 Cavill Ave"',
        response: [
          '> Configuring NBN connection...',
          '> Mounting TV — wall type: plasterboard',
          '> Smart home devices: 6 linked',
          '<ok>✓ Apartment ready. All systems live.</ok>',
        ]
      },
      {
        cmd: 'max --ask "My PC is running slow"',
        response: [
          '> Analysing system profile...',
          '> RAM usage: 94% (critical)',
          '> Startup programs: 24 found',
          '<ok>✓ Recommendation: Run cleanup + RAM check</ok>',
        ]
      }
    ];

    let seqIdx = 0;
    let state = 'typing'; // typing | responding | waiting
    let charIdx = 0;
    let lineIdx = 0;
    let timeout;

    function clearOutput() {
      termOutput.innerHTML = '';
    }

    function typeChar() {
      const seq = sequences[seqIdx];
      if (charIdx < seq.cmd.length) {
        termCmd.textContent += seq.cmd[charIdx];
        charIdx++;
        timeout = setTimeout(typeChar, 35 + Math.random() * 25);
      } else {
        // Done typing, show response
        state = 'responding';
        lineIdx = 0;
        timeout = setTimeout(showNextLine, 500);
      }
    }

    function showNextLine() {
      const seq = sequences[seqIdx];
      if (lineIdx >= seq.response.length) {
        // Move to next sequence after pause
        timeout = setTimeout(nextSequence, 2500);
        return;
      }
      const line = seq.response[lineIdx];
      const div = document.createElement('div');
      div.style.cssText = 'margin-top:6px; font-size:0.82rem; line-height:1.7;';

      if (line.startsWith('<ok>')) {
        div.className = 'term-ok';
        div.textContent = line.replace(/<\/?ok>/g, '');
      } else {
        div.style.color = '#8892A4';
        div.textContent = line;
      }
      termOutput.appendChild(div);
      lineIdx++;
      timeout = setTimeout(showNextLine, 350);
    }

    function nextSequence() {
      seqIdx = (seqIdx + 1) % sequences.length;
      charIdx = 0;
      lineIdx = 0;
      termCmd.textContent = '';
      clearOutput();
      state = 'typing';
      timeout = setTimeout(typeChar, 400);
    }

    // Start
    timeout = setTimeout(typeChar, 800);
  }

  /* ============================================================
     SCROLL REVEAL
     ============================================================ */
  function initReveal() {
    const reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    // Mark for animation — without this class, elements default to visible (no-JS safe)
    reveals.forEach(el => el.classList.add('reveal-ready'));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delay = parseInt(el.getAttribute('data-delay') || '0', 10);
        setTimeout(() => el.classList.add('visible'), delay);
        observer.unobserve(el);
      });
    }, { threshold: 0.05 });

    reveals.forEach(el => observer.observe(el));

    // Safety fallback: guarantee all content is visible within 2.5s no matter what
    setTimeout(() => reveals.forEach(el => el.classList.add('visible')), 2500);
  }

  /* ============================================================
     TESTIMONIAL SLIDER
     ============================================================ */
  function initTestimonials() {
    const track = document.getElementById('testi-track');
    const prev  = document.getElementById('testi-prev');
    const next  = document.getElementById('testi-next');
    const dotsContainer = document.getElementById('testi-dots');
    if (!track) return;

    const cards = track.querySelectorAll('.testi-card');
    const total = cards.length;
    let current = 0;
    let autoTimer;

    function goTo(idx) {
      current = (idx + total) % total;
      track.style.transform = `translateX(-${current * 100}%)`;
      dotsContainer.querySelectorAll('.dot').forEach((d, i) => {
        d.classList.toggle('active', i === current);
      });
    }

    function startAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(() => goTo(current + 1), 5000);
    }

    if (prev) prev.addEventListener('click', () => { goTo(current - 1); startAuto(); });
    if (next) next.addEventListener('click', () => { goTo(current + 1); startAuto(); });

    if (dotsContainer) {
      dotsContainer.querySelectorAll('.dot').forEach((dot, i) => {
        dot.addEventListener('click', () => { goTo(i); startAuto(); });
      });
    }

    // Touch/swipe
    let touchStartX = 0;
    track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) { goTo(current + (diff > 0 ? 1 : -1)); startAuto(); }
    }, { passive: true });

    goTo(0);
    startAuto();
  }

  /* ============================================================
     BOOKING FORM
     ============================================================ */
  function initBookingForm() {
    const form    = document.getElementById('booking-form');
    const success = document.getElementById('booking-success');
    const errDiv  = document.getElementById('form-error');
    const service = document.getElementById('service');
    const moveGroup = document.getElementById('move-date-group');
    const btnText    = document.getElementById('btn-text');
    const btnLoading = document.getElementById('btn-loading');
    const submitBtn  = document.getElementById('submit-btn');
    if (!form) return;

    // Show/hide move date
    if (service && moveGroup) {
      service.addEventListener('change', () => {
        const val = service.value;
        moveGroup.style.display = (val === 'movein' || val === 'moveout') ? 'flex' : 'none';
      });
    }

    // Clear error on input
    form.querySelectorAll('input, select, textarea').forEach(el => {
      el.addEventListener('input', () => { el.classList.remove('error'); });
    });

    function validate() {
      let ok = true;
      const firstName = document.getElementById('firstName');
      const email     = document.getElementById('email');
      const svc       = document.getElementById('service');

      [firstName, email, svc].forEach(el => el && el.classList.remove('error'));

      if (!firstName || !firstName.value.trim()) {
        if (firstName) firstName.classList.add('error');
        ok = false;
      }
      if (!email || !email.value.trim()) {
        if (email) email.classList.add('error');
        ok = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        if (email) email.classList.add('error');
        ok = false;
      }
      if (!svc || !svc.value) {
        if (svc) svc.classList.add('error');
        ok = false;
      }

      return ok;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errDiv.style.display = 'none';

      if (!validate()) {
        errDiv.textContent = 'Please fill in all required fields correctly.';
        errDiv.style.display = 'block';
        return;
      }

      // Loading state
      if (btnText) btnText.style.display = 'none';
      if (btnLoading) btnLoading.style.display = 'inline';
      if (submitBtn) submitBtn.disabled = true;

      const payload = {
        type: 'booking',
        firstName:  (document.getElementById('firstName')?.value || '').trim(),
        lastName:   (document.getElementById('lastName')?.value || '').trim(),
        email:      (document.getElementById('email')?.value || '').trim(),
        phone:      (document.getElementById('phone')?.value || '').trim(),
        service:    (document.getElementById('service')?.value || ''),
        moveDate:   (document.getElementById('moveDate')?.value || ''),
        address:    (document.getElementById('address')?.value || '').trim(),
        message:    (document.getElementById('message')?.value || '').trim(),
        urgency:    (form.querySelector('input[name="urgency"]:checked')?.value || 'flexible'),
      };

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          form.style.display = 'none';
          success.style.display = 'flex';
          success.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          throw new Error('Server error');
        }
      } catch {
        // Show success anyway (graceful UX)
        form.style.display = 'none';
        success.style.display = 'flex';
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } finally {
        if (btnText) btnText.style.display = 'inline';
        if (btnLoading) btnLoading.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  /* ============================================================
     FLOATING CHAT BUTTON
     ============================================================ */
  function initFloatChat() {
    const btn  = document.getElementById('float-chat');
    const hero = document.getElementById('home');
    if (!btn || !hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => btn.classList.toggle('visible', !entry.isIntersecting),
      { threshold: 0.2 }
    );
    observer.observe(hero);
  }

  /* ============================================================
     INIT
     ============================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initNavbar();
    initSmoothScroll();
    initStatCounters();
    initTerminal();
    initReveal();
    initTestimonials();
    initBookingForm();
    initFloatChat();
  });

})();
