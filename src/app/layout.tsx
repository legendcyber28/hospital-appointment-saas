import "./globals.css";
export const metadata = {
  title: "SwasthBook - hospital appointments on WhatsApp",
  description: "Patients find doctors, check fees, see slots and book appointments directly on WhatsApp - Hindi, English or Hinglish.",
  openGraph: {
    type: "website",
    url: "https://swasthbook-migrated.onrender.com/",
    title: "SwasthBook - hospital appointments on WhatsApp",
    description: "Patients find doctors, check fees, see slots and book appointments directly on WhatsApp - Hindi, English or Hinglish.",
    images: [{ url: "https://swasthbook-migrated.onrender.com/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SwasthBook - hospital appointments on WhatsApp",
    description: "Patients find doctors, check fees, see slots and book appointments directly on WhatsApp - Hindi, English or Hinglish.",
    images: ["https://swasthbook-migrated.onrender.com/og-image.jpg"],
  },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
