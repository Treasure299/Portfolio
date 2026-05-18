const canAnimate = true;
const contactEmail = "hellotreasure.work@gmail.com";

function initBannerVideo() {
  const video = document.querySelector(".click-scroll__video");
  if (!video) return;

  const specialSrc = video.dataset.specialSrc;
  const fallbackSrc = video.dataset.fallbackSrc;
  if (!specialSrc || !fallbackSrc) return;

  video.src = fallbackSrc;
  video.dataset.activeSrc = fallbackSrc;
  video.load();

  fetch(specialSrc, { method: "HEAD", cache: "no-store" })
    .then((response) => {
      if (!response.ok) return;
      video.src = specialSrc;
      video.dataset.activeSrc = specialSrc;
      video.load();
      video.play().catch(() => {});
    })
    .catch(() => {});
}

function initLoader() {
  const loader = document.querySelector(".loader");
  const line = document.querySelector(".loader__line");
  if (!loader) return;

  if (!window.gsap || !canAnimate) {
    setTimeout(() => loader.remove(), 450);
    return;
  }

  gsap.set(line, { scaleX: 0 });
  const timeline = gsap.timeline({
    defaults: { ease: "power3.out" },
    onComplete: () => loader.remove()
  });

  timeline
    .to(line, { scaleX: 1, duration: 0.85 })
    .to(".loader__panel span", { yPercent: -120, opacity: 0, duration: 0.55, stagger: 0.04 }, "-=0.15")
    .to(loader, { yPercent: -100, duration: 0.85, ease: "power4.inOut" }, "-=0.15")
    .from(".hero h1, .hero__bottom p", { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.08, ease: "power4.out" }, "-=0.25")
    .from(".hero__name span", { scale: 0.92, opacity: 0, duration: 1, ease: "power4.out" }, "-=0.8");
}

function initHeroTypography() {
  const name = document.querySelector(".hero__name span");
  if (!name) return;

  const text = name.textContent.trim();
  name.innerHTML = "";
  [...text].forEach((letter, index) => {
    const char = document.createElement("span");
    char.className = "hero__char";
    char.textContent = letter;
    char.dataset.depth = String((index - (text.length - 1) / 2) * 7);
    char.style.setProperty("--i", index);
    name.appendChild(char);
  });

}

function initReferenceHeroText() {
  const hero = document.querySelector(".hero");
  const heroName = document.querySelector(".hero__name");
  const chars = document.querySelectorAll(".hero__char");
  if (!hero || !heroName || !chars.length || !canAnimate) return;

  const pointer = { x: 0, y: 0 };
  let current = { x: 0, y: 0, progress: 0 };
  let target = { x: 0, y: 0, progress: 0 };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function measure() {
    const rect = hero.getBoundingClientRect();
    const viewport = window.innerHeight || document.documentElement.clientHeight;
    target.progress = clamp(-rect.top / Math.max(1, rect.height - viewport * 0.15), 0, 1);
  }

  function render() {
    current.x += (target.x - current.x) * 0.08;
    current.y += (target.y - current.y) * 0.08;
    current.progress += (target.progress - current.progress) * 0.1;

    const p = current.progress;
    const stretch = 1 + p * 0.42;
    const compress = 1 - p * 0.16;
    const x = current.x * 18;
    const y = current.y * 12 - p * 30;
    const rotX = current.y * -5;
    const rotY = current.x * 7;

    heroName.style.letterSpacing = `${-1 + p * 1.75}vw`;
    heroName.style.opacity = `${0.86 - p * 0.38}`;
    heroName.style.filter = `blur(${p * 1.2}px)`;
    heroName.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scaleX(${stretch}) scaleY(${compress}) rotateX(${rotX}deg) rotateY(${rotY}deg)`;

    chars.forEach((char, index) => {
      const side = index - (chars.length - 1) / 2;
      const wave = Math.sin(p * Math.PI * 1.25 + index * 0.55);
      const charX = side * p * 8 + current.x * side * 1.7;
      const charY = wave * p * 18 + current.y * Math.abs(side) * 1.2;
      const charRot = side * p * 2.8 + current.x * side * 1.1;
      char.style.transform = `translate3d(${charX}px, ${charY}px, ${p * 36}px) rotateZ(${charRot}deg)`;
    });

    requestAnimationFrame(render);
  }

  function requestRender() {
    measure();
  }

  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / rect.width - 0.5;
    pointer.y = (event.clientY - rect.top) / rect.height - 0.5;
    target.x = pointer.x;
    target.y = pointer.y;
    requestRender();
  });

  hero.addEventListener("pointerleave", () => {
    target.x = 0;
    target.y = 0;
    requestRender();
  });

  window.addEventListener("scroll", () => {
    measure();
    requestRender();
  }, { passive: true });
  window.addEventListener("resize", () => {
    measure();
    requestRender();
  });

  measure();
  render();
}

function initSmoothScroll() {
  if (!window.Lenis || !canAnimate) return;

  const lenis = new Lenis({
    lerp: 0.1,
    wheelMultiplier: 1,
    gestureOrientation: "vertical",
    normalizeWheel: false,
    smoothTouch: false
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = link.getAttribute("href");
      if (!target || target === "#") return;
      const el = document.querySelector(target);
      if (!el) return;
      event.preventDefault();
      lenis.scrollTo(el);
    });
  });
}

function initNavTheme() {
  const nav = document.querySelector(".nav");
  const mobileNav = document.querySelector(".mobile-nav");
  const sections = document.querySelectorAll("[data-nav]");
  if (!nav || !sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const isPeach = entry.target.dataset.nav === "peach";
      nav.classList.toggle("is-peach", isPeach);
      if (mobileNav) mobileNav.classList.toggle("is-peach", isPeach);
    });
  }, {
    rootMargin: "-50px 0px -90% 0px",
    threshold: 0
  });

  sections.forEach((section) => observer.observe(section));
}

function initCursor() {
  const cursor = document.querySelector(".cursor");
  const cursorIcon = document.querySelector(".cursor__icon");
  const cursorText = document.querySelector(".cursor__text");
  if (!cursor || !cursorText || !window.gsap || !canAnimate || window.matchMedia("(pointer: coarse)").matches) return;

  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const pos = { x: mouse.x, y: mouse.y };

  window.addEventListener("mousemove", (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    cursor.classList.add("is-visible");
  });

  gsap.ticker.add(() => {
    const drift = 1 - Math.pow(1 - 0.09, gsap.ticker.deltaRatio());
    pos.x += (mouse.x - pos.x) * drift;
    pos.y += (mouse.y - pos.y) * drift;
    gsap.set(cursor, { x: pos.x, y: pos.y });
  });

  function setCursorMode(mode) {
    cursor.classList.remove("is-play", "is-copy", "is-open");
    cursor.classList.add("is-active", `is-${mode}`);
    cursorText.textContent = mode;
    if (cursorIcon) cursorIcon.textContent = mode === "play" ? "▶" : "↗";
  }

  function resetCursorMode() {
    cursor.classList.remove("is-active", "is-play", "is-copy", "is-open");
    cursorText.textContent = "";
    if (cursorIcon) cursorIcon.textContent = "↗";
  }

  document.querySelectorAll(".media-mask, .project-line, .folder, .click-play").forEach((item) => {
    item.addEventListener("mouseenter", () => {
      setCursorMode("play");
    });
    item.addEventListener("mouseleave", () => {
      resetCursorMode();
    });
  });

  document.querySelectorAll(".cta__button").forEach((item) => {
    item.addEventListener("mouseenter", () => {
      setCursorMode("open");
    });
    item.addEventListener("mouseleave", () => {
      resetCursorMode();
    });
  });
}

function initInteractiveDepth() {
  if (!window.gsap || !canAnimate || window.matchMedia("(pointer: coarse)").matches) return;

  const hero = document.querySelector(".hero");
  const heroName = document.querySelector(".hero__name");
  const chars = document.querySelectorAll(".hero__char");

  if (hero && heroName && chars.length) {
    const heroX = gsap.quickTo(heroName, "x", { duration: 0.65, ease: "power3.out" });
    const heroY = gsap.quickTo(heroName, "y", { duration: 0.65, ease: "power3.out" });
    const heroRotX = gsap.quickTo(heroName, "rotationX", { duration: 0.75, ease: "power3.out" });
    const heroRotY = gsap.quickTo(heroName, "rotationY", { duration: 0.75, ease: "power3.out" });

    hero.addEventListener("mousemove", (event) => {
      const rect = hero.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;

      heroX(nx * 26);
      heroY(ny * 18);
      heroRotX(ny * -8);
      heroRotY(nx * 10);

      chars.forEach((char) => {
        const depth = Number(char.dataset.depth || 0);
        gsap.to(char, {
          x: nx * depth,
          y: ny * Math.abs(depth) * 0.26,
          rotationY: nx * depth * 0.34,
          rotationX: ny * -10,
          duration: 0.65,
          ease: "power3.out",
          overwrite: "auto"
        });
      });
    });

    hero.addEventListener("mouseleave", () => {
      heroX(0);
      heroY(0);
      heroRotX(0);
      heroRotY(0);
      gsap.to(chars, {
        x: 0,
        y: 0,
        rotationX: 0,
        rotationY: 0,
        duration: 0.9,
        ease: "elastic.out(0.55, 0.35)",
        overwrite: "auto"
      });
    });
  }
}

function initMotion() {
  if (!window.gsap || !window.ScrollTrigger || !canAnimate) return;
  gsap.registerPlugin(ScrollTrigger);

  gsap.to(".hero__media", {
    yPercent: 8,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true
    }
  });

  gsap.to(".click-scroll__video", {
    scale: 1.1,
    ease: "none",
    scrollTrigger: {
      trigger: ".click-scroll",
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });

  gsap.from(".click-scroll__line", {
    opacity: 0,
    yPercent: 52,
    filter: "blur(18px)",
    duration: 1,
    stagger: 0.09,
    ease: "power4.out",
    scrollTrigger: {
      trigger: ".click-scroll",
      start: "top 72%",
      toggleActions: "restart none restart none"
    }
  });

  gsap.from(".service-headline h2", {
    opacity: 0,
    yPercent: 18,
    filter: "blur(10px)",
    duration: 0.9,
    ease: "power4.out",
    scrollTrigger: {
      trigger: ".services",
      start: "top 74%",
      toggleActions: "play none none none",
      once: true
    }
  });

  gsap.to(".service-headline h2", {
    yPercent: -8,
    ease: "none",
    scrollTrigger: {
      trigger: ".services",
      start: "top 38%",
      end: "38% top",
      scrub: true
    }
  });

  gsap.from(".service-row__copy, .service-row__media", {
    opacity: 0,
    y: 30,
    duration: 0.7,
    stagger: 0.08,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".services",
      start: "top 70%"
    }
  });

  gsap.to(".work-cta__word", {
    scale: 1.035,
    ease: "none",
    scrollTrigger: {
      trigger: ".work-cta",
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });

  gsap.from(".cta__box", {
    yPercent: 14,
    opacity: 0.96,
    ease: "none",
    scrollTrigger: {
      trigger: ".cta",
      start: "top bottom",
      end: "top 30%",
      scrub: true
    }
  });

  gsap.from(".cta__copy h2, .cta__copy p, .cta__button", {
    y: 44,
    opacity: 0,
    stagger: 0.08,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".cta",
      start: "top 58%"
    }
  });
}

function initVideoPlayback() {
  const videos = document.querySelectorAll("video");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting) {
        video.play().catch(() => {});
      } else if (!video.classList.contains("modal__video")) {
        video.pause();
      }
    });
  }, { threshold: 0.16 });

  videos.forEach((video) => {
    if (!video.classList.contains("modal__video")) observer.observe(video);
  });
}

function initModal() {
  const modal = document.querySelector(".modal");
  const modalVideo = document.querySelector(".modal__video");
  const modalTitle = document.querySelector(".modal__title");
  const closeButton = document.querySelector(".modal__close");
  if (!modal || !modalVideo || !modalTitle || !closeButton) return;

  function openModal(title, src) {
    modalTitle.textContent = title || "Treasure portfolio piece";
    modalVideo.src = src;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    modalVideo.play().catch(() => {});
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    modalVideo.pause();
    modalVideo.removeAttribute("src");
    modalVideo.load();
  }

  document.querySelectorAll("[data-src]").forEach((item) => {
    item.addEventListener("click", () => openModal(item.dataset.title, item.dataset.src));
  });

  document.querySelectorAll(".click-play").forEach((item) => {
    item.addEventListener("click", () => {
      const bannerVideo = document.querySelector(".click-scroll__video");
      const src = bannerVideo?.dataset.activeSrc || bannerVideo?.currentSrc || bannerVideo?.src;
      if (!src) return;
      openModal("Special motion graphics video", src);
    });
  });

  closeButton.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });
}

function initProjectPreview() {
  const preview = document.querySelector(".project-preview");
  const image = preview?.querySelector("img");
  const lines = document.querySelectorAll(".project-line[data-poster]");
  if (!preview || !image || !lines.length || window.matchMedia("(pointer: coarse)").matches) return;

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;

  function movePreview(event) {
    targetX = event.clientX + 120;
    targetY = event.clientY - 42;
  }

  function showPreview(line) {
    image.src = line.dataset.poster;
    image.alt = "";
    preview.classList.add("is-visible");
  }

  function hidePreview() {
    preview.classList.remove("is-visible");
  }

  lines.forEach((line) => {
    line.addEventListener("mouseenter", (event) => {
      movePreview(event);
      showPreview(line);
    });
    line.addEventListener("mousemove", movePreview);
    line.addEventListener("mouseleave", hidePreview);
  });

  function tick() {
    currentX += (targetX - currentX) * 0.16;
    currentY += (targetY - currentY) * 0.16;
    preview.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate3d(-50%, -50%, 0) scale(${preview.classList.contains("is-visible") ? 1 : 0.92}) rotate(-1.5deg)`;
    requestAnimationFrame(tick);
  }

  tick();
}

function initContactCopy() {
  document.querySelectorAll("[data-copy-email]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      if (!navigator.clipboard) return;
      event.preventDefault();
      const strong = button.querySelector("strong");
      const original = strong ? strong.textContent : contactEmail;
      await navigator.clipboard.writeText(button.dataset.copyEmail || contactEmail);
      if (strong) strong.textContent = "Email copied";
      setTimeout(() => {
        if (strong) strong.textContent = original;
      }, 1300);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initHeroTypography();
  initReferenceHeroText();
  initLoader();
  initSmoothScroll();
  initNavTheme();
  initCursor();
  initBannerVideo();
  initInteractiveDepth();
  initMotion();
  initVideoPlayback();
  initModal();
  initProjectPreview();
  initContactCopy();
});
