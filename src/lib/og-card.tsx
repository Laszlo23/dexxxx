import { ImageResponse } from "next/og";
import { BRAND } from "@/config/brand";

export const ogSize = { width: 1200, height: 630 };

export function deskCard(input: { kicker: string; title: string; line: string; image?: string }) {
  const picture =
    input.image?.startsWith("https://") || input.image?.startsWith("data:image/") ? input.image : "";
  const titleSize = picture ? 52 : 76;
  const lineSize = picture ? 28 : 32;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#090b08",
          color: "#f4f6ec",
        }}
      >
        {picture ? (
          <img src={picture} alt="" width={420} height={630} style={{ width: 420, height: 630, objectFit: "contain", backgroundColor: "#090b08" }} />
        ) : null}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: picture ? 780 : 1200,
            height: "100%",
            padding: picture ? "48px" : "64px",
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
        <div style={{ display: "flex", marginTop: picture ? 36 : 56, fontSize: titleSize, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1 }}>
          {input.title}
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: lineSize, color: "#9aa392", lineHeight: 1.3 }}>{input.line}</div>
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
      </div>
    ),
    {
      ...ogSize,
      headers: { "Cache-Control": "public, max-age=3600" },
    },
  );
}
