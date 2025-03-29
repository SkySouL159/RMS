import "@/app/globals.css"; // ✅ Correct import for App Router
import Tab from "@/Components/Tab";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Tab />
        {children}
      </body>
    </html>
  );
}
