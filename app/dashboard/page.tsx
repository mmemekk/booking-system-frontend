"use client";

import { useEffect } from "react";
import { useTopBar } from "../../component/topbarContext";

export default function Dashboard() {
  const { setTopBar } = useTopBar();

  useEffect(() => {
    setTopBar(
      "Dashboard",
      <div className="flex gap-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          Add Booking
        </button>
      </div>,
    );
  }, []);

  return (
    <div className="flex flex-col p-4">
    
      
    </div>
  );
}
