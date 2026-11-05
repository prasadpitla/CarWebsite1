/**
 * NOCTIS — Configuration & Scrollytelling Parameters
 * All frame sequences, section scroll heights, chapter timings,
 * HUD telemetry limits, and callout coordinates are defined here.
 */

const NOCTIS_CONFIG = {
  // Brand identity
  brand: {
    name: 'NOCTIS',
    tagline: 'Drive the night.',
    year: '2026'
  },

  // Image sequence configurations
  sequences: {
    hero: {
      desktop: {
        pathPattern: 'assets/frames/hero/frame_{index}.webp',
        width: 1600,
        quality: 78
      },
      mobile: {
        pathPattern: 'assets/frames/hero-mobile/frame_{index}.webp',
        width: 960,
        quality: 72
      },
      frameCount: 450,
      wrapperHeightVh: 600, // Section height in vh for scroll scrubbing
      preloadInitial: 40    // Frames to decode before preloader dismisses
    },
    dismantle: {
      desktop: {
        pathPattern: 'assets/frames/dismantle/frame_{index}.webp',
        width: 1600,
        quality: 78
      },
      mobile: {
        pathPattern: 'assets/frames/dismantle-mobile/frame_{index}.webp',
        width: 960,
        quality: 72
      },
      frameCount: 150,
      wrapperHeightVh: 350, // Section height in vh for scroll scrubbing
      preloadInitial: 15
    }
  },

  // Hero section chapter intervals (normalized scroll progress 0.0 to 1.0)
  heroChapters: [
    {
      id: 'chapter-1',
      indexLabel: '01/04',
      range: [0.00, 0.12],
      title: 'NOCTIS',
      subtitle: 'The city is asleep.',
      hint: 'SCROLL TO WAKE IT'
    },
    {
      id: 'chapter-2',
      indexLabel: '02/04',
      range: [0.22, 0.40],
      title: "It doesn't need the city's light.",
      subtitle: ''
    },
    {
      id: 'chapter-3',
      indexLabel: '03/04',
      range: [0.50, 0.68],
      title: 'It brings its own.',
      subtitle: ''
    },
    {
      id: 'chapter-4',
      indexLabel: '04/04',
      range: [0.80, 1.00],
      title: 'GT-E',
      specs: '0–100 KM/H 3.1S · 640 KM RANGE · DUAL MOTOR',
      ctaText: 'Discover the GT-E',
      ctaTarget: '#lineup'
    }
  ],

  // Left-edge HUD telemetry bounds
  hud: {
    maxSpeedKmH: 118,
    maxDistanceKm: 4.2
  },

  // Dismantle interactive callouts (revealed past 70% scroll progress: 0.70 to 1.0)
  dismantleCallouts: [
    {
      id: 'callout-body',
      label: 'BODY',
      desc: 'Carbon composite monocoque',
      triggerProgress: 0.72,
      // Coordinates in percentage relative to stage canvas container (0-100)
      dotX: 38,
      dotY: 34,
      lineLength: 70,
      lineAngleDeg: -35, // Angle of connecting hairline
      textAlign: 'left'
    },
    {
      id: 'callout-battery',
      label: 'BATTERY',
      desc: '110 kWh structural pack',
      triggerProgress: 0.79,
      dotX: 53,
      dotY: 66,
      lineLength: 80,
      lineAngleDeg: 45,
      textAlign: 'left'
    },
    {
      id: 'callout-drive',
      label: 'DRIVE',
      desc: 'Dual axial-flux motors, 680 kW',
      triggerProgress: 0.86,
      dotX: 68,
      dotY: 52,
      lineLength: 75,
      lineAngleDeg: -25,
      textAlign: 'left'
    },
    {
      id: 'callout-light',
      label: 'LIGHT',
      desc: 'Single-line LED signature',
      triggerProgress: 0.93,
      dotX: 28,
      dotY: 53,
      lineLength: 75,
      lineAngleDeg: 140,
      textAlign: 'right'
    }
  ],

  // Lineup vehicles
  lineup: [
    {
      id: 'gt-e',
      num: '01',
      name: 'GT-E',
      tagline: 'The grand tourer.',
      summary: 'Pure gran turismo architecture sculpted around quiet aerodynamic force.',
      specs: {
        range: '640 KM',
        accel: '3.1 S',
        power: '680 KW'
      },
      image: 'assets/cars/gt-e.webp',
      alt: 'NOCTIS GT-E matte graphite grand tourer coupe side profile',
      swatches: ['#181A1F', '#EDEAE4', '#111D33', '#E1251B'],
      isDefaultOpen: true
    },
    {
      id: 's',
      num: '02',
      name: 'S',
      tagline: 'Four doors, no compromise.',
      summary: 'Executive sports sedan engineered with active air suspension and silent acceleration.',
      specs: {
        range: '600 KM',
        accel: '3.6 S',
        power: '520 KW'
      },
      image: 'assets/cars/s.webp',
      alt: 'NOCTIS S satin bone white sport sedan side profile',
      swatches: ['#EDEAE4', '#181A1F', '#20252D', '#7E8590'],
      isDefaultOpen: false
    },
    {
      id: 'x',
      num: '03',
      name: 'X',
      tagline: 'Higher, never heavier.',
      summary: 'Elevated coupe proportion with low-gravity battery placement and terrain telemetry.',
      specs: {
        range: '560 KM',
        accel: '4.2 S',
        power: '480 KW'
      },
      image: 'assets/cars/x.webp',
      alt: 'NOCTIS X midnight blue SUV coupe side profile',
      swatches: ['#111D33', '#181A1F', '#EDEAE4', '#2C3440'],
      isDefaultOpen: false
    },
    {
      id: 'r',
      num: '04',
      name: 'R',
      tagline: 'Built for the track.',
      summary: 'Aggressive carbon fiber aero, inverted track downforce, and track-calibrated dual motors.',
      specs: {
        range: '420 KM',
        accel: '2.4 S',
        power: '900 KW'
      },
      image: 'assets/cars/r.webp',
      alt: 'NOCTIS R satin black track coupe with red accents side profile',
      swatches: ['#0D0E12', '#E1251B', '#EDEAE4', '#262930'],
      isDefaultOpen: false
    },
    {
      id: 'one',
      num: '05',
      name: 'ONE',
      tagline: 'The future, early.',
      summary: 'Ultra-low hypercar archetype with solid-state energy cells and active aerodynamic wake.',
      specs: {
        range: '850 KM',
        accel: '1.8 S',
        power: '1200 KW'
      },
      image: 'assets/cars/one.webp',
      alt: 'NOCTIS ONE liquid silver concept hypercar side profile',
      swatches: ['#D8DEE9', '#0D0E12', '#CFE3FF', '#4C566A'],
      isDefaultOpen: false
    }
  ],

  // Animation constants
  timing: {
    cursorLerp: 0.18,
    frameLerp: 0.15,
    hoverDebounceMs: 80,
    cursorClickBrightMs: 120,
    grainFps: 8
  }
};

// Export to window scope for vanilla JS usage
if (typeof window !== 'undefined') {
  window.NOCTIS_CONFIG = NOCTIS_CONFIG;
}

