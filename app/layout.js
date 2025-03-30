import "@/app/globals.css"; // ✅ Correct import for App Router
import Tab from "@/Components/Tab";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata = {
  title: "RMS",
  description: "Room management system",
  icons: {
    icon: "/favicon.ico", // ✅ Favicon
    apple: "/favicon.ico", // Optional for Apple devices
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Tab />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
