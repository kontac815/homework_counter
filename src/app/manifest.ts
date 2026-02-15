import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "提出物ポイント管理",
    short_name: "提出ポイント",
    description: "提出物ポイント管理アプリ",
    start_url: "/scan",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#2563eb",
    icons: []
  };
}
