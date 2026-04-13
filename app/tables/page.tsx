"use client";

import { useEffect } from "react";
import { useTopBar } from "../../component/topbarContext";

export default function Tables() {
  const { setTopBar } = useTopBar();

  useEffect(() => {
    setTopBar(
      "Tables",
      <div className="flex gap-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition cursor-pointer">
          Add Booking
        </button>
      </div>,
    );
  }, []);

  return <div>Bookings Page</div>;
}
