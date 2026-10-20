import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Transcreate",
  description:
    "Translate cultural references, not just words. An agent that uses Qloo's taste graph to find what plays the same role for audiences in another city.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
