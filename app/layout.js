export const metadata = {
  title: "SMAct",
  description: "SMAct activation website",
};

export default function RootLayout({ children }) {
  return (
    <html lang="el">
      <body
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          margin: 0,
          padding: 0,
          background: "#f5f5f7",
          color: "#1d1d1f",
        }}
      >
        {children}
      </body>
    </html>
  );
}
