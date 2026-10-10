type AudioContextCtor = typeof AudioContext;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const host = window as Window & { webkitAudioContext?: AudioContextCtor };
  const Ctor = window.AudioContext ?? host.webkitAudioContext;
  if (!Ctor) return null;
  return new Ctor();
}

function tone(ctx: AudioContext, start: number, from: number, to: number, duration: number, volume: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(to, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function ringPass() {
  try {
    const ctx = audioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    tone(ctx, now, 620, 980, 0.16, 0.04);
    tone(ctx, now + 0.14, 1318, 880, 0.45, 0.05);
    window.setTimeout(() => void ctx.close(), 900);
  } catch {
    return;
  }
}
