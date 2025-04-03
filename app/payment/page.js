"use client";

import React, { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const columns = [
  "room_no",
  "month",
  "light_bill",
  "total_amount",
  "paid_amount",
  "remaining",
];

const columnHeaders = {
  room_no: "RNo",
  month: "Month",
  light_bill: "Light",
  total_amount: "Total",
  paid_amount: "Paid",
  remaining: "Remain",
};

const nonEditableColumns = new Set([
  "room_no",
  "month",
  "light_bill",
  "total_amount",
  "remaining",
]);

const Payment = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const editRef = useRef(null);
  // real time updates
  useEffect(() => {
    const fetchData = async () => {
      try {
        let { data: fetchedData, error } = await supabase
          .from("payment")
          .select("*")
          .order("room_no", { ascending: true });

        if (error) throw error;
        setData(fetchedData || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to Supabase Realtime
    const channel = supabase
      .channel("payment_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment" },
        (payload) => {
          console.log("Realtime Update:", payload);

          setData((prevData) => {
            if (payload.eventType === "INSERT") {
              return [...prevData, payload.new]; // Add new row
            }
            if (payload.eventType === "UPDATE") {
              return prevData.map((row) =>
                row.id === payload.new.id ? payload.new : row
              ); // Update row
            }
            if (payload.eventType === "DELETE") {
              return prevData.filter((row) => row.id !== payload.old.id); // Remove row
            }
            return prevData;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDoubleClick = (id, column) => {
    setEditingCell({ id, column });

    setTimeout(() => {
      if (editRef.current) {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(editRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }, 0);
  };
  const handleBlur = (id, column, newValue) => {
    if (!data) return;
    const oldRow = data.find((row) => row.id === id);
    const oldValue = oldRow[column];

    if (newValue.trim() !== oldValue.toString().trim()) {
      const updatedRow = { ...oldRow, [column]: newValue };

      // Calculate remaining = total_amount - paid_amount
      if (column === "paid_amount") {
        updatedRow.remaining =
          parseFloat(updatedRow.total_amount) - parseFloat(newValue);
      }

      setData((prevData) =>
        prevData.map((row) => (row.id === id ? updatedRow : row))
      );

      // Send update to Supabase
      fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/payment?id=eq.${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            [column]: newValue,
            remaining: updatedRow.remaining, // Update remaining as well
          }),
        }
      )
        .then((res) => {
          if (!res.ok) throw new Error("Failed to update data");
          return res.json();
        })
        .then((updatedData) => {
          setEditingCell(null);
          setData((prevData) =>
            prevData.map((row) => (row.id === id ? updatedData[0] : row))
          );
        })
        .catch((err) => alert(`Error updating: ${err.message}`));
    }

    setEditingCell(null);
  };

  return (
    <main>
      <div className="text-center text-2xl font-bold text-green-300 mb-4">
        Payments
      </div>
      <div className="overflow-x-auto px-2 flex flex-wrap justify-center">
        <table className="table-auto border-collapse border border-gray-800 lg:w-full md:w-full select-none">
          <thead className="bg-green-300">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="border border-gray-800 text-center md:p-2"
                >
                  {columnHeaders[column] || column}
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
                      className={`border border-gray-800 text-center p-2 ${
                        column === "paid_amount" ? "text-green-500" : ""
                      } ${
                        column === "paid_amount" &&
                        editingCell?.id === row.id &&
                        editingCell?.column === column
                          ? "font-bold"
                          : ""
                      }`}
                      contentEditable={
                        !nonEditableColumns.has(column) &&
                        editingCell?.id === row.id &&
                        editingCell?.column === column
                      }
                      suppressContentEditableWarning={true}
                      ref={
                        editingCell?.id === row.id &&
                        editingCell?.column === column
                          ? editRef
                          : null
                      }
                      onDoubleClick={() => {
                        if (!nonEditableColumns.has(column)) {
                          handleDoubleClick(row.id, column);
                        }
                      }}
                      onBlur={(e) => {
                        if (!nonEditableColumns.has(column)) {
                          handleBlur(row.id, column, e.target.innerText);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.target.blur();
                      }}
                    >
                      {row[column]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center text-gray-500 p-4"
                >
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
};

export default Payment;
