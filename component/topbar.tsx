"use client";
import { useTopBar } from "./topbarContext";

export default function TopBar() {
  const { title, rightContent } = useTopBar();
  return (
    <header className="fixed top-0 left-64 right-0 z-10 flex h-16 items-center justify-between border-b border-border px-6 bg-white">
      {/* Left */}
      <h1 className="text-xl font-bold text-grey-heading">{title}</h1>

      {/* Right (dynamic) */}
      <div className="flex items-center gap-4">{rightContent}</div>
    </header>
  );
}
