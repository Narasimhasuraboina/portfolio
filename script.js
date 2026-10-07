(() => {
  const canvas = document.querySelector("#code-field");
  const context = canvas?.getContext("2d", { alpha: true });
  if (!canvas || !context) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const codeLines = [
    "const response = await axios.get(",
    "`${API}/profile/all-donors`,",
    "{ headers: { Authorization: `Bearer ${token}` } }",
    "setDonors(response.data);",
  ];
  const pointer = { x: -1000, y: -1000, active: false };
  const ripples = [];
  const cell = 14;
  let width = 0;
  let height = 0;
  let columns = 0;
  let rows = 0;
  let frame = 0;
  let lastFrame = 0;
  let visible = true;
  let pageVisible = !document.hidden;
  let scrollY = window.scrollY;
  const palettes = {
    intro: [133, 163, 149, 178, 212, 192],
    work: [144, 172, 147, 190, 221, 194],
    about: [158, 164, 126, 204, 210, 166],
    contact: [165, 145, 126, 213, 184, 158],
  };

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    columns = Math.ceil(width / cell) + 1;
    rows = Math.ceil(height / 34) + 1;
    draw(performance.now());
  }

  function draw(time) {
    context.clearRect(0, 0, width, height);
    context.font = '9px "DM Mono", monospace';
    context.textBaseline = "top";
    const [baseR, baseG, baseB, hotR, hotG, hotB] = palettes[document.body.dataset.section] || palettes.intro;
    const drift = reduceMotion.matches ? 0 : Math.sin(time * 0.00018) * 2;
    for (let row = 0; row < rows; row++) {
      const y = row * 34 + ((row % 3) - 1) * 3;
      const line = codeLines[(row + Math.floor(scrollY / 180)) % codeLines.length];
      const lineWidth = line.length * 8 + 150;
      const offset = (row * 79 + Math.floor(scrollY * 0.16)) % lineWidth;
      for (let x = -offset; x < width; x += lineWidth) {
        for (let index = 0; index < line.length; index++) {
          const char = line[index];
          if (char === " ") continue;
          const px = x + index * 8 + drift;
          const dx = px - pointer.x;
          const dy = y - pointer.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const influence = pointer.active ? Math.max(0, 1 - distance / 190) : 0;
          const wave = influence ? Math.sin(distance * 0.045 - time * 0.003) * 5 * influence : 0;
          const edge = Math.min(1, Math.abs(px - width * 0.52) / (width * 0.54));
          const depth = (Math.sin(row * 0.67 + x * 0.006 + time * 0.00022) + 1) * 0.5;
          const alpha = (0.025 + edge * 0.045 + depth * 0.025 + influence * 0.18);
          context.fillStyle = influence > 0.08
            ? `rgba(${hotR}, ${hotG}, ${hotB}, ${alpha})`
            : `rgba(${baseR}, ${baseG}, ${baseB}, ${alpha})`;
          context.fillText(char, px + wave, y + (influence ? Math.cos(distance * 0.035) * influence * 2 : 0));
        }
      }
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const ripple = ripples[i];
      const elapsed = (time - ripple.started) / 950;
      if (elapsed >= 1) {
        ripples.splice(i, 1);
        continue;
      }
      const radius = elapsed * 260;
      context.beginPath();
      context.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      context.strokeStyle = `rgba(172, 207, 188, ${(1 - elapsed) * 0.16})`;
      context.lineWidth = 1;
      context.stroke();
    }
  }

  function animate(time) {
    frame = 0;
    if (!visible || !pageVisible || reduceMotion.matches) return;
    if (time - lastFrame >= 1000 / 30) {
      draw(time);
      lastFrame = time;
    }
    frame = requestAnimationFrame(animate);
  }

  function requestDraw() {
    if (!visible || !pageVisible) return;
    if (reduceMotion.matches) {
      draw(performance.now());
      return;
    }
    if (!frame) frame = requestAnimationFrame(animate);
  }

  function updatePointer(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    requestDraw();
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scroll", () => {
    scrollY = window.scrollY;
    requestDraw();
    document.documentElement.style.setProperty("--atmosphere-shift", `${Math.min(scrollY * -0.025, -34)}px`);
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    document.documentElement.style.setProperty("--scroll-progress", String(scrollable > 0 ? scrollY / scrollable : 0));
  }, { passive: true });
  window.addEventListener("pointermove", updatePointer, { passive: true });
  window.addEventListener("pointerleave", () => {
    pointer.active = false;
    requestDraw();
  });
  window.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") updatePointer(event);
    ripples.push({ x: event.clientX, y: event.clientY, started: performance.now() });
    requestDraw();
  }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    pageVisible = !document.hidden;
    requestDraw();
  });
  reduceMotion.addEventListener?.("change", requestDraw);

  const observer = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (!visible && frame) cancelAnimationFrame(frame);
    frame = 0;
    if (visible) requestDraw();
  });
  observer.observe(canvas);

  document.querySelectorAll(".details-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const details = document.getElementById(button.getAttribute("aria-controls"));
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      button.innerHTML = expanded
        ? 'View project details <span aria-hidden="true">＋</span>'
        : 'Hide project details <span aria-hidden="true">−</span>';
      if (details) details.hidden = expanded;
    });
  });

  const inspector = document.querySelector("#project-inspector");
  const inspectorTrigger = document.querySelector(".inspect-trigger");
  const inspectorClose = document.querySelector(".inspector-close");
  inspectorTrigger?.addEventListener("click", () => inspector?.showModal());
  inspectorClose?.addEventListener("click", () => inspector?.close());
  inspector?.addEventListener("click", (event) => {
    if (event.target === inspector) inspector.close();
  });

  const navItems = [...document.querySelectorAll(".nav-item")];
  const sections = navItems.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
  const sectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const sectionId = entry.target.id === "top" ? "intro" : entry.target.id;
      document.body.dataset.section = sectionId;
      requestDraw();
      navItems.forEach((link) => {
        const isActive = link.hash === `#${entry.target.id}`;
        link.classList.toggle("active", isActive);
        if (isActive) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }
  }, { rootMargin: "-38% 0px -38% 0px", threshold: 0 });
  sections.forEach((section) => sectionObserver.observe(section));

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
  document.querySelectorAll(".section-shell").forEach((section) => revealObserver.observe(section));
  document.body.classList.add("js-ready");

  const visual = document.querySelector(".project-visual");
  if (visual && window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduceMotion.matches) {
    visual.addEventListener("pointermove", (event) => {
      const bounds = visual.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      visual.style.setProperty("--spot-x", `${x * 100}%`);
      visual.style.setProperty("--spot-y", `${y * 100}%`);
      visual.style.setProperty("--tilt-x", `${(0.5 - y) * 5}deg`);
      visual.style.setProperty("--tilt-y", `${(x - 0.5) * 7}deg`);
    });
    visual.addEventListener("pointerleave", () => {
      visual.style.setProperty("--spot-x", "50%");
      visual.style.setProperty("--spot-y", "50%");
      visual.style.setProperty("--tilt-x", "0deg");
      visual.style.setProperty("--tilt-y", "0deg");
    });
  }

  resize();
  requestDraw();
})();
