"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const CATEGORIES = [
  { id: "all", label: "All Events", icon: "✦" },
  { id: "party", label: "Parties", icon: "🎉" },
  { id: "concert", label: "Concerts", icon: "🎵" },
  { id: "festival", label: "Festivals", icon: "🎪" },
  { id: "club", label: "Clubbing", icon: "🌙" },
  { id: "art", label: "Art & Culture", icon: "🎨" },
  { id: "food", label: "Food & Drink", icon: "🍸" },
  { id: "sports", label: "Sports", icon: "⚡" },
];
const DATE_FILTERS = ["Tonight", "This Weekend", "This Week", "This Month"];
const PRICE_FILTERS = ["Free", "Under €20", "€20–€50", "€50+"];
const SOURCES = [
  { id: "ra", label: "Resident Advisor", color: "#FF4500" },
  { id: "eventbrite", label: "Eventbrite", color: "#F05537" },
  { id: "dice", label: "DICE", color: "#00C0A3" },
  { id: "skiddle", label: "Skiddle", color: "#7C3AED" },
  { id: "timeout", label: "Time Out", color: "#E30613" },
  { id: "local", label: "Local Guide", color: "#F59E0B" },
];
const FAKE_FRIENDS = ["Maya R.","Tom S.","Lena K.","Jake M.","Sara B.","Felix W.","Anya P.","Dom C."];
const WEATHER_ICONS = { sunny:"☀️", cloudy:"⛅", rainy:"🌧️", windy:"💨", clear:"🌙" };

const glass = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  backdropFilter: "blur(12px)",
};

const getTierAvail = (t) => t.total - t.sold;
const getEvtFillPct = (e) => {
  const tot = e.tiers?.reduce((s, t) => s + t.total, 0) || 1;
  const sol = e.tiers?.reduce((s, t) => s + t.sold, 0) || 0;
  return Math.round((sol / tot) * 100);
};
const getTotalAvail = (e) => e.tiers?.reduce((s, t) => s + getTierAvail(t), 0) ?? 0;

function urgencyInfo(avail, total) {
  const pct = total > 0 ? avail / total : 0;
  if (avail === 0) return { label: "SOLD OUT", color: "#EF4444", bg: "rgba(239,68,68,0.1)", pulse: false };
  if (pct < 0.05) return { label: `LAST ${avail} LEFT`, color: "#EF4444", bg: "rgba(239,68,68,0.09)", pulse: true };
  if (pct < 0.15) return { label: `ONLY ${avail} LEFT`, color: "#F59E0B", bg: "rgba(245,158,11,0.09)", pulse: true };
  if (pct < 0.35) return { label: `${avail} REMAINING`, color: "#F59E0B", bg: "rgba(245,158,11,0.07)", pulse: false };
  return { label: `${avail} AVAILABLE`, color: "#34D399", bg: "rgba(52,211,153,0.07)", pulse: false };
}

function surgePrice(tier, fillPct) {
  if (tier.price === 0) return 0;
  if (fillPct > 90) return Math.round(tier.price * 1.5);
  if (fillPct > 75) return Math.round(tier.price * 1.25);
  if (fillPct > 60) return Math.round(tier.price * 1.1);
  return tier.price;
}

function QRCode({ value, size = 120, fg = "#020408" }) {
  let seed = 0;
  for (let i = 0; i < value.length; i++) seed = (seed * 31 + value.charCodeAt(i)) & 0xffffffff;
  const rng = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0x100000000; };
  const N = 21, cell = size / N;
  const grid = Array.from({ length: N }, (_, r) =>
    Array.from({ length: N }, (_, c) => {
      const isCorner = (r < 7 && c < 7) || (r < 7 && c >= N - 7) || (r >= N - 7 && c < 7);
      if (isCorner) {
        const o = r === 0 || r === 6 || c === 0 || c === 6 || r === N - 7 || r === N - 1 || c === N - 7;
        const inn = (r >= 2 && r <= 4 && c >= 2 && c <= 4) || (r >= 2 && r <= 4 && c >= N - 5 && c <= N - 3) || (r >= N - 5 && r <= N - 3 && c >= 2 && c <= 4);
        return o || inn;
      }
      return rng() > 0.5;
    })
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <rect width={size} height={size} fill="white" rx={4} />
      {grid.map((row, r) => row.map((on, c) => on ? <rect key={`${r}${c}`} x={c * cell + 1} y={r * cell + 1} width={cell - 1} height={cell - 1} fill={fg} rx={cell * 0.15} /> : null))}
    </svg>
  );
}

function Toast({ msg, color, visible }) {
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 500,
      padding: "14px 20px", borderRadius: "12px",
      background: "#0A0F1E", border: `1px solid ${color}44`,
      boxShadow: `0 8px 32px rgba(0,0,0,0.6)`,
      fontFamily: "'DM Sans',sans-serif", fontSize: "14px", fontWeight: 700, color,
      transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
      transform: visible ? "translateX(0)" : "translateX(140%)",
      opacity: visible ? 1 : 0, maxWidth: "320px",
    }}>
      {msg}
    </div>
  );
}

function SourceBadge({ sourceId }) {
  const s = SOURCES.find(x => x.id === sourceId) || SOURCES[5];
  return (
    <span style={{ fontSize: "10px", fontFamily: "'Space Mono',monospace", letterSpacing: "0.05em", padding: "2px 8px", borderRadius: "3px", background: s.color + "20", color: s.color, border: `1px solid ${s.color}44`, fontWeight: 700, textTransform: "uppercase" }}>
      {s.label}
    </span>
  );
}

function FriendBadge({ friends }) {
  if (!friends || friends.length === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{ display: "flex" }}>
        {friends.slice(0, 3).map((f, i) => (
          <div key={f} style={{ width: 22, height: 22, borderRadius: "50%", background: `hsl(${(f.charCodeAt(0) * 47) % 360},60%,50%)`, border: "2px solid #020408", marginLeft: i > 0 ? -8 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700, color: "#fff", zIndex: 3 - i }}>
            {f[0]}
          </div>
        ))}
      </div>
      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "11px", color: "#475569" }}>
        {friends.slice(0, 2).join(", ")}{friends.length > 2 ? ` +${friends.length - 2} going` : " going"}
      </span>
    </div>
  );
}

function WeatherBadge({ weather }) {
  if (!weather) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <span style={{ fontSize: "12px" }}>{WEATHER_ICONS[weather.condition] || "🌤"}</span>
      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", color: "#64748B", letterSpacing: "0.05em" }}>{weather.temp}°C {weather.desc}</span>
    </div>
  );
}

function AfterpartyCard({ ap }) {
  return (
    <div style={{ borderRadius: "10px", border: "1px solid rgba(99,102,241,0.2)", background: "rgba(99,102,241,0.05)", padding: "12px", display: "flex", gap: "12px", alignItems: "center" }}>
      <span style={{ fontSize: "22px" }}>🌅</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", color: "#6366F1", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "3px" }}>Afterparty</p>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: "13px", color: "#CBD5E1" }}>{ap.name}</p>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "11px", color: "#475569" }}>{ap.venue} · Starts {ap.time}</p>
      </div>
      <button style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.1)", color: "#818CF8", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap" }}>
        Book →
      </button>
    </div>
  );
}

function BookingModal({ event, onClose, onBook }) {
  const [step, setStep] = useState("select");
  const [selTier, setSelTier] = useState(null);
  const [qty, setQty] = useState(1);
  const [waitlistTier, setWaitlistTier] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [bookedId, setBookedId] = useState(null);
  const fillPct = getEvtFillPct(event);
  const tier = event.tiers?.find(t => t.id === selTier);
  const avail = tier ? getTierAvail(tier) : 0;
  const currentPrice = tier ? surgePrice(tier, fillPct) : 0;
  const originalPrice = tier?.price || 0;
  const isSurge = currentPrice > originalPrice;

  const doBook = async () => {
    setProcessing(true);
    await new Promise(r => setTimeout(r, 1600));
    const id = `TKT-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
    setBookedId(id);
    setStep("success");
    setProcessing(false);
    onBook({ id, event, tier, qty, currentPrice, bookedAt: new Date().toISOString() }, selTier, qty);
  };

  const doWaitlist = (tierId) => {
    setWaitlistTier(tierId);
    setTimeout(() => setWaitlistTier(null), 3000);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(8px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "#0A0F1E", borderRadius: "24px 24px 0 0", border: "1px solid rgba(255,255,255,0.07)", borderBottom: "none", overflow: "hidden", animation: "slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ height: 4, background: event.accentGrad }} />

        {step === "select" && (
          <div style={{ padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <SourceBadge sourceId={event.source} />
                  {event.weather && <WeatherBadge weather={event.weather} />}
                </div>
                <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: "0.04em", color: "#F8FAFC", lineHeight: 1.1, marginBottom: 4 }}>{event.name}</h2>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#475569" }}>{event.venue} · {event.date} · {event.time}</p>
              </div>
              <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: "50%", width: 36, height: 36, color: "#475569", cursor: "pointer", fontSize: 18, flexShrink: 0 }}>×</button>
            </div>

            {isSurge && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", marginBottom: 16 }}>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#FCA5A5", lineHeight: 1.5 }}>
                  🔥 <strong>Surge pricing active</strong> — High demand has raised prices. Book now to lock in.
                </p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
              {event.tiers?.map(t => {
                const a = getTierAvail(t), soldOut = a === 0, sel = selTier === t.id;
                const sp = surgePrice(t, fillPct), surge = sp > t.price;
                return (
                  <div key={t.id}>
                    <div onClick={() => !soldOut && setSelTier(t.id)} style={{ borderRadius: 12, border: `1px solid ${sel ? event.color + "66" : soldOut ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.07)"}`, background: sel ? event.color + "12" : "rgba(255,255,255,0.03)", padding: 16, cursor: soldOut ? "not-allowed" : "pointer", opacity: soldOut ? 0.4 : 1, transition: "all 0.2s" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${sel ? event.color : "rgba(255,255,255,0.2)"}`, background: sel ? event.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                            {sel && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                          </div>
                          <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, color: soldOut ? "#334155" : "#CBD5E1" }}>{t.name}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          {t.price === 0 ? <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: "#34D399" }}>FREE</span>
                            : surge ? (
                              <div>
                                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: "#64748B", textDecoration: "line-through", marginRight: 6 }}>€{t.price}</span>
                                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: "#EF4444" }}>€{sp}</span>
                                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#EF4444", marginLeft: 4 }}>🔥SURGE</span>
                              </div>
                            ) : <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: soldOut ? "#334155" : event.color }}>€{sp}</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 28 }}>
                        <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(t.sold / t.total) * 100}%`, background: soldOut ? "#334155" : event.color, borderRadius: 2, transition: "width 0.8s ease" }} />
                        </div>
                        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: soldOut ? "#334155" : a < 8 ? "#EF4444" : "#475569", whiteSpace: "nowrap" }}>
                          {soldOut ? "Sold Out" : `${a} left`}
                        </span>
                      </div>
                    </div>
                    {soldOut && (
                      <button onClick={() => doWaitlist(t.id)} style={{ width: "100%", marginTop: 6, padding: "8px", borderRadius: 8, border: "1px solid rgba(167,139,250,0.25)", background: waitlistTier === t.id ? "rgba(167,139,250,0.15)" : "rgba(167,139,250,0.06)", color: waitlistTier === t.id ? "#A78BFA" : "#64748B", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}>
                        {waitlistTier === t.id ? "✓ You're on the waitlist!" : "+ Join Waitlist for this tier"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {selTier && (
              <div style={{ marginBottom: 20, padding: 16, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Quantity</p>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#CBD5E1", cursor: "pointer", fontSize: 18 }}>−</button>
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, letterSpacing: "0.04em", color: "#F8FAFC", minWidth: 28, textAlign: "center" }}>{qty}</span>
                  <button onClick={() => setQty(q => Math.min(Math.min(avail, 6), q + 1))} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#CBD5E1", cursor: "pointer", fontSize: 18 }}>+</button>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#475569" }}>Max 6 per order</span>
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: event.color, marginLeft: "auto" }}>€{(currentPrice * qty).toFixed(2)}</span>
                </div>
              </div>
            )}

            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.15)", marginBottom: 16 }}>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#818CF8", lineHeight: 1.5 }}>
                ✦ Your ticket appears instantly in your <strong>VYBE Wallet</strong> — no email, no download.
              </p>
            </div>

            <button disabled={!selTier} onClick={() => setStep("confirm")} style={{ width: "100%", padding: 16, borderRadius: 12, border: "none", background: selTier ? event.accentGrad : "rgba(255,255,255,0.04)", color: selTier ? "#fff" : "#334155", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 15, cursor: selTier ? "pointer" : "not-allowed", letterSpacing: "0.02em" }}>
              Continue →{selTier && tier ? ` €${(currentPrice * qty).toFixed(2)}` : ""}
            </button>
          </div>
        )}

        {step === "confirm" && tier && (
          <div style={{ padding: 28 }}>
            <button onClick={() => setStep("select")} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 20, padding: 0 }}>← BACK</button>
            <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, letterSpacing: "0.04em", color: "#F8FAFC", marginBottom: 20 }}>Order Summary</h2>
            {[["Event", event.name], ["Venue", event.venue], ["Date", `${event.date} · ${event.time}`], ["Ticket", tier.name], ["Quantity", `${qty}×`], ["Price each", currentPrice === 0 ? "FREE" : `€${currentPrice}`]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: "#475569", letterSpacing: "0.05em" }}>{k}</span>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#CBD5E1", fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 0" }}>
              <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: "0.05em", color: "#F8FAFC" }}>TOTAL</span>
              <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, letterSpacing: "0.04em", color: event.color }}>{currentPrice === 0 ? "FREE" : `€${(currentPrice * qty).toFixed(2)}`}</span>
            </div>
            <button onClick={doBook} disabled={processing} style={{ width: "100%", padding: 16, borderRadius: 12, border: "none", background: processing ? "rgba(255,255,255,0.05)" : event.accentGrad, color: processing ? "#475569" : "#fff", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 15, cursor: processing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, letterSpacing: "0.02em" }}>
              {processing ? (<><div style={{ width: 16, height: 16, border: "2px solid #334155", borderTop: "2px solid #818CF8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Processing...</>) : `Confirm & Pay ${currentPrice === 0 ? "(Free)" : `€${(currentPrice * qty).toFixed(2)}`}`}
            </button>
          </div>
        )}

        {step === "success" && (
          <div style={{ padding: 32, textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#34D399,#10B981)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32, animation: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>✓</div>
            <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 34, letterSpacing: "0.05em", color: "#34D399", marginBottom: 8 }}>You're In!</h2>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "#475569", marginBottom: 24 }}>Ticket live in your wallet right now.</p>
            <div style={{ borderRadius: 14, background: `${event.color}15`, border: `1px solid ${event.color}33`, padding: 20, marginBottom: 20 }}>
              <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: "#475569", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Booking ID</p>
              <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: "0.1em", color: event.color }}>{bookedId}</p>
            </div>
            <button onClick={onClose} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#34D399,#10B981)", color: "#fff", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>View in Wallet →</button>
          </div>
        )}
      </div>
    </div>
  );
}

function TicketPass({ ticket, index }) {
  const [flipped, setFlipped] = useState(false);
  const ev = ticket.event;
  const ap = ev?.afterparty;
  return (
    <div style={{ animation: `fadeUp 0.5s ease ${index * 120}ms forwards`, opacity: 0 }}>
      <div style={{ position: "relative", transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0)", transition: "transform 0.55s cubic-bezier(0.34,1.2,0.64,1)" }}>
        <div style={{ backfaceVisibility: "hidden", borderRadius: 18, overflow: "hidden", border: `1px solid ${ev.color}33`, background: "linear-gradient(145deg,#0D1829,#0A0F1E)", boxShadow: `0 0 40px ${ev.color}18, 0 4px 20px rgba(0,0,0,0.4)` }}>
          <div style={{ height: 5, background: ev.accentGrad }} />
          <div style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399", animation: "pulse 2s infinite" }} />
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#34D399", letterSpacing: "0.12em", textTransform: "uppercase" }}>Upcoming</span>
              </div>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#1E293B" }}>{ticket.id}</span>
            </div>
            <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: "0.04em", color: "#F8FAFC", lineHeight: 1.1, marginBottom: 4 }}>{ev.name}</h3>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#475569", marginBottom: 16 }}>{ev.venue} · {ev.neighborhood}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[["Date", ev.date], ["Time", ev.time], ["Ticket", ticket.tier?.name || "General"], ["Qty", `${ticket.qty}×`]].map(([k, v]) => (
                <div key={k} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#334155", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{k}</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#CBD5E1", fontWeight: 700 }}>{v}</p>
                </div>
              ))}
            </div>
            {ticket.currentPrice > 0 && (
              <div style={{ padding: "8px 12px", borderRadius: 8, background: `${ev.color}10`, border: `1px solid ${ev.color}22`, marginBottom: 14 }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: "#475569" }}>PAID  </span>
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: ev.color }}>€{(ticket.currentPrice * ticket.qty).toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", margin: "0 -22px 14px", position: "relative" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#020408", border: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }} />
              <div style={{ flex: 1, borderTop: "2px dashed rgba(255,255,255,0.05)" }} />
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#020408", border: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: ap ? 16 : 0 }}>
              <div onClick={() => setFlipped(true)} style={{ padding: 10, background: "#fff", borderRadius: 10, flexShrink: 0, cursor: "pointer" }}>
                <QRCode value={ticket.id} size={72} fg="#020408" />
              </div>
              <div>
                <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#334155", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Entry Code</p>
                <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, letterSpacing: "0.08em", color: ev.color, marginBottom: 6 }}>{ticket.id}</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "#334155", lineHeight: 1.5 }}>Tap QR to enlarge · Show at door</p>
              </div>
            </div>
            {ap && <AfterpartyCard ap={ap} />}
          </div>
        </div>
        <div onClick={() => setFlipped(false)} style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: 18, background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, cursor: "pointer" }}>
          <QRCode value={ticket.id} size={180} fg="#020408" />
          <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: "0.08em", color: "#020408", marginTop: 18 }}>{ticket.id}</p>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#64748B", marginTop: 4 }}>Tap to flip back</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label, accent }) {
  return (
    <div style={{ ...glass, borderRadius: 10, padding: "14px 18px", textAlign: "center" }}>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, letterSpacing: "0.04em", color: accent || "#6366F1", lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "#334155" }}>{label}</div>
    </div>
  );
}

function EventCard({ event, index, onBook }) {
  const [hovered, setHovered] = useState(false);
  const fillPct = getEvtFillPct(event);
  const totalAvail = getTotalAvail(event);
  const totalCap = event.tiers?.reduce((s, t) => s + t.total, 0) || 1;
  const urg = urgencyInfo(totalAvail, totalCap);
  const cheapest = event.tiers?.filter(t => getTierAvail(t) > 0).sort((a, b) => a.price - b.price)[0];
  const cheapestPrice = cheapest ? surgePrice(cheapest, fillPct) : null;
  const isSurge = cheapest && cheapestPrice > cheapest.price;

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ borderRadius: 14, border: `1px solid ${event.sponsored ? event.color + "44" : "rgba(255,255,255,0.07)"}`, background: hovered ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)", overflow: "hidden", transition: "transform 0.25s ease, box-shadow 0.25s ease", transform: hovered ? "translateY(-4px)" : "none", boxShadow: hovered ? `0 18px 50px ${event.color}18` : "none", animation: `fadeUp 0.5s ease ${index * 90}ms forwards`, opacity: 0 }}>
      <div style={{ height: 3, background: event.accentGrad }} />
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <SourceBadge sourceId={event.source} />
            {event.sponsored && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#FACC15", letterSpacing: "0.12em", textTransform: "uppercase", background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.25)", padding: "2px 7px", borderRadius: 3 }}>★ Featured</span>}
            {event.exclusive && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#A78BFA", letterSpacing: "0.12em", textTransform: "uppercase", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", padding: "2px 7px", borderRadius: 3 }}>◆ VIP</span>}
          </div>
          <div style={{ padding: "3px 9px", borderRadius: 4, background: urg.bg, animation: urg.pulse ? "pulse 1.5s infinite" : "none" }}>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: urg.color, letterSpacing: "0.08em", fontWeight: 700 }}>{urg.label}</span>
          </div>
        </div>
        <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: "0.04em", color: "#F8FAFC", marginBottom: 4, lineHeight: 1.1 }}>{event.name}</h3>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#475569", marginBottom: 10 }}>📍 {event.venue} · {event.neighborhood}</p>
        <div style={{ display: "flex", gap: 14, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: "#64748B" }}>◷ {event.date}</span>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: "#64748B" }}>⏱ {event.time}</span>
          {event.weather && <WeatherBadge weather={event.weather} />}
        </div>
        {event.description && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#475569", lineHeight: 1.6, marginBottom: 10 }}>{event.description}</p>}
        {event.lineup && event.lineup.length > 0 && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
            {event.lineup.map(a => <span key={a} style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#334155", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: "3px 8px", borderRadius: 4, letterSpacing: "0.04em" }}>{a}</span>)}
          </div>
        )}
        {event.tags && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
            {event.tags.map(t => <span key={t} style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#1E293B", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "2px 7px", borderRadius: 4 }}>{t}</span>)}
          </div>
        )}
        {event.friends && event.friends.length > 0 && <div style={{ marginBottom: 12 }}><FriendBadge friends={event.friends} /></div>}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#1E293B", letterSpacing: "0.08em", textTransform: "uppercase" }}>Capacity</span>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: fillPct > 85 ? "#EF4444" : "#334155" }}>{fillPct}% full</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${fillPct}%`, background: fillPct > 85 ? "linear-gradient(90deg,#EF4444,#F97316)" : fillPct > 65 ? "linear-gradient(90deg,#F59E0B,#EF4444)" : event.accentGrad, borderRadius: 2, transition: "width 1s ease" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            {cheapest ? (
              <div>
                {isSurge && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: "#64748B", textDecoration: "line-through", marginRight: 6 }}>€{cheapest.price}</span>}
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: "0.04em", color: isSurge ? "#EF4444" : event.color }}>
                  {cheapest.price === 0 ? "FREE" : `from €${cheapestPrice}`}
                </span>
                {isSurge && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#EF4444", marginLeft: 5 }}>🔥</span>}
              </div>
            ) : <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: "#334155" }}>SOLD OUT</span>}
          </div>
          <button onClick={() => onBook(event)} disabled={totalAvail === 0} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: totalAvail === 0 ? "rgba(255,255,255,0.03)" : event.accentGrad, color: totalAvail === 0 ? "#334155" : "#fff", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13, cursor: totalAvail === 0 ? "not-allowed" : "pointer", letterSpacing: "0.02em" }}>
            {totalAvail === 0 ? "Sold Out" : "Book Now →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BusinessDashboard() {
  const streams = [
    { icon: "🎟", title: "Affiliate Commissions", desc: "2–5% on every ticket sold via VYBE tracking links. Integrated with Eventbrite, DICE, RA and 20+ platforms.", cta: "~€8K/mo at 10K MAU", color: "#34D399" },
    { icon: "★", title: "Featured Listings", desc: "Promoters pay €50–€500 to pin events at top of local feeds. Self-serve from their dashboard.", cta: "€2K–€15K/mo", color: "#FACC15" },
    { icon: "◆", title: "Premium Memberships", desc: "€9.99/mo for VIP events, early access, city alerts, exclusive drops, and member discounts.", cta: "€10K MRR at 1K subs", color: "#A78BFA" },
    { icon: "🏢", title: "Venue SaaS Dashboard", desc: "Venues get their own login to manage listings, set ticket tiers, analytics and sponsor events. €99–€499/mo per venue.", cta: "€5K–€25K MRR", color: "#6366F1" },
    { icon: "📊", title: "Trend Data & Insights", desc: "Anonymised attendance, genre trends, and peak-time data sold to brands, drinks companies, and tourism boards.", cta: "€500–€5K/report", color: "#EC4899" },
    { icon: "🌐", title: "White-Label Licensing", desc: "City tourism boards, festivals, and media brands license the full platform under their own brand.", cta: "€10K–€50K/yr", color: "#F97316" },
  ];
  const stages = [
    { stage: "0–3 Months", focus: "2 cities, 500 MAU, affiliate + featured listings live", mrr: "€500–€2K" },
    { stage: "3–9 Months", focus: "10 cities, premium memberships, 5K MAU", mrr: "€5K–€20K" },
    { stage: "9–18 Months", focus: "Venue SaaS, 50 cities, DICE/RA partnership", mrr: "€20K–€80K" },
    { stage: "18M+", focus: "White-label deals, data licensing, Series A", mrr: "€80K+" },
  ];
  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 38, letterSpacing: "0.05em", color: "#F8FAFC", marginBottom: 6 }}>Business Model</h2>
      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "#475569", marginBottom: 28 }}>Six revenue streams. One platform. Built on aggregation, data, and network effects.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 14, marginBottom: 36 }}>
        {streams.map((r, i) => (
          <div key={i} style={{ borderRadius: 12, border: `1px solid ${r.color}20`, background: `${r.color}07`, padding: 22 }}>
            <div style={{ fontSize: 26, marginBottom: 10 }}>{r.icon}</div>
            <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: "0.04em", color: r.color, marginBottom: 8 }}>{r.title}</h3>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 14 }}>{r.desc}</p>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: r.color, background: `${r.color}14`, border: `1px solid ${r.color}30`, padding: "5px 12px", borderRadius: 4, display: "inline-block", letterSpacing: "0.05em" }}>↗ {r.cta}</span>
          </div>
        ))}
      </div>
      <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, letterSpacing: "0.05em", color: "#F8FAFC", marginBottom: 14 }}>Growth Roadmap</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12, marginBottom: 36 }}>
        {stages.map((s, i) => (
          <div key={i} style={{ ...glass, borderRadius: 10, padding: 18, borderLeft: "3px solid #6366F1", animation: `fadeUp 0.5s ease ${i * 100}ms forwards`, opacity: 0 }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#6366F1", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>{s.stage}</div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#64748B", lineHeight: 1.6, marginBottom: 10 }}>{s.focus}</p>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: "0.04em", color: "#34D399" }}>{s.mrr} MRR</div>
          </div>
        ))}
      </div>
      <div style={{ ...glass, borderRadius: 14, padding: 28 }}>
        <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: "0.05em", color: "#F8FAFC", marginBottom: 14 }}>Competitive Moat</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 16 }}>
          {[["Aggregation", "No single source wins — your value is combining all of them"], ["Network Effects", "More users → better data → better recs → more users"], ["Booking Data", "You own the conversion intent data no single platform shares"], ["Local Trust", "City-by-city brand building creates deep regional loyalty"]].map(([t, d]) => (
            <div key={t}><div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#6366F1", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>✦ {t}</div><p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{d}</p></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function VybeApp() {
  const [city, setCity] = useState("Berlin");
  const [cityInput, setCityInput] = useState("Berlin");
  const [category, setCategory] = useState("all");
  const [dateFilter, setDateFilter] = useState("This Weekend");
  const [priceFilter, setPriceFilter] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState([]);
  const [activeView, setActiveView] = useState("discover");
  const [bookingEvent, setBookingEvent] = useState(null);
  const [showPremium, setShowPremium] = useState(false);
  const [toast, setToast] = useState({ msg: "", color: "#34D399", visible: false });
  const tickRef = useRef(null);
  const abortRef = useRef({ active: false });

  const showToast = (msg, color = "#34D399") => {
    setToast({ msg, color, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3500);
  };

  useEffect(() => {
    tickRef.current = setInterval(() => {
      setEvents(prev => prev.map(evt => ({
        ...evt,
        tiers: evt.tiers?.map(t => {
          const a = getTierAvail(t);
          if (a <= 0 || Math.random() > 0.1) return t;
          return { ...t, sold: Math.min(t.total, t.sold + 1) };
        })
      })));
    }, 4000);
    return () => clearInterval(tickRef.current);
  }, []);

  const fetchEvents = useCallback(async (c, cat, date, price) => {
    abortRef.current.active = false;
    const flag = { active: true };
    abortRef.current = flag;
    setLoading(true);
    setEvents([]);

    const catLabel = cat === "all" ? "all types (parties, concerts, clubbing, festivals, art, food, sports)" : cat;
    const weatherConds = ["sunny", "cloudy", "rainy", "windy", "clear"];
    const prompt = `You are VYBE, a nightlife and events aggregator for ${c}. Generate exactly 9 realistic events for ${date.toLowerCase()}, category: "${catLabel}"${price ? `, price range: "${price}"` : ""}.

Return ONLY a valid JSON array, no markdown, no backticks. Each event object must have:
- id: unique string like "evt_001"
- name: string (bold creative event name)
- venue: string (real-sounding venue in ${c})
- neighborhood: string (real neighborhood in ${c})
- date: string e.g. "SAT 5 APR"
- time: string e.g. "23:00 – 06:00"
- description: string (2 sharp sentences)
- genre: string e.g. "Techno · Industrial"
- lineup: array of 2-3 artist name strings
- tags: array of 2-4 strings e.g. ["18+","Outdoor"]
- category: one of: party|concert|festival|club|art|food|sports
- source: one of: ra|eventbrite|dice|skiddle|timeout|local
- bookingUrl: realistic URL string or "#"
- sponsored: boolean (exactly 1 event true)
- exclusive: boolean (1-2 events true)
- isOutdoor: boolean
- weather: if isOutdoor true, object {condition:"${weatherConds[Math.floor(Math.random() * weatherConds.length)]}", temp:${10 + Math.floor(Math.random() * 18)}, desc:"short desc"}, else null
- friends: array of 0-3 friend name strings chosen from: ["Maya R.","Tom S.","Lena K.","Jake M.","Sara B."]
- afterparty: for 2-3 events, object {name:"string",venue:"string",time:"string"}, else null
- color: one of: "#FF4500","#F59E0B","#6366F1","#EC4899","#00C0A3","#34D399"
- accentGrad: matching gradient like "linear-gradient(135deg,#FF4500,#FF0055)"
- tiers: array of 2-3 objects each with: id (string), name (string), price (number, 0 for free), total (number 80-400), sold (number less than total, high sell-through for urgency)

Make events authentic to ${c} culture. Return ONLY the JSON array.`;

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!flag.active) return;
      const data = await res.json();
      const raw = data.content?.map(b => b.text || "").join("") || "[]";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (flag.active) {
        const sponsored = parsed.filter(e => e.sponsored);
        const rest = parsed.filter(e => !e.sponsored).sort(() => Math.random() - 0.5);
        setEvents([...sponsored, ...rest]);
      }
    } catch (e) {
      console.error(e);
      if (flag.active) setEvents([]);
    } finally {
      if (flag.active) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(city, category, dateFilter, priceFilter); }, [city, category, dateFilter, priceFilter]);

  const handleBook = (event) => setBookingEvent(event);

  const handleBookConfirm = (ticket, tierId, qty) => {
    setWallet(w => [ticket, ...w]);
    setEvents(prev => prev.map(evt =>
      evt.id === ticket.event?.id
        ? { ...evt, tiers: evt.tiers?.map(t => t.id === tierId ? { ...t, sold: t.sold + qty } : t) }
        : evt
    ));
    showToast("🎟 Ticket added to your VYBE Wallet!", "#34D399");
    setTimeout(() => { setBookingEvent(null); setActiveView("wallet"); }, 1200);
  };

  const totalLiveTickets = events.reduce((s, e) => s + getTotalAvail(e), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#020408", position: "relative", overflowX: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse 80% 50% at 15% -5%,rgba(99,102,241,0.11) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 85% 105%,rgba(236,72,153,0.07) 0%,transparent 60%)" }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.008) 2px,rgba(255,255,255,0.008) 4px)" }} />

      <Toast msg={toast.msg} color={toast.color} visible={toast.visible} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1120, margin: "0 auto", padding: "0 20px 80px" }}>
        {/* Header */}
        <div style={{ paddingTop: 30, marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(44px,8vw,76px)", letterSpacing: "0.06em", lineHeight: 1, background: "linear-gradient(135deg,#F8FAFC 30%,#6366F1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>VYBE</h1>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: "0.2em", color: "#6366F1", border: "1px solid rgba(99,102,241,0.3)", padding: "2px 8px", borderRadius: 2 }}>V3</span>
              </div>
              <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: "0.12em", color: "#1E293B", textTransform: "uppercase", marginTop: 4 }}>Discover · Book · Wallet · Never Miss Out</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={() => setShowPremium(true)} style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.08)", color: "#A78BFA", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>◆ Premium €9.99/mo</button>
              <button onClick={() => setActiveView(v => v === "business" ? "discover" : "business")} style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${activeView === "business" ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.25)"}`, background: activeView === "business" ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.06)", color: "#818CF8", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {activeView === "business" ? "← Events" : "For Promoters →"}
              </button>
            </div>
          </div>
        </div>

        {activeView === "business" ? <BusinessDashboard /> : (
          <>
            {/* City Search */}
            <div style={{ ...glass, borderRadius: 14, padding: 20, marginBottom: 22, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 180 }}>
                <span style={{ fontSize: 18 }}>📍</span>
                <input value={cityInput} onChange={e => setCityInput(e.target.value)} onKeyDown={e => e.key === "Enter" && setCity(cityInput.trim())} placeholder="Any city worldwide..." style={{ flex: 1, background: "transparent", border: "none", color: "#F8FAFC", fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: "0.05em" }} />
              </div>
              <button onClick={() => setCity(cityInput.trim())} style={{ padding: "10px 22px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Find Events</button>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Berlin", "London", "Amsterdam", "NYC", "Barcelona", "Tokyo", "Paris", "Ibiza"].map(c => (
                  <button key={c} onClick={() => { setCityInput(c); setCity(c); }} style={{ padding: "6px 11px", borderRadius: 6, border: `1px solid ${city === c ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.06)"}`, background: city === c ? "rgba(99,102,241,0.14)" : "transparent", color: city === c ? "#A5B4FC" : "#334155", fontFamily: "'Space Mono',monospace", fontSize: 10, cursor: "pointer", fontWeight: 700 }}>{c}</button>
                ))}
              </div>
            </div>

            {/* View Tabs */}
            <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 4, marginBottom: 22, width: "fit-content" }}>
              {[{ id: "discover", label: "Discover", count: events.length }, { id: "wallet", label: "My Wallet 🎟", count: wallet.length }].map(tab => (
                <button key={tab.id} onClick={() => setActiveView(tab.id)} style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: activeView === tab.id ? "rgba(99,102,241,0.18)" : "transparent", color: activeView === tab.id ? "#A5B4FC" : "#334155", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 7 }}>
                  {tab.label}
                  {tab.count > 0 && <span style={{ fontSize: 10, background: activeView === tab.id ? "#6366F1" : "rgba(255,255,255,0.05)", color: activeView === tab.id ? "#fff" : "#334155", borderRadius: 20, padding: "1px 7px", fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{tab.count}</span>}
                </button>
              ))}
            </div>

            {activeView === "discover" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 22 }}>
                  <StatCard value={loading ? "…" : events.length} label="Events Found" accent="#6366F1" />
                  <StatCard value={SOURCES.length} label="Live Sources" accent="#34D399" />
                  <StatCard value={loading ? "…" : totalLiveTickets} label="Tickets Available" accent="#F59E0B" />
                  <StatCard value={wallet.length || "0"} label="In My Wallet" accent="#EC4899" />
                </div>

                <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 8, marginBottom: 14 }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setCategory(cat.id)} style={{ padding: "10px 16px", borderRadius: 8, border: `1px solid ${category === cat.id ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.06)"}`, background: category === cat.id ? "linear-gradient(135deg,rgba(99,102,241,0.22),rgba(139,92,246,0.13))" : "rgba(255,255,255,0.02)", color: category === cat.id ? "#A5B4FC" : "#334155", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", transition: "all 0.2s" }}>
                      <span>{cat.icon}</span>{cat.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 18 }}>
                  {DATE_FILTERS.map(f => (
                    <button key={f} onClick={() => setDateFilter(f)} style={{ padding: "7px 13px", borderRadius: 6, border: `1px solid ${dateFilter === f ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.05)"}`, background: dateFilter === f ? "rgba(99,102,241,0.1)" : "transparent", color: dateFilter === f ? "#A5B4FC" : "#334155", fontFamily: "'Space Mono',monospace", fontSize: 10, cursor: "pointer", fontWeight: 700, transition: "all 0.2s" }}>{f}</button>
                  ))}
                  <div style={{ width: 1, background: "rgba(255,255,255,0.05)", margin: "0 3px" }} />
                  {PRICE_FILTERS.map(f => (
                    <button key={f} onClick={() => setPriceFilter(p => p === f ? null : f)} style={{ padding: "7px 13px", borderRadius: 6, border: `1px solid ${priceFilter === f ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.05)"}`, background: priceFilter === f ? "rgba(52,211,153,0.08)" : "transparent", color: priceFilter === f ? "#34D399" : "#334155", fontFamily: "'Space Mono',monospace", fontSize: 10, cursor: "pointer", fontWeight: 700, transition: "all 0.2s" }}>{f}</button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#1E293B", letterSpacing: "0.1em", textTransform: "uppercase" }}>Live:</span>
                  {SOURCES.map(s => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, animation: "pulse 2s infinite" }} />
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "#1E293B", letterSpacing: "0.04em" }}>{s.label}</span>
                    </div>
                  ))}
                </div>

                {loading ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", gap: 16 }}>
                    <div style={{ width: 40, height: 40, border: "2px solid rgba(99,102,241,0.2)", borderTop: "2px solid #6366F1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: "#1E293B", letterSpacing: "0.1em", textTransform: "uppercase" }}>Scanning {SOURCES.length} sources in {city}…</p>
                  </div>
                ) : events.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "80px 0" }}>
                    <div style={{ fontSize: 48, marginBottom: 14 }}>🔍</div>
                    <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: "#1E293B", letterSpacing: "0.05em" }}>No events found</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "#334155", marginTop: 8 }}>Try a different city or category</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(330px,1fr))", gap: 16 }}>
                    {events.map((evt, i) => <EventCard key={evt.id || i} event={evt} index={i} onBook={handleBook} />)}
                  </div>
                )}

                <div onClick={() => setShowPremium(true)} style={{ marginTop: 32, borderRadius: 14, border: "1px solid rgba(167,139,250,0.18)", background: "linear-gradient(135deg,rgba(167,139,250,0.05),rgba(236,72,153,0.03))", padding: 28, textAlign: "center", cursor: "pointer" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>◆</div>
                  <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, letterSpacing: "0.05em", color: "#A78BFA", marginBottom: 8 }}>Unlock VIP Events & Early Access</h3>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "#475569", maxWidth: 400, margin: "0 auto 16px" }}>Premium members get exclusive drops, secret parties, and VIP listings before they sell out.</p>
                  <button style={{ padding: "12px 30px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#A78BFA,#EC4899)", color: "#fff", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Start Free Trial → €9.99/mo after</button>
                </div>
              </>
            )}

            {activeView === "wallet" && (
              <div>
                <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, letterSpacing: "0.04em", color: "#F8FAFC", marginBottom: 6 }}>My Ticket Wallet</h2>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#334155", marginBottom: 24 }}>
                  {wallet.length === 0 ? "Book an event — your ticket appears here instantly. No email. No download." : `${wallet.length} ticket${wallet.length > 1 ? "s" : ""} · Tap QR to enlarge · Show at the door`}
                </p>
                {wallet.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "80px 20px", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}>
                    <div style={{ fontSize: 56, marginBottom: 14 }}>🎟</div>
                    <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: "#1E293B", marginBottom: 8, letterSpacing: "0.05em" }}>No tickets yet</h3>
                    <button onClick={() => setActiveView("discover")} style={{ padding: "12px 26px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 10 }}>Browse Events →</button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 20 }}>
                    {wallet.map((t, i) => <TicketPass key={t.id} ticket={t} index={i} />)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {bookingEvent && <BookingModal event={bookingEvent} onClose={() => setBookingEvent(null)} onBook={handleBookConfirm} />}

      {showPremium && (
        <div onClick={() => setShowPremium(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(8px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0B1120", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 20, padding: 40, maxWidth: 460, width: "100%", animation: "fadeUp 0.35s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 26 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>◆</div>
              <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, letterSpacing: "0.05em", color: "#A78BFA" }}>VYBE Premium</h2>
              <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: "#334155", letterSpacing: "0.12em", marginTop: 4 }}>€9.99 / MONTH · CANCEL ANYTIME</p>
            </div>
            {[["◆", "VIP & secret events before public", "#A78BFA"], ["⚡", "48hr early access to ticket drops", "#FACC15"], ["🔔", "Real-time push alerts for your city", "#34D399"], ["♾", "Unlimited cities & saved events", "#6366F1"], ["🎟", "Member-only venue discounts", "#EC4899"], ["🔥", "Surge price protection — lock in base prices", "#F97316"]].map(([icon, text, color]) => (
              <div key={text} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 13 }}>
                <span style={{ fontSize: 18, color }}>{icon}</span>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "#94A3B8" }}>{text}</span>
              </div>
            ))}
            <button style={{ width: "100%", padding: 16, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#A78BFA,#EC4899)", color: "#fff", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 16, cursor: "pointer", marginTop: 22 }}>Start 7-Day Free Trial</button>
            <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: "#1E293B", textAlign: "center", marginTop: 12, letterSpacing: "0.05em" }}>Then €9.99/mo. Cancel anytime before trial ends.</p>
          </div>
        </div>
      )}
    </div>
  );
}
