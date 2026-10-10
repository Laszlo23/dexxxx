import { ImageResponse } from "next/og";
import { BRAND } from "@/config/brand";

export const ogSize = { width: 1200, height: 630 };

export function deskCard(input: { kicker: string; title: string; line: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#090b08",
          color: "#f4f6ec",
          padding: "64px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              backgroundColor: "#dff25a",
              color: "#090b08",
              borderRadius: "18px",
              padding: "14px 22px",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            dx
          </div>
          <div style={{ display: "flex", color: "#f0b45a", fontSize: 26, letterSpacing: 2 }}>{input.kicker}</div>
        </div>
        <div style={{ display: "flex", marginTop: 56, fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1 }}>
          {input.title}
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 32, color: "#9aa392", lineHeight: 1.3 }}>{input.line}</div>
        <div style={{ display: "flex", flexGrow: 1 }} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid #2c3324",
            paddingTop: 24,
            color: "#dff25a",
            fontSize: 24,
          }}
        >
          <div style={{ display: "flex" }}>{BRAND}</div>
          <div style={{ display: "flex" }}>Robinhood Chain 4663</div>
        </div>
      </div>
    ),
    {
      ...ogSize,
      headers: { "Cache-Control": "public, max-age=3600" },
    },
  );
}
