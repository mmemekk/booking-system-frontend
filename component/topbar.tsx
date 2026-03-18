"use client"
import { useTopBar } from "./topbarContext"

export default function TopBar() {
    const { title, rightContent } = useTopBar()
    return (
        <header className="fixed top-0 left-64 right-0 z-10 flex items-center justify-between border-b border-border px-6 py-3 bg-white ">

        {/* Left */}
        <h1 className="text-xl font-bold text-grey-heading">
            {title}
        </h1>

        {/* Right (dynamic) */}
        <div className="flex items-center gap-4">
            {rightContent}

            {/* Common items */}
            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        </div>

        </header>
    )
}