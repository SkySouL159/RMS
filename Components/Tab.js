"use client";
import Link from "next/link";
import React, { useState } from "react";

const tabs = [
  { name: "Light", icon: "💡", href: "/lightbill" },
  { name: "Money", icon: "💰", href: "/payment" },
  { name: "People", icon: "👥", href: "/people" },
];

const Tab = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="flex justify-center space-x-4 m-4">
      {tabs.map((item, index) => (
        <Link
          href={item.href}
          key={item.name}
          onClick={() => setActiveTab(index)}
          className={`p-4 border-2 border-green-300 rounded-md flex items-center space-x-2 ${
            activeTab === index ? "bg-green-300 text-white" : ""
          }`}
        >
          <span>{item.icon}</span>
          <span>{item.name}</span>
        </Link>
      ))}
    </div>
  );
};

export default Tab;
