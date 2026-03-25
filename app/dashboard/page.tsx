"use client";

import { useEffect } from "react";
import { useTopBar } from "../../component/topbarContext";
import {PeopleAlt, TableRestaurantOutlined, Check, Close} from "@mui/icons-material";

interface Booking {
  id: string;
  time: string;
  partyName: string;
  partySize: number;
  tableNumber: number;
  isCurrent?: boolean;
}

const mockBookings: Booking[] = [
  {
    id: "1",
    time: "6:30",
    partyName: "Miller Party",
    partySize: 4,
    tableNumber: 5,
    isCurrent: true,
  },
  {
    id: "2",
    time: "7:00",
    partyName: "Smith Party",
    partySize: 2,
    tableNumber: 2,
  },
  {
    id: "3",
    time: "7:00",
    partyName: "Jones Party",
    partySize: 6,
    tableNumber: 3,
  },
  {
    id: "4",
    time: "7:30",
    partyName: "Davis Party",
    partySize: 2,
    tableNumber: 4,
  },
  {
    id: "5",
    time: "8:00",
    partyName: "Taylor Party",
    partySize: 8,
    tableNumber: 12,
  },
  {
    id: "6",
    time: "8:15",
    partyName: "Brown Party",
    partySize: 3,
    tableNumber: 7,
  },
    {
    id: "7",
    time: "8:15",
    partyName: "Brown Party",
    partySize: 3,
    tableNumber: 7,
  },
    {
    id: "8",
    time: "8:15",
    partyName: "Brown Party",
    partySize: 3,
    tableNumber: 7,
  },
];

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
  }, [setTopBar]);

  return (
    <div className="flex flex-col p-8 gap-6">
      {/* metric */}
      <div className="flex gap-5 justify-between items-center">
        <div className="flex flex-col bg-white border border-border rounded-lg p-4 w-full">
          metric1
        </div>

        <div className="flex flex-col bg-white border border-border rounded-lg p-4 w-full">
          metric2
        </div>

        <div className="flex flex-col bg-white border border-border rounded-lg p-4 w-full">
          metric3
        </div>
      </div>

      {/* timeline view */}

      <div>
        <div className="flex flex-col bg-white border border-border rounded-lg p-4 gap-4 w-full">
          <h1 className="text-lg text-grey-heading text-bold font-bold ">
            Upcoming Bookings
          </h1>

          <div className="flex flex-col gap-4 overflow-y-auto">
            {mockBookings.map((booking) => (
              <div
                key={booking.id}
                className={"group flex items-center gap-4 rounded-lg p-3 border border-border hover:bg-blue-light hover:border-blue-stroke"}>
                {/* time */}
                <div className="flex flex-col items-center justify-center rounded-md bg-gray-100 p-3 group-hover:bg-white">
                  <span className="text-lg font-bold text-grey-heading group-hover:text-blue-dark">
                    {booking.time}
                  </span>
                </div>

                {/* booking info */}
                <div className="flex flex-col gap-2">
                  <p className=" font-semibold text-grey-heading group-hover:text-blue-dark">
                    {booking.partyName}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-grey-text">
                    <div className="flex items-center gap-1.5">
                      <PeopleAlt  sx={{fontSize:18,  color: 'var(--color-grey-text)'}}/>
  
                      <span>{booking.partySize} people</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TableRestaurantOutlined  sx={{fontSize:18, color: 'var(--color-grey-text)' }}/>
                      <span>Table {booking.tableNumber}</span>
                    </div>
                  </div>
                </div>
                
                {/* button */}
                <div className="ml-auto mr-4 flex items-center gap-9">
                  <button className="flex items-center p-1 justify-center rounded-full text-green-600 opacity-80 hover:bg-green-light">
                    <Check sx={{fontSize:22}}/>
                  </button>
                  <button className="flexitems-center p-1 justify-center rounded-full text-red-600 opacity-80 hover:bg-red-light">
                    <Close sx={{fontSize:22}}/>
                  </button>
                </div>

              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
