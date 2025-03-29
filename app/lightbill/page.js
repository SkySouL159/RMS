"use client";

import React, { useEffect, useState, useRef } from "react";

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

  useEffect(() => {
    let isMounted = true;

    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/lightbill`, {
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
          const updatedData = fetchedData
            .map((row) => ({
              ...row,
              point: (
                row.current_reading - parseFloat(row.previous_reading)
              ).toFixed(2),
            }))
            .sort((a, b) => a.room_number - b.room_number); // Sort by room_number

          setData(updatedData);
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
  }, []); // ✅ Use empty dependency array to fetch once
  //* 👈 This ensures re-fetching when `data` changes

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
      const updatedRow = {
        ...data.find((row) => row.id === id),
        [column]: newValue,
      };

      fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/lightbill?id=eq.${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            Prefer: "return=representation", // Ensures updated data is returned
          },
          body: JSON.stringify({ [column]: newValue }),
        }
      )
        .then((res) => {
          if (!res.ok) throw new Error("Failed to update data");
          return res.json(); // Supabase returns updated data
        })
        .then((updatedData) => {
          setEditingCell(null);
          setData((prevData) =>
            prevData.map((row) =>
              row.id === id
                ? {
                    ...updatedData[0], // Supabase returns an array of updated data
                    point: (
                      updatedData[0].current_reading -
                      parseFloat(updatedData[0].previous_reading)
                    ).toFixed(0),
                  }
                : row
            )
          );
        })
        .catch((err) => alert(`Error updating: ${err.message}`));
    }

    setEditingCell(null);
  };

  // * calculate total bill amount and total point
  const totalBill = data.reduce(
    (sum, row) => sum + parseFloat(row.bill_amount || 0),
    0
  );

  const totalPoints = data.reduce(
    (sum, row) => sum + parseFloat(row.point || 0),
    0
  );

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <main>
      <div className="text-center text-2xl font-bold text-green-300 mb-4">
        Light Bills
      </div>
      <div className="overflow-x-auto px-2 flex flex-wrap justify-center">
        <table className="table-auto border-collapse border border-gray-800 md:w-full lg:w-full  select-none">
          <thead className="bg-green-300">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="border border-gray-800 text-center select-none md:p-2"
                >
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
                      className={`border border-gray-800 text-center select-none p-2 ${
                        column === "previous_reading" ? "text-red-500" : ""
                      } ${
                        column === "current_reading" ? "text-green-500" : ""
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
        <div className="mt-4 text-lg font-bold text-center text-green-300">
          <p>
            Total Bill:{" "}
            <span className="text-white">₹{totalBill.toFixed(0)}</span>
          </p>
          <p>
            Total Points:{" "}
            <span className="text-white">{totalPoints.toFixed(0)}</span>
          </p>
        </div>
      </div>
    </main>
  );
};

export default Light;
