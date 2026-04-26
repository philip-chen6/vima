import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 42%, #281118 0%, #0a0a0a 58%, #050505 100%)",
          color: "#ffc9d4",
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: 56,
          fontWeight: 500,
          letterSpacing: 0,
        }}
      >
        V
      </div>
    ),
    size
  );
}
