import "./globals.css";
export const metadata = { title: "SwasthBook - Hospital Appointment SaaS", description: "WhatsApp-first appointment platform for hospitals and clinics" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
