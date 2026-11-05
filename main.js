/**
 * NOCTIS — Main Application Controller
 * Pure Vanilla JavaScript: High-performance canvas scrollytelling,
 * responsive frame management, custom cursor, and interactive accordion.
 */

(function () {
  'use strict';

  // Ensure config is available
  const CFG = window.NOCTIS_CONFIG;
  if (!CFG) {
    console.error('NOCTIS_CONFIG is not loaded.');
    return;
  }

  // Feature & Preference Detections
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;

  // DOM Elements
  const preloaderEl = document.getElementById('preloader');
  const preloaderBar = document.getElementById('preloader-bar');
  const preloaderPercent = document.getElementById('preloader-percent');
  const siteHeader = document.getElementById('site-header');

  const heroWrapper = document.getElementById('hero');
  const heroCanvas = document.getElementById('hero-canvas');
  const heroProgressBar = document.getElementById('hero-progress-bar');
  const hudChapterText = document.getElementById('hud-chapter-text');
  const hudSpeedVal = document.getElementById('hud-speed-val');
  const hudDistVal = document.getElementById('hud-dist-val');

  const statementSection = document.getElementById('statement');
  const statementQuote = document.getElementById('statement-quote');

  const dismantleWrapper = document.getElementById('dismantle');
  const dismantleCanvas = document.getElementById('dismantle-canvas');
  const dismantleProgressBar = document.getElementById('dismantle-progress-bar');
  const dismantleCalloutsEl = document.getElementById('dismantle-callouts');

  const lineupSection = document.getElementById('lineup');
  const lineupAccordion = document.getElementById('lineup-accordion');

  const grainCanvas = document.getElementById('grain-canvas');
  const cursorEl = document.getElementById('cursor');
  const cursorLabelEl = cursorEl ? cursorEl.querySelector('.cursor-label') : null;

  // State
  let isMobile = window.innerWidth < 768;
  let heroFrames = [];
  let heroLoadedIndices = new Set();
  let dismantleFrames = [];
  let dismantleLoadedIndices = new Set();

  let heroCtx = null;
  let dismantleCtx = null;

  // Animation & Scroll Lerp State
  const scrollyState = {
    hero: {
      targetProgress: 0,
      currentProgress: 0,
      targetFrame: 0,
      currentFrame: 0,
      renderedFrame: -1
    },
    dismantle: {
      targetProgress: 0,
      currentProgress: 0,
      targetFrame: 0,
      currentFrame: 0,
      renderedFrame: -1
    }
  };

  // Nav Scroll Tracking
  let lastScrollY = window.scrollY;
  let navScrollThreshold = 10;

  // Custom Cursor State
  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const cursor = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let isClicking = false;

  /* ==========================================================================
     1. INITIALIZATION & PRELOADER
     ========================================================================== */

  function init() {
    setupGrainEffect();
    setupCursor();
    setupStatementWords();
    setupDismantleCallouts();
    setupLineupAccordion();
    setupNavigation();

    if (!prefersReducedMotion) {
      setupCanvasContexts();
      startPreloading();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onResize, { passive: true });
      requestAnimationFrame(renderLoop);
    } else {
      // Reduced motion: dismiss preloader immediately
      document.body.classList.remove('is-loading');
      if (preloaderEl) preloaderEl.classList.add('is-hidden');
    }
  }

  /**
   * Helper to resolve frame URL based on screen size and index
   */
  function getFrameUrl(type, index) {
    const seq = CFG.sequences[type];
    const mode = isMobile ? seq.mobile : seq.desktop;
    const formattedIndex = String(index).padStart(4, '0');
    return mode.pathPattern.replace('{index}', formattedIndex);
  }

  /**
   * Preload initial frames before unlocking UI, then background-load the rest
   */
  function startPreloading() {
    const heroCount = CFG.sequences.hero.frameCount;
    const initialTarget = CFG.sequences.hero.preloadInitial;
    let initialLoaded = 0;

    heroFrames = new Array(heroCount);
    dismantleFrames = new Array(CFG.sequences.dismantle.frameCount);

    // Function to load a single frame with decode()
    function loadSingleFrame(type, index, onComplete) {
      const img = new Image();
      img.src = getFrameUrl(type, index);

      const markLoaded = () => {
        if (type === 'hero') {
          heroFrames[index - 1] = img;
          heroLoadedIndices.add(index - 1);
        } else {
          dismantleFrames[index - 1] = img;
          dismantleLoadedIndices.add(index - 1);
        }
        if (onComplete) onComplete();
      };

      if (img.decode) {
        img.decode().then(markLoaded).catch(markLoaded);
      } else {
        img.onload = markLoaded;
        img.onerror = markLoaded;
      }
    }

    // Step A: Load hero frames 1 to 40
    for (let i = 1; i <= initialTarget; i++) {
      loadSingleFrame('hero', i, () => {
        initialLoaded++;
        const percent = Math.min(100, Math.round((initialLoaded / initialTarget) * 100));
        updatePreloader(percent);

        if (initialLoaded === initialTarget) {
          finishPreloader();
          // Step B: Load the rest of hero sequence
          loadRemainingFrames('hero', initialTarget + 1, heroCount, () => {
            // Step C: Load dismantle sequence in background
            loadRemainingFrames('dismantle', 1, CFG.sequences.dismantle.frameCount, null);
          });
        }
      });
    }
  }

  function updatePreloader(percent) {
    if (preloaderPercent) {
      preloaderPercent.textContent = String(percent).padStart(3, '0');
    }
    if (preloaderBar) {
      preloaderBar.style.transform = `scaleX(${percent / 100})`;
    }
  }

  function finishPreloader() {
    if (preloaderBar) preloaderBar.classList.add('is-exiting');

    setTimeout(() => {
      document.body.classList.remove('is-loading');
      if (preloaderEl) preloaderEl.classList.add('is-hidden');

      // Trigger initial layout & draw
      updateCanvasDimensions();
      onScroll();
    }, 250);
  }

  function loadRemainingFrames(type, startIndex, endIndex, onAllDone) {
    let current = startIndex;
    const batchSize = 6; // Controlled concurrency to prevent network saturation

    function loadNextBatch() {
      if (current > endIndex) {
        if (onAllDone) onAllDone();
        return;
      }

      const limit = Math.min(current + batchSize, endIndex + 1);
      let batchPending = limit - current;

      for (let i = current; i < limit; i++) {
        const frameIdx = i;
        const img = new Image();
        img.src = getFrameUrl(type, frameIdx);

        const done = () => {
          if (type === 'hero') {
            heroFrames[frameIdx - 1] = img;
            heroLoadedIndices.add(frameIdx - 1);
          } else {
            dismantleFrames[frameIdx - 1] = img;
            dismantleLoadedIndices.add(frameIdx - 1);
          }
          batchPending--;
          if (batchPending === 0) {
            current = limit;
            loadNextBatch();
          }
        };

        if (img.decode) {
          img.decode().then(done).catch(done);
        } else {
          img.onload = done;
          img.onerror = done;
        }
      }
    }

    loadNextBatch();
  }

  /* ==========================================================================
     2. CANVAS CONTEXTS & ADAPTIVE RENDERING (COVER vs CONTAIN)
     ========================================================================== */

  function setupCanvasContexts() {
    if (heroCanvas) heroCtx = heroCanvas.getContext('2d', { alpha: false });
    if (dismantleCanvas) dismantleCtx = dismantleCanvas.getContext('2d', { alpha: false });
    updateCanvasDimensions();
  }

  function updateCanvasDimensions() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    [heroCanvas, dismantleCanvas].forEach(c => {
      if (!c) return;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      c.style.width = w + 'px';
      c.style.height = h + 'px';
    });

    if (heroCtx) {
      heroCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scrollyState.hero.renderedFrame = -1; // Force redraw
    }
    if (dismantleCtx) {
      dismantleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scrollyState.dismantle.renderedFrame = -1;
    }
  }

  /**
   * Find nearest loaded frame to prevent flickering
   */
  function getNearestLoadedFrame(framesArray, loadedIndices, targetIdx) {
    if (loadedIndices.has(targetIdx)) {
      return framesArray[targetIdx];
    }
    // Search outwards for closest loaded frame
    let offset = 1;
    const maxOffset = framesArray.length;
    while (offset < maxOffset) {
      if (targetIdx - offset >= 0 && loadedIndices.has(targetIdx - offset)) {
        return framesArray[targetIdx - offset];
      }
      if (targetIdx + offset < framesArray.length && loadedIndices.has(targetIdx + offset)) {
        return framesArray[targetIdx + offset];
      }
      offset++;
    }
    return null;
  }

  /**
   * Draw frame onto canvas adhering to:
   * Landscape -> cover-fit
   * Portrait  -> contain-fit, vertically centered on --asphalt (#07080A)
   */
  function drawCanvasFrame(ctx, canvas, img, fadeAlpha = 0) {
    if (!ctx || !img) return;

    const cw = window.innerWidth;
    const ch = window.innerHeight;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    // Fill background with --asphalt
    ctx.fillStyle = '#07080A';
    ctx.fillRect(0, 0, cw, ch);

    const isLandscape = cw >= ch;
    let renderW, renderH, offsetX, offsetY;

    if (isLandscape) {
      // Cover fit
      const scale = Math.max(cw / iw, ch / ih);
      renderW = iw * scale;
      renderH = ih * scale;
      offsetX = (cw - renderW) / 2;
      offsetY = (ch - renderH) / 2;
    } else {
      // Portrait contain-fit: vertically centered on --asphalt, never cropped
      const scale = Math.min(cw / iw, ch / ih);
      renderW = iw * scale;
      renderH = ih * scale;
      offsetX = (cw - renderW) / 2;
      offsetY = (ch - renderH) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, renderW, renderH);

    // Fade to solid black if specified (e.g. Hero last 5% of scroll)
    if (fadeAlpha > 0) {
      ctx.fillStyle = `rgba(7, 8, 10, ${Math.min(1, Math.max(0, fadeAlpha))})`;
      ctx.fillRect(0, 0, cw, ch);
    }
  }

  /* ==========================================================================
     3. SCROLL HANDLING & PROGRESS CALCULATIONS
     ========================================================================== */

  function onScroll() {
    const sy = window.scrollY;
    const vh = window.innerHeight;

    // 1. Navigation Show/Hide on scroll
    if (Math.abs(sy - lastScrollY) > navScrollThreshold) {
      if (sy > lastScrollY && sy > 120) {
        siteHeader.classList.add('is-hidden');
      } else {
        siteHeader.classList.remove('is-hidden');
      }
      lastScrollY = sy;
    }

    // 2. Hero Section Progress
    if (heroWrapper) {
      const rect = heroWrapper.getBoundingClientRect();
      const maxScroll = heroWrapper.offsetHeight - vh;
      const progress = maxScroll > 0 ? Math.max(0, Math.min(1, -rect.top / maxScroll)) : 0;
      scrollyState.hero.targetProgress = progress;
      scrollyState.hero.targetFrame = Math.round(progress * (CFG.sequences.hero.frameCount - 1));

      // Update 1px bottom progress fill
      if (heroProgressBar) {
        heroProgressBar.style.width = `${progress * 100}%`;
      }

      // Update Hero chapters & HUD
      updateHeroChapters(progress);
      updateHeroHUD(progress);
    }

    // 3. Statement Section Scrub (Word-by-word reveal)
    if (statementSection) {
      updateStatementProgress();
    }

    // 4. Dismantle Section Progress
    if (dismantleWrapper) {
      const rect = dismantleWrapper.getBoundingClientRect();
      const maxScroll = dismantleWrapper.offsetHeight - vh;
      const progress = maxScroll > 0 ? Math.max(0, Math.min(1, -rect.top / maxScroll)) : 0;
      scrollyState.dismantle.targetProgress = progress;
      scrollyState.dismantle.targetFrame = Math.round(progress * (CFG.sequences.dismantle.frameCount - 1));

      // Update 1px bottom progress fill
      if (dismantleProgressBar) {
        dismantleProgressBar.style.width = `${progress * 100}%`;
      }

      // Update Callouts
      updateDismantleCallouts(progress);
    }
  }

  function onResize() {
    const wasMobile = isMobile;
    isMobile = window.innerWidth < 768;
    updateCanvasDimensions();

    // Reload frame URLs if breakpoint crossed
    if (wasMobile !== isMobile) {
      heroLoadedIndices.clear();
      dismantleLoadedIndices.clear();
      startPreloading();
    }
  }

  /* ==========================================================================
     4. ANIMATION RENDER LOOP (with frame lerp 0.15)
     ========================================================================== */

  function renderLoop() {
    const lerpRate = CFG.timing.frameLerp;

    // --- A. Hero Render ---
    const hState = scrollyState.hero;
    hState.currentFrame += (hState.targetFrame - hState.currentFrame) * lerpRate;
    hState.currentProgress += (hState.targetProgress - hState.currentProgress) * lerpRate;
    const roundedHeroFrame = Math.round(hState.currentFrame);

    if (roundedHeroFrame !== hState.renderedFrame && heroCtx) {
      const img = getNearestLoadedFrame(heroFrames, heroLoadedIndices, roundedHeroFrame);
      if (img) {
        // Fade to solid black over the last 5% of scroll (0.95 to 1.0)
        let fadeAlpha = 0;
        if (hState.currentProgress >= 0.95) {
          fadeAlpha = (hState.currentProgress - 0.95) / 0.05;
        }
        drawCanvasFrame(heroCtx, heroCanvas, img, fadeAlpha);
        hState.renderedFrame = roundedHeroFrame;
      }
    }

    // --- B. Dismantle Render ---
    const dState = scrollyState.dismantle;
    dState.currentFrame += (dState.targetFrame - dState.currentFrame) * lerpRate;
    dState.currentProgress += (dState.targetProgress - dState.currentProgress) * lerpRate;
    const roundedDismantleFrame = Math.round(dState.currentFrame);

    if (roundedDismantleFrame !== dState.renderedFrame && dismantleCtx) {
      const img = getNearestLoadedFrame(dismantleFrames, dismantleLoadedIndices, roundedDismantleFrame);
      if (img) {
        drawCanvasFrame(dismantleCtx, dismantleCanvas, img, 0);
        dState.renderedFrame = roundedDismantleFrame;
      }
    }

    // --- C. Custom Cursor Lerp ---
    if (isFinePointer && !prefersReducedMotion && cursorEl) {
      cursor.x += (mouse.x - cursor.x) * CFG.timing.cursorLerp;
      cursor.y += (mouse.y - cursor.y) * CFG.timing.cursorLerp;
      cursorEl.style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0)`;
    }

    requestAnimationFrame(renderLoop);
  }

  /* ==========================================================================
     5. HERO CHAPTERS & HUD TELEMETRY
     ========================================================================== */

  function updateHeroChapters(progress) {
    const chapters = CFG.heroChapters;

    chapters.forEach(ch => {
      const el = document.getElementById(ch.id);
      if (!el) return;

      const [start, end] = ch.range;
      const isActive = progress >= start && progress <= end;
      el.classList.toggle('is-active', isActive);
    });
  }

  function updateHeroHUD(progress) {
    // Current Chapter Label
    const chapters = CFG.heroChapters;
    let activeChapter = chapters[0];
    for (let i = 0; i < chapters.length; i++) {
      if (progress >= chapters[i].range[0]) {
        activeChapter = chapters[i];
      }
    }
    if (hudChapterText) {
      hudChapterText.textContent = activeChapter.indexLabel;
    }

    // Speed Counter: 000 -> 118 KM/H
    if (hudSpeedVal) {
      const speed = Math.round(progress * CFG.hud.maxSpeedKmH);
      hudSpeedVal.textContent = `${String(speed).padStart(3, '0')} KM/H`;
    }

    // Distance: 0.0 -> 4.2 KM
    if (hudDistVal) {
      const dist = (progress * CFG.hud.maxDistanceKm).toFixed(1);
      hudDistVal.textContent = `${dist} KM`;
    }
  }

  /* ==========================================================================
     6. SECTION 2: STATEMENT (Word-by-word reveal)
     ========================================================================== */

  function setupStatementWords() {
    if (!statementQuote) return;
    const text = statementQuote.textContent.trim();
    const words = text.split(/\s+/);
    statementQuote.innerHTML = words
      .map(w => `<span class="word">${w}</span>`)
      .join(' ');
  }

  function updateStatementProgress() {
    const rect = statementSection.getBoundingClientRect();
    const vh = window.innerHeight;

    // Progression from entering middle to leaving middle
    const startY = vh * 0.8;
    const endY = vh * 0.2;
    const currentY = rect.top;

    const progress = Math.max(0, Math.min(1, (startY - currentY) / (startY - endY)));
    const words = statementQuote.querySelectorAll('.word');
    const wordCount = words.length;

    words.forEach((word, index) => {
      const wordThreshold = index / wordCount;
      const wordProgress = Math.max(0, Math.min(1, (progress - wordThreshold) * wordCount));
      const opacity = 0.15 + (1 - 0.15) * wordProgress;
      word.style.opacity = opacity.toFixed(2);
    });
  }

  /* ==========================================================================
     7. SECTION 3: DISMANTLE CALLOUTS
     ========================================================================== */

  function setupDismantleCallouts() {
    if (!dismantleCalloutsEl) return;
    dismantleCalloutsEl.innerHTML = '';

    CFG.dismantleCallouts.forEach(item => {
      const wrap = document.createElement('div');
      wrap.className = 'dismantle-callout';
      wrap.id = item.id;
      wrap.style.left = `${item.dotX}%`;
      wrap.style.top = `${item.dotY}%`;

      // 1px Hairline line geometry
      const rad = (item.lineAngleDeg * Math.PI) / 180;
      const endX = Math.cos(rad) * item.lineLength;
      const endY = Math.sin(rad) * item.lineLength;

      wrap.innerHTML = `
        <div class="callout-dot"></div>
        <div class="callout-line" style="width: ${item.lineLength}px; transform: rotate(${item.lineAngleDeg}deg);"></div>
        <div class="callout-text-box align-${item.textAlign}" style="left: ${endX}px; top: ${endY}px; transform: translateY(-50%);">
          <span class="callout-label">${item.label}</span>
          <span class="callout-desc">${item.desc}</span>
        </div>
      `;

      dismantleCalloutsEl.appendChild(wrap);
    });
  }

  function updateDismantleCallouts(progress) {
    CFG.dismantleCallouts.forEach(item => {
      const el = document.getElementById(item.id);
      if (!el) return;
      // Revealed when progress reaches or exceeds triggerProgress (after 70%)
      const isVisible = progress >= item.triggerProgress;
      el.classList.toggle('is-visible', isVisible);
    });
  }

  /* ==========================================================================
     8. SECTION 4: LINEUP ACCORDION
     ========================================================================== */

  let hoverTimeout = null;

  function setupLineupAccordion() {
    if (!lineupAccordion) return;
    lineupAccordion.innerHTML = '';

    CFG.lineup.forEach((car, index) => {
      const slide = document.createElement('button');
      slide.type = 'button';
      slide.className = 'lineup-slide';
      slide.id = `slide-${car.id}`;
      slide.setAttribute('role', 'tab');
      slide.setAttribute('aria-expanded', car.isDefaultOpen ? 'true' : 'false');
      slide.setAttribute('aria-controls', `panel-${car.id}`);
      slide.setAttribute('tabindex', '0');
      slide.setAttribute('data-cursor-label', car.isDefaultOpen ? 'CONFIGURE' : 'OPEN');
      slide.setAttribute('data-model-id', car.id);

      // Swatches HTML
      const swatchesHtml = car.swatches
        .map((col, sIdx) => `
          <button type="button" class="swatch-btn ${sIdx === 0 ? 'is-active' : ''}" style="background-color: ${col};" data-color="${col}" aria-label="Color option ${sIdx + 1}" data-cursor-label="SELECT"></button>
        `)
        .join('');

      slide.innerHTML = `
        <!-- Closed View -->
        <div class="slide-closed-view">
          <span class="lineup-mono-num">${car.num}</span>
          <span class="lineup-vert-name">${car.name}</span>
        </div>

        <!-- Car Image -->
        <div class="slide-image-wrap">
          <img src="${car.image}" alt="${car.alt}" class="slide-car-img" loading="lazy">
        </div>

        <!-- Open View -->
        <div class="slide-open-view" id="panel-${car.id}">
          <div class="lineup-open-top">
            <h3 class="lineup-open-title">${car.name}</h3>
            <span class="lineup-open-tagline">${car.tagline}</span>
          </div>

          <div class="lineup-open-bottom">
            <p class="lineup-body-text">${car.summary}</p>
            <div class="lineup-spec-row">
              <div class="lineup-spec-col">
                <span class="lineup-spec-label">RANGE</span>
                <span class="lineup-spec-val">${car.specs.range}</span>
              </div>
              <div class="lineup-spec-col">
                <span class="lineup-spec-label">0–100 KM/H</span>
                <span class="lineup-spec-val">${car.specs.accel}</span>
              </div>
              <div class="lineup-spec-col">
                <span class="lineup-spec-label">POWER</span>
                <span class="lineup-spec-val">${car.specs.power}</span>
              </div>
            </div>
            <div class="lineup-action-row">
              <div class="lineup-swatches">
                ${swatchesHtml}
              </div>
              <a href="#reserve" class="lineup-configure-link" data-cursor-label="RESERVE">
                <span>Configure</span>
                <span class="link-arrow">→</span>
              </a>
            </div>
          </div>
        </div>
      `;

      // Hover handler with 80ms debounce for smooth sweeps
      slide.addEventListener('mouseenter', () => {
        if (window.innerWidth >= 768) {
          clearTimeout(hoverTimeout);
          hoverTimeout = setTimeout(() => {
            openLineupSlide(slide);
          }, CFG.timing.hoverDebounceMs);
        }
      });

      slide.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimeout);
      });

      // Click / Tap Handler
      slide.addEventListener('click', (e) => {
        // If clicking a swatch or cta, don't trigger slide toggle
        if (e.target.closest('.swatch-btn') || e.target.closest('.lineup-configure-link')) {
          return;
        }
        openLineupSlide(slide);
      });

      // Keyboard navigation (Arrow Left / Arrow Right)
      slide.addEventListener('keydown', (e) => {
        const slides = Array.from(lineupAccordion.querySelectorAll('.lineup-slide'));
        const currIdx = slides.indexOf(slide);

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = slides[(currIdx + 1) % slides.length];
          next.focus();
          openLineupSlide(next);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = slides[(currIdx - 1 + slides.length) % slides.length];
          prev.focus();
          openLineupSlide(prev);
        }
      });

      // Swatch selection handling
      const swatchBtns = slide.querySelectorAll('.swatch-btn');
      swatchBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          swatchBtns.forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
        });
      });

      lineupAccordion.appendChild(slide);
    });

    // Reveal slides staggered when Lineup section scrolls into view
    setupLineupIntersectionObserver();
  }

  function openLineupSlide(activeSlide) {
    const slides = lineupAccordion.querySelectorAll('.lineup-slide');
    slides.forEach(s => {
      const isOpen = s === activeSlide;
      s.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      s.setAttribute('data-cursor-label', isOpen ? 'CONFIGURE' : 'OPEN');
    });

    // Update active cursor label immediately if hovering
    if (cursorEl && cursorEl.classList.contains('is-hovering')) {
      const activeLabel = activeSlide.getAttribute('data-cursor-label') || 'VIEW';
      if (cursorLabelEl) cursorLabelEl.textContent = activeLabel;
    }
  }

  function setupLineupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const slides = lineupAccordion.querySelectorAll('.lineup-slide');
          slides.forEach((slide, i) => {
            setTimeout(() => {
              slide.classList.add('revealed');
            }, i * 80);
          });
          observer.disconnect();
        }
      });
    }, { threshold: 0.15 });

    observer.observe(lineupSection);
  }

  /* ==========================================================================
     9. CUSTOM CURSOR ("THE HEADLIGHT")
     ========================================================================== */

  function setupCursor() {
    if (!cursorEl || !isFinePointer || prefersReducedMotion) return;

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });

    // Interactive element hover detection
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('a, button, [role="button"], [data-cursor-label]');
      if (target) {
        cursorEl.classList.add('is-hovering');
        const label = target.getAttribute('data-cursor-label') || 'VIEW';
        if (cursorLabelEl) cursorLabelEl.textContent = label;
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('a, button, [role="button"], [data-cursor-label]');
      if (target) {
        cursorEl.classList.remove('is-hovering');
      }
    });

    // Mouse down 120ms bright flash
    window.addEventListener('mousedown', () => {
      cursorEl.classList.add('is-clicking');
      setTimeout(() => {
        cursorEl.classList.remove('is-clicking');
      }, CFG.timing.cursorClickBrightMs);
    });
  }

  /* ==========================================================================
     10. FILM-GRAIN OVERLAY GENERATION
     ========================================================================== */

  function setupGrainEffect() {
    if (!grainCanvas) return;
    const ctx = grainCanvas.getContext('2d');
    if (!ctx) return;

    // Create small 128x128 offscreen noise tile
    const tileSize = 128;
    const tile = document.createElement('canvas');
    tile.width = tileSize;
    tile.height = tileSize;
    const tileCtx = tile.getContext('2d');
    const imgData = tileCtx.createImageData(tileSize, tileSize);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const val = Math.floor(Math.random() * 255);
      data[i] = val;     // R
      data[i + 1] = val; // G
      data[i + 2] = val; // B
      data[i + 3] = 255; // A
    }
    tileCtx.putImageData(imgData, 0, 0);

    // Resize grain canvas to viewport
    function resizeGrain() {
      grainCanvas.width = window.innerWidth;
      grainCanvas.height = window.innerHeight;
    }
    resizeGrain();
    window.addEventListener('resize', resizeGrain, { passive: true });

    // Render loop shifting noise tile ~8 times per second (125ms interval)
    setInterval(() => {
      ctx.clearRect(0, 0, grainCanvas.width, grainCanvas.height);
      const pattern = ctx.createPattern(tile, 'repeat');
      if (pattern) {
        // Shift pattern randomly
        const shiftX = Math.floor(Math.random() * tileSize);
        const shiftY = Math.floor(Math.random() * tileSize);
        ctx.save();
        ctx.translate(shiftX, shiftY);
        ctx.fillStyle = pattern;
        ctx.fillRect(-shiftX, -shiftY, grainCanvas.width + tileSize, grainCanvas.height + tileSize);
        ctx.restore();
      }
    }, 1000 / CFG.timing.grainFps);
  }

  /* ==========================================================================
     11. NAVIGATION & DEEP LINKING
     ========================================================================== */

  function setupNavigation() {
    // Smooth scroll for internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });

          // If car target specified, open corresponding lineup slide
          const carTarget = this.getAttribute('data-car-target');
          if (carTarget) {
            const slide = document.getElementById(`slide-${carTarget}`);
            if (slide) openLineupSlide(slide);
          }
        }
      });
    });

    // Reserve CTA button click feedback
    const reserveBtn = document.getElementById('reserve-btn');
    if (reserveBtn) {
      reserveBtn.addEventListener('click', () => {
        const originalLabel = reserveBtn.querySelector('.reserve-btn-label');
        if (originalLabel) {
          originalLabel.textContent = 'ALLOCATION CONFIRMED · BESPOKE STUDIO DISPATCHED';
          setTimeout(() => {
            originalLabel.textContent = 'RESERVE YOUR NOCTIS';
          }, 4000);
        }
      });
    }
  }

  // Launch on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

