export interface Racer {
  id: string;
  name: string;
  number: number;
  team: string;
  hue: number; // for color tinting
}

export interface Track {
  id: string;
  name: string;
  length_km: number;
  sectorSplit: [number, number, number]; // proportions summing to 1
}

export const RACERS: Racer[] = [
  { id: "r-marquez", name: "M. Reyes", number: 7, team: "Apex Racing", hue: 18 },
  { id: "r-quartararo", name: "L. Vance", number: 21, team: "Crimson Moto", hue: 350 },
  { id: "r-bagnaia", name: "F. Bianchi", number: 63, team: "Volta GP", hue: 200 },
  { id: "r-aldeguer", name: "J. Aldez", number: 54, team: "Apex Racing", hue: 38 },
  { id: "r-acosta", name: "P. Costa", number: 31, team: "Volta GP", hue: 280 },
  { id: "r-binder", name: "K. Binder", number: 33, team: "Crimson Moto", hue: 120 },
];

export const FIELD: Racer = {
  id: "field",
  name: "Field Median",
  number: 0,
  team: "All racers",
  hue: 180,
};

export const TRACKS: Track[] = [
  { id: "t-laguna", name: "Laguna Seca", length_km: 3.602, sectorSplit: [0.32, 0.34, 0.34] },
  { id: "t-mugello", name: "Mugello", length_km: 5.245, sectorSplit: [0.30, 0.36, 0.34] },
  { id: "t-cota", name: "Circuit of the Americas", length_km: 5.513, sectorSplit: [0.34, 0.33, 0.33] },
  { id: "t-phillip", name: "Phillip Island", length_km: 4.448, sectorSplit: [0.31, 0.35, 0.34] },
];

export const SESSIONS = ["Practice", "Qualifying", "Race"] as const;
export type Session = (typeof SESSIONS)[number];

export interface TelemetryFrame {
  t: number;
  speed: number;        // km/h
  rpm: number;
  throttle: number;     // %
  brake: number;        // %
  lean: number;         // deg, signed
  gLat: number;         // g
  gLong: number;        // g
  gear: number;         // 1-6
  tireTemp: number;     // °C
  trackPos: number;     // 0..1 fraction around lap
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const drift = (prev: number, min: number, max: number, vol: number) => {
  const d = (Math.random() - 0.5) * vol;
  return clamp(prev + d, min, max);
};

// Hash to seed per-racer offsets
function seed(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function makeInitialFrame(racerId: string): TelemetryFrame {
  const s = seed(racerId);
  return {
    t: Date.now(),
    speed: 140 + (s % 30),
    rpm: 9500 + (s % 1500),
    throttle: 70,
    brake: 0,
    lean: ((s % 40) - 20),
    gLat: 0.5,
    gLong: 0.2,
    gear: 4,
    tireTemp: 88 + (s % 8),
    trackPos: (s % 1000) / 1000,
  };
}

export function nextFrame(prev: TelemetryFrame, racerId: string): TelemetryFrame {
  const skill = 0.5 + ((seed(racerId) % 50) / 100); // 0.5..1.0
  // Phase: cycle through accelerate / brake / corner using time-based modulation
  const phase = (Date.now() / 4000 + seed(racerId)) % (Math.PI * 2);
  const cornerPressure = (Math.sin(phase) + 1) / 2; // 0..1

  const targetThrottle = (1 - cornerPressure) * 100 * skill;
  const targetBrake = cornerPressure > 0.6 ? (cornerPressure - 0.6) * 250 : 0;
  const targetLean = Math.sin(phase * 1.7) * 58 * skill;

  const throttle = drift(prev.throttle, 0, 100, 14) * 0.6 + targetThrottle * 0.4;
  const brake = drift(prev.brake, 0, 100, 18) * 0.6 + targetBrake * 0.4;
  const lean = drift(prev.lean, -62, 62, 10) * 0.5 + targetLean * 0.5;

  const speedDelta = (throttle - brake) * 0.08;
  const speed = clamp(prev.speed + speedDelta + (Math.random() - 0.5) * 4, 40, 340);

  const rpm = clamp(4000 + (speed / 340) * 12000 + (Math.random() - 0.5) * 400, 4000, 16500);
  const gear = Math.max(1, Math.min(6, Math.round(1 + (speed / 340) * 5)));

  const gLat = clamp((lean / 62) * 2.4 + (Math.random() - 0.5) * 0.15, -2.4, 2.4);
  const gLong = clamp(speedDelta / 4 + (Math.random() - 0.5) * 0.1, -1.8, 1.6);

  const tireTemp = clamp(
    prev.tireTemp + Math.abs(gLat) * 0.3 - 0.15 + (Math.random() - 0.5) * 0.4,
    60,
    115
  );

  const trackPos = (prev.trackPos + speed / 36000) % 1;

  return {
    t: Date.now(),
    speed,
    rpm,
    throttle: clamp(throttle, 0, 100),
    brake: clamp(brake, 0, 100),
    lean,
    gLat,
    gLong,
    gear,
    tireTemp,
    trackPos,
  };
}

export const CHANNELS = [
  { key: "speed", label: "Speed", unit: "KM/H", domain: [0, 340] as [number, number] },
  { key: "rpm", label: "RPM", unit: "", domain: [0, 16500] as [number, number] },
  { key: "throttle", label: "Throttle", unit: "%", domain: [0, 100] as [number, number] },
  { key: "brake", label: "Brake", unit: "%", domain: [0, 100] as [number, number] },
  { key: "lean", label: "Lean", unit: "°", domain: [-65, 65] as [number, number] },
  { key: "gLat", label: "G-Lat", unit: "G", domain: [-2.5, 2.5] as [number, number] },
] as const;

export type ChannelKey = (typeof CHANNELS)[number]["key"];
