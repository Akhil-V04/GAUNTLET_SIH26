import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gauntlet | Every report deserves a resolution",
  description: "Report neighbourhood issues, connect the history, and track action through verified resolution. Built by Team Gauntlet.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
