export interface FontConfig {
  name: string;
  regularUrl: string;
  boldUrl: string;
  previewText: string;
  cssFont: string;
}

export const FONTS: Record<string, FontConfig> = {
  optimer: {
    name: "Optimer",
    regularUrl:
      "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/fonts/optimer_regular.typeface.json",
    boldUrl:
      "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/fonts/optimer_bold.typeface.json",
    previewText: "Optimer",
    cssFont: "'Nunito Sans', 'Trebuchet MS', Arial, sans-serif",
  },
  helvetiker: {
    name: "Helvetiker",
    regularUrl:
      "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/fonts/helvetiker_regular.typeface.json",
    boldUrl:
      "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/fonts/helvetiker_bold.typeface.json",
    previewText: "Helvetiker",
    cssFont: "Arial, Helvetica, sans-serif",
  },
  gentilis: {
    name: "Gentilis",
    regularUrl:
      "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/fonts/gentilis_regular.typeface.json",
    boldUrl:
      "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/fonts/gentilis_bold.typeface.json",
    previewText: "Gentilis",
    cssFont: "Georgia, 'Times New Roman', Times, serif",
  },
  droid_sans: {
    name: "Droid Sans",
    regularUrl:
      "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/fonts/droid/droid_sans_regular.typeface.json",
    boldUrl:
      "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/fonts/droid/droid_sans_bold.typeface.json",
    previewText: "Droid Sans",
    cssFont: "'Open Sans', 'Droid Sans', Arial, sans-serif",
  },
  droid_serif: {
    name: "Droid Serif",
    regularUrl:
      "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/fonts/droid/droid_serif_regular.typeface.json",
    boldUrl:
      "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/fonts/droid/droid_serif_bold.typeface.json",
    previewText: "Droid Serif",
    cssFont: "'Droid Serif', Georgia, serif",
  },
  // Adding creative variations using the existing working fonts with different styling
  modern_sans: {
    name: "Modern Sans",
    regularUrl:
      "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/fonts/optimer_regular.typeface.json",
    boldUrl:
      "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/fonts/optimer_bold.typeface.json",
    previewText: "Modern Sans",
    cssFont:
      "'Segoe UI', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  tech_display: {
    name: "Tech Display",
    regularUrl:
      "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/fonts/helvetiker_regular.typeface.json",
    boldUrl:
      "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/fonts/helvetiker_bold.typeface.json",
    previewText: "Tech Display",
    cssFont: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace",
  },
  classic_serif: {
    name: "Classic Serif",
    regularUrl:
      "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/fonts/gentilis_regular.typeface.json",
    boldUrl:
      "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/fonts/gentilis_bold.typeface.json",
    previewText: "Classic Serif",
    cssFont: "'Crimson Text', 'Playfair Display', Georgia, serif",
  },
};

// Default font configuration
export const DEFAULT_FONT_KEY = "optimer";
export const DEFAULT_FONT_URL = FONTS[DEFAULT_FONT_KEY].boldUrl; // Default to bold for better 3D visibility
