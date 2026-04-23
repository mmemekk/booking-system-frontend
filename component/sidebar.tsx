"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Utensils,
  LayoutDashboard,
  CalendarDays,
  CalendarCheck,
  Settings,
  HelpCircle,
} from "lucide-react";
import { TableRestaurantOutlined } from "@mui/icons-material";
import { config } from "../config";

const baseUrl = config.baseUrl;
const restaurantId = config.restaurantId;

export default function Sidebar() {
  const pathname = usePathname();

  // State to hold the dynamic restaurant name
  const [restaurantName, setRestaurantName] = useState();

  useEffect(() => {
    const fetchRestaurantName = async () => {
      try {
        const response = await fetch(`${baseUrl}/restaurant/${restaurantId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.restaurant && data.restaurant.name) {
            setRestaurantName(data.restaurant.name);
          }
        }
      } catch (error) {
        console.error("Failed to fetch restaurant name:", error);
      }
    };

    fetchRestaurantName();
  }, []);

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
      icon: TableRestaurantOutlined,
    },
  ];

  const bottomItems = [
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
    },
    {
      name: "Help",
      href: "/help",
      icon: HelpCircle,
    },
  ];

  return (
    <aside className="fixed flex flex-col left-0 w-64 h-screen border-r border-border bg-white justify-between p-4 z-10">
      {/* TOP SECTION */}
      <div>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 shrink-0 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
            <Utensils size={20} />
          </div>

          <div className="flex flex-col justify-center overflow-hidden">
            <p
              className="font-bold text-gray-900 truncate"
              title={restaurantName}
            >
              {restaurantName}
            </p>
            <p className="text-xs font-medium text-gray-500  tracking-wider truncate">
              Restaurant Dashboard
            </p>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition
                  
                  ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }
                `}
              >
                <Icon size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* BOTTOM SECTION */}
      <div className="flex flex-col gap-2">
        <div className="w-full h-px bg-gray-100 mb-2" />
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition
                ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }
              `}
            >
              <Icon size={20} />
              {item.name}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
