"use client";

import React, { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const columns = [
  "room_number",
  "month",
  "previous_reading",
  "current_reading",
  "point",
  "bill_amount",
];

const columnHeaders = {
  room_number: "RNo",
  month: "Month",
  previous_reading: "Pre",
  current_reading: "Curr",
  point: "Point",
  bill_amount: "Bill",
};

const nonEditableColumns = new Set([
  "room_number",
  "month",
  "point",
  "bill_amount",
]);

const Light = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const editRef = useRef(null);

  const fetchData = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/lightbill`,
        {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch data");

      const fetchedData = await res.json();
      const updatedData = fetchedData
        .map((row) => ({
          ...row,
          point: (
            row.current_reading - parseFloat(row.previous_reading)
          ).toFixed(2),
        }))
        .sort((a, b) => a.room_number - b.room_number);

      setData(updatedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Realtime Subscription
    const channel = supabase
      .channel("lightbill")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lightbill" },
        (payload) => {
          console.log("Realtime update:", payload);
          fetchData(); // Refresh data on change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel); // Cleanup on unmount
    };
  }, []);

  const handleDoubleClick = (id, column) => {
    if (!nonEditableColumns.has(column)) setEditingCell({ id, column });
    setTimeout(() => editRef.current?.focus(), 0);
  };

  const handleBlur = async (id, column, newValue) => {
    const row = data.find((row) => row.id === id);
    if (!row || newValue.trim() === row[column].toString().trim()) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/lightbill?id=eq.${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            Prefer: "return=representation",
          },
          body: JSON.stringify({ [column]: newValue }),
        }
      );

      if (!res.ok) throw new Error("Failed to update data");
      const updatedData = await res.json();
      setData((prevData) =>
        prevData.map((row) =>
          row.id === id
            ? {
                ...updatedData[0],
                point: (
                  updatedData[0].current_reading -
                  updatedData[0].previous_reading
                ).toFixed(0),
              }
            : row
        )
      );
    } catch (err) {
      alert(`Error updating: ${err.message}`);
    } finally {
      setEditingCell(null);
    }
  };

  const totalBill = data.reduce(
    (sum, row) => sum + (parseFloat(row.bill_amount) || 0),
    0
  );
  const totalPoints = data.reduce(
    (sum, row) => sum + (parseFloat(row.point) || 0),
    0
  );

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <main>
      <div className="text-center text-2xl font-bold text-green-300 mb-4">
        Light Bills
      </div>
      <div className="overflow-x-auto px-2 flex justify-center">
        <table className="table-auto border-collapse border border-gray-800 w-full">
          <thead className="bg-green-300">
            <tr>
              {columns.map((column) => (
                <th key={column} className="border border-gray-800 p-2">
                  {columnHeaders[column]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td
                      key={`${row.id}-${column}`}
                      className={`border border-gray-800 p-2 text-center ${
                        column === "previous_reading"
                          ? "text-red-500"
                          : column === "current_reading"
                          ? "text-green-500"
                          : ""
                      }`}
                      contentEditable={
                        editingCell?.id === row.id &&
                        editingCell?.column === column &&
                        !nonEditableColumns.has(column)
                      }
                      suppressContentEditableWarning
                      ref={
                        editingCell?.id === row.id &&
                        editingCell?.column === column
                          ? editRef
                          : null
                      }
                      onDoubleClick={() => handleDoubleClick(row.id, column)}
                      onBlur={(e) =>
                        handleBlur(row.id, column, e.target.innerText)
                      }
                      onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                    >
                      {row[column]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-4 text-center">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
};

export default Light;
