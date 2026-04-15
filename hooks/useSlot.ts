"use client";

import { useEffect, useState } from "react";
import { config } from "../config";

export function useSlot() {
  const [slot, setSlot] = useState<number>(30);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSlot = async () => {
      try {
        const response = await fetch(
          `${config.baseUrl}/restaurant/${config.restaurantId}`,
        );
        if (response.ok) {
          const data = await response.json();
          setSlot(data.restaurant?.slotDuration || 30);
        }
      } catch (error) {
        console.error("Failed to fetch slot:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSlot();
  }, []);

  return { slot, isLoading };
}
