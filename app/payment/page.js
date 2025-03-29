"use client";

import React, { useEffect, useState, useRef } from "react";

const columns = [
  "room_no",
  "month",
  "light_bill",
  "total_amount",
  "paid_amount",
  "remaining",
]; // Define columns as needed

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
]); // Make all columns non-editable except 'paid_amount'

const Payment = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const editRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/payment`, {
      method: "GET",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch data");
        return res.json();
      })
      .then((fetchedData) => {
        if (isMounted) {
          const sortedData = fetchedData.sort((a, b) => a.room_no - b.room_no); // Sort by room_no
          setData(sortedData); // Update data as needed
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
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
    const oldValue = data.find((row) => row.id === id)[column];

    if (newValue.trim() !== oldValue.toString().trim()) {
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
          body: JSON.stringify({ [column]: newValue }),
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

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <main>
      <div className="text-center text-2xl font-bold text-green-300 mb-4">
        Payments
      </div>
      <div className="overflow-x-auto px-2 flex flex-wrap justify-center">
        <table className="table-auto border-collapse border border-gray-800  lg:w-full md:w-full select-none">
          <thead className="bg-green-300">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="border border-gray-800 text-center select-none md:p-2"
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
                      className={`border border-gray-800 text-center select-none p-2 ${
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
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="total"></div>
      </div>
    </main>
  );
};

export default Payment;
