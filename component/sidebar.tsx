"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Utensils, LayoutDashboard, CalendarDays, CalendarCheck, UtensilsCrossed, Settings, HelpCircle } from "lucide-react"

export default function Sidebar() {
  const pathname = usePathname()

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Bookings",
      href: "/bookings",
      icon: CalendarDays,
    },
    {
      name: "Availabilities",
      href: "/availabilities",
      icon: CalendarCheck,
    },
    {
      name: "Tables",
      href: "/tables",
      icon: UtensilsCrossed,
    },
  ]

  const bottomItems = [
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
    {
      name: "Help",
      href: "/dashboard/help",
      icon: HelpCircle,
    },
  ]

  return (
    <aside className="fixed flex flex-col left-0 w-64 h-screen border-r border-border bg-white justify-between p-4 z-10">
      
      {/* TOP SECTION */}
      <div>

        {/* Logo */}
        <div className="flex justify-center items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            <Utensils size={20} />
          </div>

          <div>
            <p className="font-semibold text-grey-heading">The Grand Eatery</p>
            <p className="text-sm text-grey-muted">Restaurant Dashboard</p>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition
                  
                  ${
                    isActive
                      ? "bg-blue-light text-blue"
                      : "text-grey-text hover:bg-gray-100"
                  }
                `}
              >
                <Icon size={20} />
                {item.name}
              </Link>
            )
          })}
        </nav>

      </div>

      {/* BOTTOM SECTION */}
      <div className="flex flex-col gap-2">
        {bottomItems.map((item) => {
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-grey-text hover:bg-gray-100"
            >
              <Icon size={20} />
              {item.name}
            </Link>
          )
        })}
      </div>

    </aside>
  )
}