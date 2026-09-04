import "./globals.css";

export const metadata = {
  title: "SMAct — Activation Service",
  description: "Υπηρεσία ενεργοποίησης Service Manager Pro",
};

export default function RootLayout({ children }) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  );
}
