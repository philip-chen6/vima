"use client";

import { useEffect, useState } from "react";

const LINE = "rgba(242,167,184,0.18)";
const WASHI = "#f7ecef";
const TEXT_MUTED = "rgba(247,236,239,0.42)";
const SAKURA = "#f2a7b8";
const LANTERN = "#ffd3a6";
const RED = "#ef476f";

const feed = [
  "frame 018: CII=P confidence=0.94 zone=a",
  "pose solve: 1,770 COLMAP anchors registered",
  "frame 021: mortar handling verified",
  "zone b: scaffold edge productive=76.1%",
  "settlement: 11 raffle tickets unlocked",
  "audit packet: frame, reason, zone, confidence",
];

const bars = [8, 18, 12, 24, 16, 30, 11, 22, 14, 27, 10, 19, 13, 25, 17, 21];

export default function VimaTelemetryFeed() {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [cursor, setCursor] = useState(true);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const message = feed[index];
    let character = 0;

    const typer = window.setInterval(() => {
      character += 1;
      setTyped(message.slice(0, character));

      if (character >= message.length) {
        window.clearInterval(typer);
        window.setTimeout(() => {
          setLog((current) => [...current.slice(-2), message]);
          setIndex((current) => (current + 1) % feed.length);
        }, 760);
      }
    }, 28);

    return () => window.clearInterval(typer);
  }, [index]);

  useEffect(() => {
    const blink = window.setInterval(() => setCursor((current) => !current), 480);
    return () => window.clearInterval(blink);
  }, []);

  return (
    <section
      data-gsap="section"
      style={{
        position: "relative",
        zIndex: 3,
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "0 clamp(20px, 5vw, 48px) clamp(32px, 5vw, 64px)",
      }}
    >
      <div
        className="landing-telemetry"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 1.2fr) 0.8fr 0.8fr 0.8fr",
          borderTop: `1px solid ${LINE}`,
          borderBottom: `1px solid ${LINE}`,
          background: "rgba(8,5,3,0.52)",
        }}
      >
        <div data-gsap="panel" style={{ minHeight: "128px", padding: "14px", borderRight: `1px solid ${LINE}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <span style={{ color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.04em" }}>live capture feed</span>
            <span style={{ color: SAKURA, fontSize: "10px", fontVariantNumeric: "tabular-nums" }}>24 fps</span>
          </div>
          <div style={{ marginTop: "14px", display: "grid", gap: "5px", minHeight: "48px" }}>
            {log.map((entry) => (
              <p
                key={entry}
                style={{
                  margin: 0,
                  color: "rgba(247,236,239,0.30)",
                  fontSize: "11px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <span style={{ color: "rgba(242,167,184,0.38)", marginRight: "7px" }}>›</span>
                {entry}
              </p>
            ))}
          </div>
          <div style={{ marginTop: "9px", display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ color: "rgba(242,167,184,0.44)", fontSize: "11px" }}>›</span>
            <span style={{ color: SAKURA, fontSize: "11px" }}>{typed}</span>
            <span
              aria-hidden
              style={{
                width: "6px",
                height: "13px",
                background: SAKURA,
                opacity: cursor ? 0.78 : 0,
                transition: "opacity 100ms ease",
              }}
            />
          </div>
        </div>

        <div data-gsap="panel" style={{ minHeight: "128px", padding: "14px", borderRight: `1px solid ${LINE}` }}>
          <div style={{ color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.04em" }}>CII waveform</div>
          <div style={{ marginTop: "30px", display: "flex", alignItems: "end", gap: "4px", height: "38px" }}>
            {bars.map((height, barIndex) => (
              <span
                key={`${height}-${barIndex}`}
                className="vima-wave-bar"
                style={{
                  width: "3px",
                  height,
                  background: barIndex % 7 === 0 ? RED : barIndex % 4 === 0 ? LANTERN : SAKURA,
                  opacity: 0.74,
                  animationDelay: `${barIndex * 70}ms`,
                }}
              />
            ))}
          </div>
          <div style={{ marginTop: "14px", color: TEXT_MUTED, fontSize: "11px" }}>P / C / NC sampled timeline</div>
        </div>

        <div data-gsap="panel" style={{ minHeight: "128px", padding: "14px", borderRight: `1px solid ${LINE}` }}>
          <div style={{ color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.04em" }}>zone packet</div>
          <div style={{ marginTop: "24px", display: "grid", gap: "8px", fontVariantNumeric: "tabular-nums" }}>
            {["zone a 92.4%", "zone b 76.1%", "zone c 88.8%"].map((zone) => (
              <div key={zone} style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <span style={{ color: WASHI, fontSize: "12px" }}>{zone.slice(0, 6)}</span>
                <span style={{ color: SAKURA, fontSize: "12px" }}>{zone.slice(7)}</span>
              </div>
            ))}
          </div>
        </div>

        <div data-gsap="panel" style={{ minHeight: "128px", padding: "14px" }}>
          <div style={{ color: TEXT_MUTED, fontSize: "10px", letterSpacing: "0.04em" }}>settlement</div>
          <div
            data-gsap-active="true"
            style={{
              marginTop: "24px",
              color: WASHI,
              fontSize: "26px",
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              textShadow: "0 0 18px rgba(242,167,184,0.18)",
            }}
          >
            11
          </div>
          <div style={{ marginTop: "8px", color: TEXT_MUTED, fontSize: "11px" }}>tickets unlocked</div>
        </div>
      </div>
    </section>
  );
}
