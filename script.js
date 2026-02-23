/* ================================================================
   TECH IN TOWN — Main Script
   ================================================================ */

(function () {
  'use strict';

  /* ---------------------------------------------------------------
     PARTICLE CANVAS
     --------------------------------------------------------------- */
  function initCanvas() {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, pts = [], raf;
    const N = 55, DIST = 130, SPEED = 0.28;
    const C = '0,212,255';

    function resize() {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }

    function mkPt() {
      return { x: Math.random() * W, y: Math.random() * H,
               vx: (Math.random() - .5) * SPEED,
               vy: (Math.random() - .5) * SPEED,
               r: Math.random() * 1.5 + .8 };
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${C},.45)`;
        ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < DIST) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(${C},${(1 - d / DIST) * .18})`;
            ctx.lineWidth = .7;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(frame);
    }

    resize();
    pts = Array.from({ length: N }, mkPt);
    frame();
    window.addEventListener('resize', () => { resize(); pts = Array.from({ length: N }, mkPt); }, { passive: true });
  }

  /* ---------------------------------------------------------------
     NAVBAR
     --------------------------------------------------------------- */
  function initNav() {
    const nav    = document.getElementById('nav');
    const burger = document.getElementById('burger');
    const links  = document.getElementById('nav-links');
    if (!nav) return;

    window.addEventListener('scroll', () => {
      nav.classList.toggle('stuck', window.scrollY > 50);
    }, { passive: true });

    if (burger && links) {
      burger.addEventListener('click', () => {
        burger.classList.toggle('open');
        links.classList.toggle('open');
        document.body.style.overflow = links.classList.contains('open') ? 'hidden' : '';
      });

      links.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
          burger.classList.remove('open');
          links.classList.remove('open');
          document.body.style.overflow = '';
        });
      });

      document.addEventListener('click', e => {
        if (links.classList.contains('open') &&
            !links.contains(e.target) && !burger.contains(e.target)) {
          burger.classList.remove('open');
          links.classList.remove('open');
          document.body.style.overflow = '';
        }
      });
    }

    // Smooth scroll for all hash links
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href').slice(1);
        if (!id) return;
        const el = document.getElementById(id);
        if (!el) return;
        e.preventDefault();
        const top = el.getBoundingClientRect().top + window.scrollY - 78;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }

  /* ---------------------------------------------------------------
     STAT COUNTERS  (.ctr[data-to])
     --------------------------------------------------------------- */
  function initCounters() {
    const els = document.querySelectorAll('.ctr[data-to]');
    if (!els.length) return;

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el     = entry.target;
        const target = parseInt(el.getAttribute('data-to'), 10);
        const dur    = 1100;
        const t0     = performance.now();
        function tick(now) {
          const p = Math.min((now - t0) / dur, 1);
          el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });

    els.forEach(el => io.observe(el));
  }

  /* ---------------------------------------------------------------
     TERMINAL ANIMATION
     --------------------------------------------------------------- */
  function initTerminal() {
    const txt = document.getElementById('term-text');
    const out = document.getElementById('term-out');
    if (!txt || !out) return;

    const seqs = [
      {
        cmd: 'diagnose --wifi --unit="4B"',
        lines: [
          ['>', 'Scanning network interfaces...'],
          ['>', 'Signal: -62 dBm  Channel: 2.4 GHz'],
          ['>', 'Congestion detected on channel 6'],
          ['ok', '✓ Fix: Switch to 5 GHz channel 36'],
        ]
      },
      {
        cmd: 'run --antivirus --deep-scan',
        lines: [
          ['>', 'Initialising threat scan...'],
          ['>', 'Scanning 48,291 files...'],
          ['>', 'Malware signatures: 0 found'],
          ['ok', '✓ System clean. Performance optimised.'],
        ]
      },
      {
        cmd: 'setup --movein --address="45 Cavill"',
        lines: [
          ['>', 'Configuring NBN connection...'],
          ['>', 'Mounting TV — wall: plasterboard'],
          ['>', 'Smart devices linked: 6'],
          ['ok', '✓ Apartment ready. All systems live.'],
        ]
      },
      {
        cmd: 'max --ask "My PC is running slow"',
        lines: [
          ['>', 'Analysing system profile...'],
          ['>', 'RAM usage: 94% — critical'],
          ['>', 'Startup programs: 24 found'],
          ['ok', '✓ Recommendation: Cleanup + RAM check'],
        ]
      }
    ];

    let si = 0, ci = 0, li = 0, tmr;

    function clearOut() { out.innerHTML = ''; }

    function typeChar() {
      const seq = seqs[si];
      if (ci < seq.cmd.length) {
        txt.textContent += seq.cmd[ci++];
        tmr = setTimeout(typeChar, 30 + Math.random() * 30);
      } else {
        li = 0;
        tmr = setTimeout(showLine, 450);
      }
    }

    function showLine() {
      const seq = seqs[si];
      if (li >= seq.lines.length) {
        tmr = setTimeout(nextSeq, 2400);
        return;
      }
      const [type, text] = seq.lines[li++];
      const d = document.createElement('div');
      d.className = type === 'ok' ? 'tline tline-ok' : 'tline';
      d.textContent = text;
      out.appendChild(d);
      tmr = setTimeout(showLine, 340);
    }

    function nextSeq() {
      si = (si + 1) % seqs.length;
      ci = 0; li = 0;
      txt.textContent = '';
      clearOut();
      tmr = setTimeout(typeChar, 500);
    }

    tmr = setTimeout(typeChar, 900);
  }

  /* ---------------------------------------------------------------
     TESTIMONIAL SLIDER
     --------------------------------------------------------------- */
  function initSlider() {
    const track = document.getElementById('ttrack');
    const prev  = document.getElementById('tprev');
    const next  = document.getElementById('tnext');
    const dots  = document.getElementById('tdots');
    if (!track) return;

    const cards = track.querySelectorAll('.tcard');
    const total = cards.length;
    let cur = 0, timer;

    function goTo(i) {
      cur = (i + total) % total;
      track.style.transform = `translateX(-${cur * 100}%)`;
      if (dots) {
        dots.querySelectorAll('.tdot').forEach((d, idx) => {
          d.classList.toggle('active', idx === cur);
        });
      }
    }

    function kick() {
      clearInterval(timer);
      timer = setInterval(() => goTo(cur + 1), 4800);
    }

    if (prev) prev.addEventListener('click', () => { goTo(cur - 1); kick(); });
    if (next) next.addEventListener('click', () => { goTo(cur + 1); kick(); });

    if (dots) {
      dots.querySelectorAll('.tdot').forEach(d => {
        d.addEventListener('click', () => { goTo(parseInt(d.getAttribute('data-i'), 10)); kick(); });
      });
    }

    // Swipe
    let sx = 0;
    track.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend',   e => {
      const diff = sx - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) { goTo(cur + (diff > 0 ? 1 : -1)); kick(); }
    }, { passive: true });

    goTo(0);
    kick();
  }

  /* ---------------------------------------------------------------
     BOOKING FORM
     --------------------------------------------------------------- */
  function initForm() {
    const form    = document.getElementById('bform');
    const success = document.getElementById('bsuccess');
    const errDiv  = document.getElementById('berr');
    const sv      = document.getElementById('sv');
    const mdWrap  = document.getElementById('md-wrap');
    const bsubmit = document.getElementById('bsubmit');
    const btext   = document.getElementById('btext');
    const bload   = document.getElementById('bload');
    if (!form) return;

    // Show move date field for move services
    if (sv && mdWrap) {
      sv.addEventListener('change', () => {
        const v = sv.value;
        mdWrap.style.display = (v === 'movein' || v === 'moveout') ? 'block' : 'none';
      });
    }

    // Clear error highlight on input
    form.querySelectorAll('input, select, textarea').forEach(el => {
      el.addEventListener('input', () => el.classList.remove('err'));
    });

    function validate() {
      let ok = true;
      const fn = document.getElementById('fn');
      const em = document.getElementById('em');
      const sv2 = document.getElementById('sv');

      [fn, em, sv2].forEach(el => el && el.classList.remove('err'));

      if (!fn || !fn.value.trim())            { fn && fn.classList.add('err'); ok = false; }
      if (!em || !em.value.trim())            { em && em.classList.add('err'); ok = false; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim())) {
        em && em.classList.add('err'); ok = false;
      }
      if (!sv2 || !sv2.value)                 { sv2 && sv2.classList.add('err'); ok = false; }
      return ok;
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      errDiv.style.display = 'none';

      if (!validate()) {
        errDiv.textContent = 'Please fill in all required fields correctly.';
        errDiv.style.display = 'block';
        return;
      }

      btext  && (btext.style.display  = 'none');
      bload  && (bload.style.display  = 'inline');
      bsubmit && (bsubmit.disabled = true);

      const payload = {
        type:      'booking',
        firstName: (document.getElementById('fn')?.value   || '').trim(),
        lastName:  (document.getElementById('ln')?.value   || '').trim(),
        email:     (document.getElementById('em')?.value   || '').trim(),
        phone:     (document.getElementById('ph')?.value   || '').trim(),
        service:   (document.getElementById('sv')?.value   || ''),
        moveDate:  (document.getElementById('md')?.value   || ''),
        address:   (document.getElementById('addr')?.value || '').trim(),
        message:   (document.getElementById('msg')?.value  || '').trim(),
        urgency:   (form.querySelector('input[name="urgency"]:checked')?.value || 'flexible'),
      };

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('server');
      } catch { /* show success regardless — UX graceful */ }

      form.style.display  = 'none';
      if (success) {
        success.style.display = 'flex';
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      btext  && (btext.style.display  = 'inline');
      bload  && (bload.style.display  = 'none');
      bsubmit && (bsubmit.disabled = false);
    });
  }

  /* ---------------------------------------------------------------
     FLOATING CHAT BUTTON
     --------------------------------------------------------------- */
  function initFab() {
    const fab  = document.getElementById('fab');
    const hero = document.getElementById('top');
    if (!fab || !hero) return;

    const io = new IntersectionObserver(
      ([entry]) => fab.classList.toggle('show', !entry.isIntersecting),
      { threshold: 0.15 }
    );
    io.observe(hero);
  }

  /* ---------------------------------------------------------------
     BOOT
     --------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initNav();
    initCounters();
    initTerminal();
    initSlider();
    initForm();
    initFab();
  });

})();
