import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { ViewportVars } from "@/components/layout/ViewportVars";

// DM Sans (SIL OFL 1.1, see src/fonts/DMSans-OFL-LICENSE.txt): one variable file covers every weight we use.
const dmSans = localFont({
  src: [{ path: "../fonts/DMSans-Variable.woff2", weight: "100 1000", style: "normal" }],
  variable: "--font-dm-sans",
  display: "swap",
});

// Kept as the fallback while DM Sans loads.
const generalSans = localFont({
  src: [
    { path: "../fonts/GeneralSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/GeneralSans-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/GeneralSans-Semibold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-general-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MealPrep",
  description: "Private meal and nutrition tracker.",
  robots: { index: false, follow: false },
  // Add to Home Screen: manifest + iOS standalone metadata. No service worker on purpose: personal API
  // data is never cached on the device, so the app needs a connection like a normal tab.
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "MealPrep", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png", icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Android Chrome: the keyboard resizes the layout instead of covering it. Zoom stays enabled.
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0c0b0a" },
    { media: "(prefers-color-scheme: light)", color: "#f5f2ec" },
  ],
};

// Applies the saved theme before first paint so there is no flash.
const themeScript = `(function(){try{var t=localStorage.getItem("mealprep-theme")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.classList.toggle("light",!d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${generalSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-bg text-fg">
        <ViewportVars />
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
