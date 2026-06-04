export interface DistilleryGeo {
  lat: number
  lng: number
  country: string
}

// Handkuratierte Koordinaten bekannter Brennereien (weltweit).
// Schlüssel sind kleingeschrieben; producer-Namen werden gegen diese gematcht.
// Producer ohne Treffer erscheinen einfach nicht auf der Karte.
const DISTILLERIES: Record<string, DistilleryGeo> = {
  // --- Schottland: Islay ---
  'lagavulin': { lat: 55.6357, lng: -6.1264, country: 'Schottland' },
  'laphroaig': { lat: 55.6303, lng: -6.1525, country: 'Schottland' },
  'ardbeg': { lat: 55.6411, lng: -6.1083, country: 'Schottland' },
  'bowmore': { lat: 55.7589, lng: -6.2887, country: 'Schottland' },
  'bruichladdich': { lat: 55.7706, lng: -6.3625, country: 'Schottland' },
  'bunnahabhain': { lat: 55.8839, lng: -6.1339, country: 'Schottland' },
  'caol ila': { lat: 55.8639, lng: -6.1100, country: 'Schottland' },
  'kilchoman': { lat: 55.7794, lng: -6.4119, country: 'Schottland' },
  'ardnahoe': { lat: 55.8772, lng: -6.1086, country: 'Schottland' },

  // --- Schottland: Speyside ---
  'the macallan': { lat: 57.4869, lng: -3.2069, country: 'Schottland' },
  'macallan': { lat: 57.4869, lng: -3.2069, country: 'Schottland' },
  'glenfiddich': { lat: 57.4569, lng: -3.1283, country: 'Schottland' },
  'the glenlivet': { lat: 57.3322, lng: -3.2858, country: 'Schottland' },
  'glenlivet': { lat: 57.3322, lng: -3.2858, country: 'Schottland' },
  'the balvenie': { lat: 57.4581, lng: -3.1247, country: 'Schottland' },
  'balvenie': { lat: 57.4581, lng: -3.1247, country: 'Schottland' },
  'aberlour': { lat: 57.4694, lng: -3.2244, country: 'Schottland' },
  'glenfarclas': { lat: 57.4411, lng: -3.2769, country: 'Schottland' },
  'cardhu': { lat: 57.4458, lng: -3.3389, country: 'Schottland' },
  'glen grant': { lat: 57.5328, lng: -3.2186, country: 'Schottland' },
  'mortlach': { lat: 57.4408, lng: -3.1228, country: 'Schottland' },
  'craigellachie': { lat: 57.4858, lng: -3.1986, country: 'Schottland' },
  'benriach': { lat: 57.6219, lng: -3.2772, country: 'Schottland' },
  'tamdhu': { lat: 57.4519, lng: -3.3431, country: 'Schottland' },
  'speyburn': { lat: 57.5675, lng: -3.2122, country: 'Schottland' },
  'glenrothes': { lat: 57.4953, lng: -3.1739, country: 'Schottland' },
  'glen moray': { lat: 57.6431, lng: -3.3258, country: 'Schottland' },

  // --- Schottland: Highland ---
  'glenmorangie': { lat: 57.8244, lng: -4.0700, country: 'Schottland' },
  'the dalmore': { lat: 57.6939, lng: -4.2614, country: 'Schottland' },
  'dalmore': { lat: 57.6939, lng: -4.2614, country: 'Schottland' },
  'oban': { lat: 56.4147, lng: -5.4719, country: 'Schottland' },
  'old pulteney': { lat: 58.4408, lng: -3.0900, country: 'Schottland' },
  'clynelish': { lat: 58.0011, lng: -3.8650, country: 'Schottland' },
  'aberfeldy': { lat: 56.6203, lng: -3.8597, country: 'Schottland' },
  'dalwhinnie': { lat: 56.9344, lng: -4.2406, country: 'Schottland' },
  'tomatin': { lat: 57.3403, lng: -4.0125, country: 'Schottland' },
  'glendronach': { lat: 57.5050, lng: -2.6519, country: 'Schottland' },
  'glengoyne': { lat: 56.0356, lng: -4.3922, country: 'Schottland' },
  'royal brackla': { lat: 57.5364, lng: -3.8639, country: 'Schottland' },

  // --- Schottland: Lowland ---
  'auchentoshan': { lat: 55.9222, lng: -4.4350, country: 'Schottland' },
  'glenkinchie': { lat: 55.8919, lng: -2.9078, country: 'Schottland' },
  'bladnoch': { lat: 54.8636, lng: -4.4361, country: 'Schottland' },

  // --- Schottland: Campbeltown ---
  'springbank': { lat: 55.4267, lng: -5.6053, country: 'Schottland' },
  'glen scotia': { lat: 55.4258, lng: -5.6072, country: 'Schottland' },

  // --- Schottland: Inseln ---
  'talisker': { lat: 57.3022, lng: -6.3567, country: 'Schottland' },
  'highland park': { lat: 58.9558, lng: -2.9389, country: 'Schottland' },
  'scapa': { lat: 58.9450, lng: -2.9622, country: 'Schottland' },
  'isle of jura': { lat: 55.8556, lng: -5.9569, country: 'Schottland' },
  'jura': { lat: 55.8556, lng: -5.9569, country: 'Schottland' },
  'arran': { lat: 55.7008, lng: -5.3175, country: 'Schottland' },
  'tobermory': { lat: 56.6231, lng: -6.0697, country: 'Schottland' },

  // --- Irland ---
  'bushmills': { lat: 55.2058, lng: -6.5181, country: 'Irland' },
  'midleton': { lat: 51.9156, lng: -8.1736, country: 'Irland' },
  'jameson': { lat: 51.9156, lng: -8.1736, country: 'Irland' },
  'redbreast': { lat: 51.9156, lng: -8.1736, country: 'Irland' },
  'teeling': { lat: 53.3375, lng: -6.2767, country: 'Irland' },
  'dingle': { lat: 52.1394, lng: -10.2789, country: 'Irland' },
  'tullamore': { lat: 53.2736, lng: -7.4894, country: 'Irland' },

  // --- USA ---
  'buffalo trace': { lat: 38.2161, lng: -84.8650, country: 'USA' },
  "maker's mark": { lat: 37.6469, lng: -85.3492, country: 'USA' },
  'makers mark': { lat: 37.6469, lng: -85.3492, country: 'USA' },
  'jim beam': { lat: 37.9156, lng: -85.6097, country: 'USA' },
  'wild turkey': { lat: 38.0086, lng: -84.7783, country: 'USA' },
  'woodford reserve': { lat: 38.1456, lng: -84.8011, country: 'USA' },
  'heaven hill': { lat: 37.6850, lng: -85.4639, country: 'USA' },
  'four roses': { lat: 38.0469, lng: -84.9756, country: 'USA' },
  "jack daniel's": { lat: 35.2828, lng: -86.3653, country: 'USA' },
  'jack daniels': { lat: 35.2828, lng: -86.3653, country: 'USA' },

  // --- Japan ---
  'yamazaki': { lat: 34.8939, lng: 135.6739, country: 'Japan' },
  'hakushu': { lat: 35.8689, lng: 138.3344, country: 'Japan' },
  'yoichi': { lat: 43.1981, lng: 140.7728, country: 'Japan' },
  'miyagikyo': { lat: 38.3439, lng: 140.7269, country: 'Japan' },
  'chichibu': { lat: 35.9919, lng: 139.0789, country: 'Japan' },
  'fuji gotemba': { lat: 35.3589, lng: 138.9100, country: 'Japan' },
  'mars shinshu': { lat: 35.7264, lng: 137.9508, country: 'Japan' },

  // --- Kanada ---
  'crown royal': { lat: 50.6347, lng: -96.9892, country: 'Kanada' },
  'canadian club': { lat: 42.3149, lng: -83.0364, country: 'Kanada' },

  // --- Übrige Welt ---
  'penderyn': { lat: 51.7449, lng: -3.5664, country: 'Wales' },
  'mackmyra': { lat: 60.6749, lng: 17.1413, country: 'Schweden' },
  'kavalan': { lat: 24.7461, lng: 121.7561, country: 'Taiwan' },
  'amrut': { lat: 12.9716, lng: 77.5946, country: 'Indien' },
  'paul john': { lat: 15.3860, lng: 73.9100, country: 'Indien' },
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

export function lookupDistillery(producer: string | null): DistilleryGeo | null {
  if (!producer) return null
  const key = normalize(producer)
  if (DISTILLERIES[key]) return DISTILLERIES[key]
  // Fuzzy: producer enthält einen bekannten Brennerei-Namen (oder umgekehrt)
  for (const [name, geo] of Object.entries(DISTILLERIES)) {
    if (key.includes(name) || name.includes(key)) return geo
  }
  return null
}
