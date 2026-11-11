import { Heebo, Orbitron } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

export const metadata = {
  title: "GILOS +",
  description: "מעלים תמונות וסרטונים, ה-AI מחזיר 3 גרסאות ערוכות, ואתם בוחרים מה לפרסם ומתי.",
  applicationName: "GILOS",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "GILOS", statusBarStyle: "black-translucent" },
};

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${orbitron.variable}`}>
      <body>{children}</body>
    </html>
  );
}
