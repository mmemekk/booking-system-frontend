import type { Metadata } from "next";
import { Noto_Sans_Thai, Prompt } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
});

const prompt = Prompt({
  variable: "--font-prompt",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Restaurant Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${notoSansThai.variable} ${prompt.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
