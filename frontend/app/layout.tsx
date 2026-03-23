import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Folia", template: "%s · Folia" },
  description: "The financial life OS for every age and stage.",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#080b0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorBackground: "#0e1217",
          colorInputBackground: "#141920",
          colorPrimary: "#22d47e",
          colorText: "#f1f3f7",
          colorTextSecondary: "#8892a4",
          colorNeutral: "#49535f",
          colorDanger: "#ff5555",
          borderRadius: "10px",
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontFamilyButtons: "'DM Sans', system-ui, sans-serif",
          fontSize: "14px",
        },
        elements: {
          card: "bg-transparent border border-[var(--b1)] shadow-none",
          headerTitle: "text-[var(--t1)] font-bold tracking-tight",
          headerSubtitle: "text-[var(--t3)]",
          formButtonPrimary:
            "bg-[var(--green)] text-[#041a0c] font-semibold hover:bg-[#2be889]",
          footerActionLink: "text-[var(--green)]",
          identityPreviewText: "text-[var(--t2)]",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body>
          <ToastProvider>{children}</ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
