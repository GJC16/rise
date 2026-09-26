'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';

// ── Types ─────────────────────────────────────────────────────────────────────
interface SensorData {
  temperature: number | null;
  humidity: number | null;
  distance: number | null;
  motion: boolean | null;
  updatedAt: string | null;
}

interface DecisionData {
  servoAngle: number;
  bulb1: boolean;
  bulb2: boolean;
  blink: boolean;
  mode: 'auto' | 'manual';
  updatedAt: string | null;
}

// ── Shared styles (mirrors admin/student exactly) ─────────────────────────────
const sharedStyles = `
  * { scrollbar-width: none; }
  *::-webkit-scrollbar { display: none; }

  :root { font-family: 'Arial Narrow', 'Impact', 'Haettenschweiler', Arial, sans-serif; }

  @keyframes spin-cw  { to { transform: rotate(360deg);  } }
  @keyframes spin-ccw { to { transform: rotate(-360deg); } }
  @keyframes pulse-glow { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
  @keyframes ticker { 0% { transform:translateX(0); } 100% { transform:translateX(-50%); } }
  @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.2; } }

  @keyframes glitch-1 {
    0%,100% { clip-path: inset(0 0 98% 0); transform: translate(-4px); }
    50%      { clip-path: inset(30% 0 50% 0); transform: translate(4px); }
  }
  @keyframes glitch-2 {
    0%,100% { clip-path: inset(60% 0 20% 0); transform: translate(3px); }
    50%      { clip-path: inset(10% 0 80% 0); transform: translate(-3px); }
  }

  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }

  @keyframes dataFlash {
    0%   { opacity: 1; }
    30%  { opacity: 0.4; }
    60%  { opacity: 1; }
  }
  .data-flash { animation: dataFlash 0.4s ease; }

  @keyframes actToggle {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.06); }
    100% { transform: scale(1); }
  }
  .act-toggle { animation: actToggle 0.3s cubic-bezier(0.34,1.56,0.64,1); }

  .scanline-bar {
    position:fixed; inset:0; pointer-events:none; z-index:50;
    background:linear-gradient(transparent 50%, rgba(0,0,0,0.04) 50%);
    background-size:100% 4px;
  }
  .noise-overlay {
    position:fixed; inset:0; pointer-events:none; z-index:49; opacity:0.025;
    background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  .stat-pill {
    font-family:'Share Tech Mono',monospace;
    clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
  }
  .corner-tl { position:absolute;top:0;left:0;width:12px;height:12px;border-top:1px solid #7c3aed;border-left:1px solid #7c3aed; }
  .corner-tr { position:absolute;top:0;right:0;width:12px;height:12px;border-top:1px solid #7c3aed;border-right:1px solid #7c3aed; }
  .corner-bl { position:absolute;bottom:0;left:0;width:12px;height:12px;border-bottom:1px solid #7c3aed;border-left:1px solid #7c3aed; }
  .corner-br { position:absolute;bottom:0;right:0;width:12px;height:12px;border-bottom:1px solid #7c3aed;border-right:1px solid #7c3aed; }
  .clip-btn {
    clip-path:polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%);
    font-family:'Share Tech Mono',monospace;
    letter-spacing:0.15em; text-transform:uppercase; transition:all 0.2s;
  }
  .clip-btn:hover  { filter:brightness(1.2); transform:translateY(-1px); }
  .clip-btn:active { transform:translateY(0); }
  .shimmer-text {
    background: linear-gradient(105deg, #c4b5fd 30%, #ffffff 50%, #c4b5fd 70%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 4s linear infinite;
  }

  .sensor-bar-track {
    width: 100%;
    height: 4px;
    background: rgba(124,58,237,0.12);
    position: relative;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
  }
  .sensor-bar-fill {
    height: 100%;
    transition: width 0.8s cubic-bezier(0.4,0,0.2,1);
  }

  .act-btn {
    clip-path:polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%);
    font-family:'Share Tech Mono',monospace;
    letter-spacing:0.12em;
    text-transform:uppercase;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }
  .act-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .act-btn:not(:disabled):hover { filter: brightness(1.15); transform: translateY(-1px); }
  .act-btn:not(:disabled):active { transform: translateY(0); }

  @keyframes blinkFast { 0%,100% { opacity:1; } 50% { opacity:0.25; } }
  .blink-fast { animation: blinkFast 0.5s step-end infinite; }

  .servo-track {
    width: 100%;
    height: 8px;
    background: rgba(124,58,237,0.1);
    border-radius: 4px;
    position: relative;
    overflow: hidden;
  }
  .servo-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
  }
`;

// ── Sensor helpers ────────────────────────────────────────────────────────────
const fmt = (v: number | null, unit: string) =>
  v === null ? '—' : `${v}${unit}`;

const clamp01 = (v: number, min: number, max: number) =>
  Math.min(1, Math.max(0, (v - min) / (max - min)));

function timeSince(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 5)  return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ── Thresholds (must mirror lib/decisionEngine.ts) ────────────────────────────
const TEMP_THRESHOLD = 28;
const HUMIDITY_THRESHOLD = 60;
const DISTANCE_THRESHOLD = 15;

export default function IoTPage() {
  const { user, role, loading } = useAuth('student');
  const router = useRouter();

  const [teamId, setTeamId]       = useState<string | null>(null);
  const [teamCode, setTeamCode]   = useState<string | null>(null);
  const [teamName, setTeamName]   = useState<string | null>(null);
  const [pageReady, setPageReady] = useState(false);

  const [sensors, setSensors] = useState<SensorData>({
    temperature: null, humidity: null,
    distance: null, motion: null, updatedAt: null,
  });
  const [decision, setDecision] = useState<DecisionData>({
    servoAngle: 0, bulb1: false, bulb2: false, blink: false, mode: 'auto', updatedAt: null,
  });

  const [overrideLoading, setOverrideLoading] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // for "last updated" clock

  // ── Tick for relative time display ───────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  // ── Resolve teamId from user doc ──────────────────────────────────────────
  useEffect(() => {
    if (!user || loading) return;
    const resolve = async () => {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists() || !userDoc.data().teamId) {
        router.replace('/student');
        return;
      }
      const tid = userDoc.data().teamId as string;
      const tc  = userDoc.data().teamCode as string;
      const teamDoc = await getDoc(doc(db, 'teams', tid));
      setTeamId(tid);
      setTeamCode(tc);
      setTeamName(teamDoc.exists() ? teamDoc.data()?.teamName : null);
      setPageReady(true);
    };
    resolve();
  }, [user, loading]);

  // ── Live sensor subscription ──────────────────────────────────────────────
  useEffect(() => {
    if (!teamId) return;
    const unsub = onSnapshot(doc(db, 'teams', teamId, 'iot', 'live'), (snap) => {
      if (snap.exists()) setSensors(snap.data() as SensorData);
    });
    return unsub;
  }, [teamId]);

  // ── Live decision subscription ────────────────────────────────────────────
  useEffect(() => {
    if (!teamId) return;
    const unsub = onSnapshot(doc(db, 'teams', teamId, 'iot', 'decision'), (snap) => {
      if (snap.exists()) setDecision(snap.data() as DecisionData);
    });
    return unsub;
  }, [teamId]);

  // ── Manual override write ─────────────────────────────────────────────────
  const setMode = async (mode: 'auto' | 'manual') => {
    if (!teamId) return;
    setOverrideLoading('mode');
    try {
      await setDoc(
        doc(db, 'teams', teamId, 'iot', 'decision'),
        { mode, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } finally {
      setOverrideLoading(null);
    }
  };

  const toggleBulb = async (key: 'bulb1' | 'bulb2') => {
    if (!teamId || decision.mode !== 'manual') return;
    setOverrideLoading(key);
    try {
      await setDoc(
        doc(db, 'teams', teamId, 'iot', 'decision'),
        { [key]: !decision[key], blink: false, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } finally {
      setOverrideLoading(null);
    }
  };

  const setServo = async (angle: 0 | 180) => {
    if (!teamId || decision.mode !== 'manual') return;
    setOverrideLoading('servo');
    try {
      await setDoc(
        doc(db, 'teams', teamId, 'iot', 'decision'),
        { servoAngle: angle, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } finally {
      setOverrideLoading(null);
    }
  };

  const toggleManualBlink = async () => {
    if (!teamId || decision.mode !== 'manual') return;
    setOverrideLoading('blink');
    try {
      await setDoc(
        doc(db, 'teams', teamId, 'iot', 'decision'),
        { blink: !decision.blink, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } finally {
      setOverrideLoading(null);
    }
  };

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading || !pageReady) return (
    <div className="min-h-screen flex items-center justify-center bg-[#030108]">
      <style>{sharedStyles}</style>
      <div className="scanline-bar" />
      <div className="noise-overlay" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.15]"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)', filter: 'blur(100px)' }} />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative w-24 h-24">
          <div style={{ animation: 'spin-cw 1.4s linear infinite' }}
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#7c3aed] border-r-[#7c3aed]" />
          <div style={{ animation: 'spin-ccw 1s linear infinite' }}
            className="absolute inset-3 rounded-full border-2 border-transparent border-t-[#6b21a8] border-l-[#6b21a8]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-[#7c3aed]"
              style={{ boxShadow: '0 0 12px #7c3aed, 0 0 24px #7c3aed' }} />
          </div>
        </div>
        <div className="text-center">
          <p className="text-white font-black text-2xl uppercase tracking-[0.25em]"
            style={{ textShadow: '0 0 20px rgba(124,58,237,0.7)' }}>RISE 2026</p>
          <p className="text-[#7c3aed]/50 font-mono text-xs tracking-[0.4em] mt-2 uppercase">Loading IoT Control...</p>
        </div>
      </div>
    </div>
  );

  if (!user || role !== 'student') return null;

  // ── Sensor bar colours ────────────────────────────────────────────────────
  const tempPct  = sensors.temperature !== null ? clamp01(sensors.temperature, 10, 50) : 0;
  const humPct   = sensors.humidity    !== null ? clamp01(sensors.humidity,    0, 100) : 0;
  const distPct  = sensors.distance    !== null ? clamp01(sensors.distance,    0, 100) : 0;
  const tempColor = (sensors.temperature ?? 0) > TEMP_THRESHOLD ? '#ef4444' : '#a78bfa';
  const humColor  = (sensors.humidity ?? 0) > HUMIDITY_THRESHOLD ? '#ef4444' : '#60a5fa';
  const distColor = (sensors.distance ?? 999) < DISTANCE_THRESHOLD ? '#22c55e' : '#a78bfa';

  const dataAge = sensors.updatedAt
    ? Math.floor((Date.now() - new Date(sensors.updatedAt).getTime()) / 1000)
    : 999;
  const isStale = dataAge > 30;

  const doorOpen = decision.servoAngle >= 90;

  return (
    <div id="page-root" className="min-h-screen bg-[#030108] text-white overflow-x-hidden"
      style={{ fontFamily: "'Arial Narrow','Impact',sans-serif" }}>
      <style>{sharedStyles}</style>
      <div className="scanline-bar" />
      <div className="noise-overlay" />

      {/* Atmosphere blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.09]"
          style={{ background: 'radial-gradient(circle, #6b21a8, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #22c55e, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* ── TICKER ── */}
      <div className="w-full overflow-hidden bg-[#7c3aed]/10 border-b border-[#7c3aed]/30 py-1">
        <div className="flex whitespace-nowrap" style={{ animation: 'ticker 30s linear infinite' }}>
          {Array(8).fill(null).map((_, i) => (
            <span key={i} className="text-[#a78bfa] text-xs tracking-widest mx-8 font-mono">
              ◈ RISE 2026 &nbsp;
              ◈ IoT CAPSTONE &nbsp;
              ◈ TEAM: {teamName ?? '...'} &nbsp;
              ◈ CODE: {teamCode ?? '...'} &nbsp;
              ◈ TEMP: {fmt(sensors.temperature, '°C')} &nbsp;
              ◈ HUMIDITY: {fmt(sensors.humidity, '%')} &nbsp;
              ◈ DISTANCE: {fmt(sensors.distance, 'cm')} &nbsp;
              ◈ MOTION: {sensors.motion === null ? '—' : sensors.motion ? 'YES' : 'NO'} &nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* ── HEADER ── */}
      <div className="relative px-4 sm:px-6 pt-5 pb-4 border-b border-[#7c3aed]/20">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 max-w-5xl mx-auto">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-[0.15em] text-white"
              style={{ textShadow: '0 0 30px rgba(124,58,237,0.5)' }}>
              IoT CONTROL
            </h1>
            <p className="text-[#7c3aed]/70 text-xs tracking-[0.3em] mt-1 font-mono">
              RISE WORKSHOP — CAPSTONE MODULE
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Live / stale data indicator */}
            <div className={`flex items-center gap-2 stat-pill border px-4 py-2 ${
              isStale
                ? 'bg-red-900/20 border-red-700/40'
                : 'bg-[#7c3aed]/20 border-[#7c3aed]/40'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isStale ? 'bg-red-400' : 'bg-[#a78bfa]'}`}
                style={{
                  animation: isStale
                    ? 'blink 1.5s step-end infinite'
                    : 'pulse-glow 1.5s ease-in-out infinite'
                }} />
              <span className={`text-xs font-mono tracking-widest ${isStale ? 'text-red-400' : 'text-[#a78bfa]'}`}>
                {isStale ? 'NO SIGNAL' : 'LIVE'}
              </span>
            </div>

            {/* Mode badge */}
            <div className={`flex items-center gap-2 stat-pill border px-4 py-2 ${
              decision.mode === 'manual'
                ? 'bg-amber-900/20 border-amber-600/40'
                : 'bg-green-900/20 border-green-700/40'
            }`}>
              <span className={`text-xs font-mono tracking-widest ${
                decision.mode === 'manual' ? 'text-amber-400' : 'text-green-400'
              }`}>
                {decision.mode === 'manual' ? '⚠ MANUAL' : '● AUTO'}
              </span>
            </div>

            {user.photoURL && (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-sm border border-[#7c3aed]/40" />
            )}

            {/* Back to main dashboard */}
            <button
              onClick={() => router.push('/student')}
              className="clip-btn bg-[#7c3aed]/10 border border-[#7c3aed]/30 text-[#a78bfa] text-xs px-4 py-2"
            >← DASH</button>

            <button
              onClick={async () => { await signOut(auth); router.replace('/login'); }}
              className="clip-btn bg-red-900/40 border border-red-700/40 text-red-400 text-xs px-4 py-2"
            >LOGOUT</button>
          </div>
        </div>

        {/* Stat pills row */}
        <div className="flex gap-3 mt-4 flex-wrap max-w-5xl mx-auto">
          {[
            { label: 'TEAM',    value: teamName ?? '—' },
            { label: 'CODE',    value: teamCode ?? '—' },
            { label: 'MODE',    value: decision.mode.toUpperCase() },
            { label: 'DOOR',    value: doorOpen ? 'OPEN' : 'CLOSED' },
            { label: 'UPDATED', value: timeSince(sensors.updatedAt) },
          ].map((s) => (
            <div key={s.label} className="stat-pill bg-[#0d0014] border border-[#7c3aed]/30 px-4 py-1.5">
              <span className="text-[#7c3aed]/50 text-xs font-mono tracking-widest">{s.label} </span>
              <span className="text-sm font-black text-white">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">

        {/* ── STALE DATA BANNER ── */}
        {isStale && (
          <div className="relative border border-red-700/40 bg-red-900/10 p-4 overflow-hidden"
            style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0 100%)' }}>
            <p className="text-red-300 text-sm font-mono">
              <span className="text-red-400 font-black mr-2">⚠ NO DATA /</span>
              Arduino hasn't posted in {dataAge}s. Check the sketch + WiFi + team code.
            </p>
          </div>
        )}

        {/* ── SENSOR READINGS ── */}
        <div>
          <p className="text-[#7c3aed]/40 text-xs font-mono uppercase tracking-[0.35em] mb-4">◈ Live Sensor Readings</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

            {/* Temperature */}
            <div className="relative border border-[#7c3aed]/20 bg-[#0a0015] p-5 overflow-hidden"
              style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at top left, rgba(124,58,237,0.06), transparent 70%)' }} />
              <p className="text-[#7c3aed]/40 text-[10px] font-mono uppercase tracking-[0.3em] mb-3">Temperature</p>
              <p className="font-black font-mono leading-none mb-4"
                style={{
                  fontSize: 'clamp(2rem, 6vw, 3rem)',
                  color: tempColor,
                  textShadow: `0 0 20px ${tempColor}66`,
                }}>
                {sensors.temperature !== null ? sensors.temperature : '—'}
                <span className="text-base ml-1" style={{ color: `${tempColor}99` }}>°C</span>
              </p>
              <div className="sensor-bar-track">
                <div className="sensor-bar-fill" style={{
                  width: `${tempPct * 100}%`,
                  background: tempColor,
                  boxShadow: `0 0 6px ${tempColor}`,
                }} />
              </div>
              <p className="text-[#7c3aed]/20 text-[10px] font-mono mt-2">
                {sensors.temperature !== null && sensors.temperature > TEMP_THRESHOLD
                  ? `⚠ ABOVE ${TEMP_THRESHOLD}°C — bulb 1 on`
                  : `Threshold: ${TEMP_THRESHOLD}°C`}
              </p>
            </div>

            {/* Humidity */}
            <div className="relative border border-[#7c3aed]/20 bg-[#0a0015] p-5 overflow-hidden"
              style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at top left, rgba(124,58,237,0.06), transparent 70%)' }} />
              <p className="text-[#7c3aed]/40 text-[10px] font-mono uppercase tracking-[0.3em] mb-3">Humidity</p>
              <p className="font-black font-mono leading-none mb-4"
                style={{
                  fontSize: 'clamp(2rem, 6vw, 3rem)',
                  color: humColor,
                  textShadow: `0 0 20px ${humColor}66`,
                }}>
                {sensors.humidity !== null ? sensors.humidity : '—'}
                <span className="text-base ml-1" style={{ color: `${humColor}99` }}>%</span>
              </p>
              <div className="sensor-bar-track">
                <div className="sensor-bar-fill" style={{
                  width: `${humPct * 100}%`,
                  background: humColor,
                  boxShadow: `0 0 6px ${humColor}`,
                }} />
              </div>
              <p className="text-[#7c3aed]/20 text-[10px] font-mono mt-2">
                {sensors.humidity !== null && sensors.humidity > HUMIDITY_THRESHOLD
                  ? `⚠ ABOVE ${HUMIDITY_THRESHOLD}% — bulb 2 on`
                  : `Threshold: ${HUMIDITY_THRESHOLD}%`}
              </p>
            </div>

            {/* Distance (ultrasonic) */}
            <div className="relative border border-[#7c3aed]/20 bg-[#0a0015] p-5 overflow-hidden"
              style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at top left, rgba(34,197,94,0.04), transparent 70%)' }} />
              <p className="text-[#7c3aed]/40 text-[10px] font-mono uppercase tracking-[0.3em] mb-3">Distance</p>
              <p className="font-black font-mono leading-none mb-4"
                style={{
                  fontSize: 'clamp(2rem, 6vw, 3rem)',
                  color: distColor,
                  textShadow: `0 0 20px ${distColor}66`,
                }}>
                {sensors.distance !== null ? sensors.distance : '—'}
                <span className="text-base ml-1" style={{ color: `${distColor}99` }}>cm</span>
              </p>
              <div className="sensor-bar-track">
                <div className="sensor-bar-fill" style={{
                  width: `${(1 - distPct) * 100}%`,
                  background: distColor,
                  boxShadow: `0 0 6px ${distColor}`,
                }} />
              </div>
              <p className="text-[#7c3aed]/20 text-[10px] font-mono mt-2">
                {sensors.distance !== null && sensors.distance < DISTANCE_THRESHOLD
                  ? `⚠ BELOW ${DISTANCE_THRESHOLD}cm — door opens`
                  : `Threshold: ${DISTANCE_THRESHOLD}cm`}
              </p>
            </div>

            {/* Motion */}
            <div className="relative border bg-[#0a0015] p-5 overflow-hidden"
              style={{
                clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
                borderColor: sensors.motion ? 'rgba(251,191,36,0.5)' : 'rgba(124,58,237,0.2)',
              }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  background: sensors.motion
                    ? 'radial-gradient(ellipse at top left, rgba(251,191,36,0.06), transparent 70%)'
                    : 'radial-gradient(ellipse at top left, rgba(124,58,237,0.06), transparent 70%)',
                }} />
              <p className="text-[#7c3aed]/40 text-[10px] font-mono uppercase tracking-[0.3em] mb-3">Motion</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{
                    background: sensors.motion ? '#fbbf24' : 'rgba(255,255,255,0.06)',
                    boxShadow: sensors.motion ? '0 0 16px #fbbf24, 0 0 32px rgba(251,191,36,0.4)' : 'none',
                    animation: sensors.motion ? 'pulse-glow 1s ease-in-out infinite' : 'none',
                  }} />
                <p className="font-black font-mono leading-none"
                  style={{
                    fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
                    color: sensors.motion ? '#fbbf24' : 'rgba(255,255,255,0.12)',
                    textShadow: sensors.motion ? '0 0 20px rgba(251,191,36,0.5)' : 'none',
                  }}>
                  {sensors.motion === null ? '—' : sensors.motion ? 'DETECTED' : 'NONE'}
                </p>
              </div>
              <div className="sensor-bar-track">
                <div className="sensor-bar-fill" style={{
                  width: sensors.motion ? '100%' : '0%',
                  background: '#fbbf24',
                  boxShadow: '0 0 6px #fbbf24',
                }} />
              </div>
              <p className="text-[#7c3aed]/20 text-[10px] font-mono mt-2">
                {sensors.motion ? '⚠ BOTH BULBS BLINKING' : 'PIR sensor'}
              </p>
            </div>
          </div>
        </div>

        {/* ── ACTUATOR STATUS + MODE TOGGLE ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── ACTUATOR CARDS ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Bulbs */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[#7c3aed]/40 text-xs font-mono uppercase tracking-[0.35em]">◈ Bulb Status</p>
                {decision.mode === 'manual' && (
                  <span className="text-amber-400/60 text-[10px] font-mono tracking-widest">TAP TO TOGGLE</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(['bulb1', 'bulb2'] as const).map((key) => {
                  const on = decision[key];
                  const isLoading = overrideLoading === key;
                  const isManual  = decision.mode === 'manual';
                  const isBlinking = decision.blink;

                  const meta = {
                    bulb1: { label: 'Bulb 1 (Temp)', onColor: '#f97316', onGlow: 'rgba(249,115,22,0.3)' },
                    bulb2: { label: 'Bulb 2 (Humidity)', onColor: '#60a5fa', onGlow: 'rgba(96,165,250,0.3)' },
                  }[key];

                  const active = isBlinking || on;

                  return (
                    <button
                      key={key}
                      onClick={() => toggleBulb(key)}
                      disabled={!isManual || isLoading}
                      className={`act-btn relative py-6 sm:py-8 text-center ${isBlinking ? 'blink-fast' : ''}`}
                      style={{
                        background: active
                          ? `linear-gradient(135deg, ${meta.onColor}18, ${meta.onColor}08)`
                          : 'rgba(255,255,255,0.015)',
                        border: active
                          ? `1px solid ${meta.onColor}60`
                          : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <span className="absolute pointer-events-none" style={{ top: 0, left: 0, width: 10, height: 10, borderTop: `1px solid ${active ? meta.onColor : 'rgba(255,255,255,0.1)'}`, borderLeft: `1px solid ${active ? meta.onColor : 'rgba(255,255,255,0.1)'}` }} />
                      <span className="absolute pointer-events-none" style={{ top: 0, right: 0, width: 10, height: 10, borderTop: `1px solid ${active ? meta.onColor : 'rgba(255,255,255,0.1)'}`, borderRight: `1px solid ${active ? meta.onColor : 'rgba(255,255,255,0.1)'}` }} />
                      <span className="absolute pointer-events-none" style={{ bottom: 0, left: 0, width: 10, height: 10, borderBottom: `1px solid ${active ? meta.onColor : 'rgba(255,255,255,0.1)'}`, borderLeft: `1px solid ${active ? meta.onColor : 'rgba(255,255,255,0.1)'}` }} />
                      <span className="absolute pointer-events-none" style={{ bottom: 0, right: 0, width: 10, height: 10, borderBottom: `1px solid ${active ? meta.onColor : 'rgba(255,255,255,0.1)'}`, borderRight: `1px solid ${active ? meta.onColor : 'rgba(255,255,255,0.1)'}` }} />

                      {active && (
                        <div className="absolute inset-0 pointer-events-none"
                          style={{ background: `radial-gradient(ellipse at center, ${meta.onGlow} 0%, transparent 70%)` }} />
                      )}

                      {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#030108]/60">
                          <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white"
                            style={{ animation: 'spin-cw 0.8s linear infinite' }} />
                        </div>
                      )}

                      <div className="relative z-10">
                        <p className="text-2xl mb-2">💡</p>
                        <p className="text-[10px] font-mono uppercase tracking-[0.25em] mb-2"
                          style={{ color: active ? `${meta.onColor}cc` : 'rgba(255,255,255,0.18)' }}>
                          {meta.label}
                        </p>

                        <div className="inline-block px-3 py-0.5 text-xs font-black uppercase tracking-widest"
                          style={{
                            background: active ? `${meta.onColor}20` : 'rgba(255,255,255,0.03)',
                            border: active ? `1px solid ${meta.onColor}50` : '1px solid rgba(255,255,255,0.06)',
                            clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)',
                            color: active ? meta.onColor : 'rgba(255,255,255,0.18)',
                            textShadow: active ? `0 0 10px ${meta.onColor}` : 'none',
                          }}>
                          {isBlinking ? 'BLINKING' : on ? 'ON' : 'OFF'}
                        </div>

                        {isManual && (
                          <p className="text-[9px] font-mono mt-2" style={{ color: 'rgba(255,255,255,0.15)' }}>
                            {on ? 'tap to turn off' : 'tap to turn on'}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Manual blink toggle */}
              {decision.mode === 'manual' && (
                <button
                  onClick={toggleManualBlink}
                  disabled={overrideLoading === 'blink'}
                  className="clip-btn w-full mt-3 py-3 text-xs font-black border transition-all"
                  style={{
                    borderColor: decision.blink ? 'rgba(251,191,36,0.6)' : 'rgba(124,58,237,0.2)',
                    background: decision.blink ? 'rgba(251,191,36,0.1)' : 'transparent',
                    color: decision.blink ? '#fbbf24' : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {decision.blink ? '⚠ STOP BLINK' : '▶ FORCE BLINK (both bulbs)'}
                </button>
              )}
            </div>

            {/* Servo / Door */}
            <div>
              <p className="text-[#7c3aed]/40 text-xs font-mono uppercase tracking-[0.35em] mb-4">◈ Servo Door</p>
              <div className="relative border border-[#7c3aed]/20 bg-[#0a0015] p-5">
                <div className="corner-tl" /><div className="corner-tr" />
                <div className="corner-bl" /><div className="corner-br" />
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-black font-mono text-2xl" style={{
                      color: doorOpen ? '#22c55e' : '#a78bfa',
                      textShadow: doorOpen ? '0 0 20px rgba(34,197,94,0.5)' : 'none',
                    }}>
                      {doorOpen ? 'OPEN' : 'CLOSED'}
                    </p>
                    <p className="text-[#7c3aed]/30 text-[10px] font-mono mt-1">Angle: {decision.servoAngle}°</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setServo(0)}
                      disabled={decision.mode !== 'manual' || overrideLoading === 'servo'}
                      className="act-btn px-4 py-2 text-xs font-black border"
                      style={{
                        borderColor: !doorOpen ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.08)',
                        background: !doorOpen ? 'rgba(124,58,237,0.15)' : 'transparent',
                        color: !doorOpen ? '#a78bfa' : 'rgba(255,255,255,0.3)',
                      }}
                    >CLOSE (0°)</button>
                    <button
                      onClick={() => setServo(180)}
                      disabled={decision.mode !== 'manual' || overrideLoading === 'servo'}
                      className="act-btn px-4 py-2 text-xs font-black border"
                      style={{
                        borderColor: doorOpen ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.08)',
                        background: doorOpen ? 'rgba(34,197,94,0.15)' : 'transparent',
                        color: doorOpen ? '#22c55e' : 'rgba(255,255,255,0.3)',
                      }}
                    >OPEN (180°)</button>
                  </div>
                </div>
                <div className="servo-track">
                  <div className="servo-fill" style={{
                    width: `${(decision.servoAngle / 180) * 100}%`,
                    background: doorOpen ? '#22c55e' : '#7c3aed',
                    boxShadow: `0 0 8px ${doorOpen ? '#22c55e' : '#7c3aed'}`,
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── MODE CONTROL ── */}
          <div>
            <p className="text-[#7c3aed]/40 text-xs font-mono uppercase tracking-[0.35em] mb-4">◈ Control Mode</p>
            <div className="relative border border-[#7c3aed]/20 bg-[#0a0015] p-5 h-[calc(100%-2rem)]">
              <div className="corner-tl" /><div className="corner-tr" />
              <div className="corner-bl" /><div className="corner-br" />

              <div className="space-y-4 h-full flex flex-col justify-between">
                {/* Auto mode */}
                <button
                  onClick={() => setMode('auto')}
                  disabled={overrideLoading === 'mode'}
                  className={`clip-btn w-full py-4 text-sm font-black border-2 transition-all ${
                    decision.mode === 'auto'
                      ? 'border-green-500/60 bg-green-900/20 text-green-400'
                      : 'border-[#7c3aed]/20 bg-transparent text-white/25 hover:text-white/60 hover:border-[#7c3aed]/40'
                  }`}
                  style={decision.mode === 'auto' ? { boxShadow: '0 0 20px rgba(34,197,94,0.15)' } : {}}>
                  {overrideLoading === 'mode' && decision.mode !== 'auto'
                    ? <span className="flex items-center justify-center gap-2">
                        <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white"
                          style={{ animation: 'spin-cw 0.8s linear infinite' }} />
                        SWITCHING...
                      </span>
                    : <>● AUTO MODE</>
                  }
                </button>

                {/* Mode description */}
                <div className="text-center px-2">
                  {decision.mode === 'auto' ? (
                    <p className="text-[#7c3aed]/40 text-[10px] font-mono leading-relaxed">
                      Arduino decisions are computed from sensor data automatically. Actuators update every POST cycle.
                    </p>
                  ) : (
                    <p className="text-amber-400/40 text-[10px] font-mono leading-relaxed">
                      You are in control. Tap the bulb cards, use the servo buttons, or force a blink. Arduino reads your commands on each cycle.
                    </p>
                  )}
                </div>

                {/* Manual mode */}
                <button
                  onClick={() => setMode('manual')}
                  disabled={overrideLoading === 'mode'}
                  className={`clip-btn w-full py-4 text-sm font-black border-2 transition-all ${
                    decision.mode === 'manual'
                      ? 'border-amber-500/60 bg-amber-900/20 text-amber-400'
                      : 'border-[#7c3aed]/20 bg-transparent text-white/25 hover:text-white/60 hover:border-[#7c3aed]/40'
                  }`}
                  style={decision.mode === 'manual' ? { boxShadow: '0 0 20px rgba(245,158,11,0.15)' } : {}}>
                  {overrideLoading === 'mode' && decision.mode !== 'manual'
                    ? <span className="flex items-center justify-center gap-2">
                        <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white"
                          style={{ animation: 'spin-cw 0.8s linear infinite' }} />
                        SWITCHING...
                      </span>
                    : <>⚠ MANUAL MODE</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── DECISION LOGIC PANEL ── */}
        <div className="relative border border-[#7c3aed]/20 bg-[#0a0015] p-5 sm:p-8 overflow-hidden">
          <div className="corner-tl" /><div className="corner-tr" />
          <div className="corner-bl" /><div className="corner-br" />
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at left, rgba(124,58,237,0.05) 0%, transparent 60%)' }} />
          <div className="absolute top-0 right-0 w-48 h-full pointer-events-none opacity-20"
            style={{ background: 'repeating-linear-gradient(-45deg, transparent, transparent 6px, rgba(124,58,237,0.06) 6px, rgba(124,58,237,0.06) 12px)' }} />

          <div className="relative z-10">
            <p className="text-[#7c3aed]/40 text-xs font-mono uppercase tracking-[0.35em] mb-5">◈ Rule Engine — Auto Logic</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">

              {[
                {
                  actuator: 'SERVO / DOOR',
                  rule: `distance < ${DISTANCE_THRESHOLD}cm`,
                  triggered: (sensors.distance ?? 999) < DISTANCE_THRESHOLD,
                  icon: '🚪',
                },
                {
                  actuator: 'BULB 1',
                  rule: `temp > ${TEMP_THRESHOLD}°C (unless motion)`,
                  triggered: !sensors.motion && (sensors.temperature ?? 0) > TEMP_THRESHOLD,
                  icon: '💡',
                },
                {
                  actuator: 'BULB 2',
                  rule: `humidity > ${HUMIDITY_THRESHOLD}% (unless motion)`,
                  triggered: !sensors.motion && (sensors.humidity ?? 0) > HUMIDITY_THRESHOLD,
                  icon: '💡',
                },
                {
                  actuator: 'BLINK OVERRIDE',
                  rule: 'motion detected → both bulbs blink',
                  triggered: !!sensors.motion,
                  icon: '⚡',
                },
              ].map(({ actuator, rule, triggered, icon }) => (
                <div key={actuator} className="relative border border-[#7c3aed]/10 bg-[#030108]/60 p-4"
                  style={{
                    clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                    borderColor: triggered ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.05)',
                  }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg">{icon}</span>
                    <div className="inline-block px-2 py-0.5 text-[10px] font-black uppercase tracking-widest"
                      style={{
                        background: triggered ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
                        border: triggered ? '1px solid rgba(167,139,250,0.4)' : '1px solid rgba(255,255,255,0.06)',
                        clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)',
                        color: triggered ? '#a78bfa' : 'rgba(255,255,255,0.18)',
                      }}>
                      {triggered ? 'FIRE ✓' : 'IDLE'}
                    </div>
                  </div>
                  <p className="text-white font-black text-sm uppercase tracking-wider mb-1">{actuator}</p>
                  <p className="text-[#7c3aed]/35 text-[10px] font-mono leading-relaxed">IF {rule}</p>
                </div>
              ))}
            </div>

            <p className="text-[#7c3aed]/20 text-[10px] font-mono mt-4">
              Rules run server-side on every POST from the Arduino. Manual mode bypasses this logic entirely.
            </p>
          </div>
        </div>

        {/* ── LAST UPDATED FOOTER ── */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px"
            style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.2), transparent)' }} />
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rotate-45 bg-[#7c3aed]/30" />
            <p className="text-white/10 text-xs font-mono uppercase tracking-[0.3em]">
              SENSORS · {timeSince(sensors.updatedAt)} · DECISION · {timeSince(decision.updatedAt)}
            </p>
            <div className="w-1.5 h-1.5 rotate-45 bg-[#7c3aed]/30" />
          </div>
          <div className="flex-1 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.2))' }} />
        </div>

      </div>
    </div>
  );
}