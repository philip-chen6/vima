"use client";

import { type ReactNode } from "react";

/**
 * desktop: renders children inside a 390x844 iphone-shaped bezel.
 * mobile: full-bleed pass-through.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <>
      {/* mobile: just render full-bleed */}
      <div className="md:hidden fixed inset-0 overflow-hidden">{children}</div>

      {/* desktop: bezel */}
      <div className="hidden md:flex fixed inset-0 items-center justify-center p-8">
        <div
          className="relative"
          style={{
            width: 412,
            height: 868,
            borderRadius: 56,
            padding: 11,
            background:
              "linear-gradient(180deg, #1a1a22 0%, #0a0a0a 40%, #13131a 100%)",
            boxShadow:
              "0 60px 120px -20px rgb(0 0 0 / 0.7), 0 30px 60px -30px rgb(255 184 200 / 0.18), inset 0 1px 0 rgb(255 255 255 / 0.06), inset 0 0 0 1px rgb(255 255 255 / 0.04)",
          }}
        >
          {/* outer ring highlight */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              borderRadius: 56,
              padding: 1,
              background:
                "linear-gradient(180deg, rgb(255 209 222 / 0.18), transparent 30%, transparent 70%, rgb(255 184 200 / 0.10))",
              WebkitMask:
                "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />

          {/* screen */}
          <div
            className="relative overflow-hidden"
            style={{
              width: 390,
              height: 846,
              borderRadius: 46,
              background: "var(--color-bg-deep)",
            }}
          >
            {/* dynamic island */}
            <div
              className="absolute left-1/2 -translate-x-1/2 z-50"
              style={{
                top: 11,
                width: 124,
                height: 36,
                borderRadius: 20,
                background: "#000",
                boxShadow: "0 0 0 1px rgb(255 255 255 / 0.04)",
              }}
            />
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
