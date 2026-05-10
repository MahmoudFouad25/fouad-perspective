/* Tweaks for Reignite course detail — palette, typography, density */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "ember",
  "density": "default",
  "displayFont": "cormorant",
  "showAccentBloom": true
}/*EDITMODE-END*/;

const PALETTES = {
  ember: {
    label: "Ember & Paper",
    swatch: ["#f5efe6", "#1c1814", "#c25c2a"],
    vars: {
      "--paper":      "oklch(0.976 0.006 75)",
      "--paper-soft": "oklch(0.955 0.01 75)",
      "--ink":        "oklch(0.18 0.015 35)",
      "--ember":      "oklch(0.58 0.135 38)",
      "--ember-deep": "oklch(0.45 0.13 35)",
      "--ember-soft": "oklch(0.93 0.03 55)",
      "--night":      "oklch(0.16 0.014 40)"
    }
  },
  ink: {
    label: "Ink & Bone",
    swatch: ["#efece4", "#0e0f10", "#3b6f6a"],
    vars: {
      "--paper":      "oklch(0.97 0.005 95)",
      "--paper-soft": "oklch(0.95 0.006 95)",
      "--ink":        "oklch(0.14 0.01 240)",
      "--ember":      "oklch(0.5 0.07 175)",
      "--ember-deep": "oklch(0.38 0.06 175)",
      "--ember-soft": "oklch(0.93 0.02 175)",
      "--night":      "oklch(0.13 0.01 240)"
    }
  },
  rose: {
    label: "Rose Brick",
    swatch: ["#f4ece8", "#241818", "#a23a3a"],
    vars: {
      "--paper":      "oklch(0.97 0.008 30)",
      "--paper-soft": "oklch(0.95 0.012 30)",
      "--ink":        "oklch(0.18 0.018 25)",
      "--ember":      "oklch(0.5 0.14 25)",
      "--ember-deep": "oklch(0.4 0.13 25)",
      "--ember-soft": "oklch(0.93 0.03 25)",
      "--night":      "oklch(0.16 0.018 25)"
    }
  },
  noir: {
    label: "Inverted · Night",
    swatch: ["#13110f", "#f3ece1", "#d68a47"],
    vars: {
      "--paper":      "oklch(0.16 0.014 40)",
      "--paper-soft": "oklch(0.2 0.014 40)",
      "--paper-deep": "oklch(0.24 0.014 40)",
      "--ink":        "oklch(0.95 0.01 70)",
      "--ink-soft":   "oklch(0.85 0.012 60)",
      "--ink-muted":  "oklch(0.65 0.012 60)",
      "--ink-faint":  "oklch(0.45 0.01 60)",
      "--rule":       "oklch(0.32 0.014 40)",
      "--rule-soft":  "oklch(0.26 0.014 40)",
      "--ember":      "oklch(0.72 0.13 55)",
      "--ember-deep": "oklch(0.6 0.13 50)",
      "--ember-soft": "oklch(0.3 0.05 50)",
      "--night":      "oklch(0.1 0.014 40)"
    }
  }
};

const DISPLAY_FONTS = {
  cormorant: { label: "Cormorant", stack: '"Cormorant Garamond", "Times New Roman", serif' },
  fraunces:  { label: "EB Garamond", stack: '"EB Garamond", "Times New Roman", serif' },
  syne:      { label: "Syne (sans display)", stack: '"Syne", "IBM Plex Sans Arabic", sans-serif' }
};

function applyPalette(name) {
  const p = PALETTES[name] || PALETTES.ember;
  const root = document.documentElement;
  // Reset previously-applied vars to avoid leakage between palettes
  Object.keys(PALETTES).forEach(k => {
    Object.keys(PALETTES[k].vars).forEach(v => root.style.removeProperty(v));
  });
  Object.entries(p.vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

function applyDisplayFont(name) {
  const f = DISPLAY_FONTS[name] || DISPLAY_FONTS.cormorant;
  document.documentElement.style.setProperty("--serif", f.stack);
  // Lazy-load EB Garamond / Syne if needed
  if (name === "fraunces" && !document.getElementById("font-ebg")) {
    const l = document.createElement("link");
    l.id = "font-ebg";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap";
    document.head.appendChild(l);
  }
  if (name === "syne" && !document.getElementById("font-syne")) {
    const l = document.createElement("link");
    l.id = "font-syne";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700&display=swap";
    document.head.appendChild(l);
  }
}

function applyDensity(name) {
  document.documentElement.dataset.density = (name === "default") ? "" : name;
}

function applyBloom(on) {
  // Toggle the hero radial bloom by toggling a class
  document.body.classList.toggle("no-bloom", !on);
}

const reignitePanelStyle = document.createElement("style");
reignitePanelStyle.textContent = `
  body.no-bloom .hero::after { display: none !important; }
`;
document.head.appendChild(reignitePanelStyle);

function ReigniteTweaks() {
  const t = useTweaks(TWEAK_DEFAULTS);
  const setTweak = t.setTweak;

  React.useEffect(() => { applyPalette(t.palette); }, [t.palette]);
  React.useEffect(() => { applyDisplayFont(t.displayFont); }, [t.displayFont]);
  React.useEffect(() => { applyDensity(t.density); }, [t.density]);
  React.useEffect(() => { applyBloom(t.showAccentBloom); }, [t.showAccentBloom]);

  return (
    <TweaksPanel title="Tweaks · Reignite">
      <TweakSection title="Palette">
        <TweakColor
          tweak="palette"
          value={t.palette}
          onChange={(v) => setTweak("palette", v)}
          options={Object.entries(PALETTES).map(([k, v]) => ({
            value: k, label: v.label, color: v.swatch
          }))}
        />
      </TweakSection>

      <TweakSection title="Display typeface">
        <TweakSelect
          value={t.displayFont}
          onChange={(v) => setTweak("displayFont", v)}
          options={Object.entries(DISPLAY_FONTS).map(([k, v]) => ({ value: k, label: v.label }))}
        />
      </TweakSection>

      <TweakSection title="Density">
        <TweakRadio
          value={t.density}
          onChange={(v) => setTweak("density", v)}
          options={[
            { value: "compact", label: "Compact" },
            { value: "default", label: "Default" },
            { value: "airy",    label: "Airy" }
          ]}
        />
      </TweakSection>

      <TweakSection title="Hero bloom">
        <TweakToggle
          value={t.showAccentBloom}
          onChange={(v) => setTweak("showAccentBloom", v)}
          label="Ember radial bloom"
        />
      </TweakSection>
    </TweaksPanel>
  );
}

const reigniteRoot = ReactDOM.createRoot(document.getElementById("tweaks-root"));
reigniteRoot.render(<ReigniteTweaks />);
