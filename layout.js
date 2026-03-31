export const metadata = {
  title: "VYBE — Discover Events Near You",
  description: "Find parties, concerts, clubs and events in your city. Book direct. No downloads.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #020408; color: #F8FAFC; font-family: 'DM Sans', sans-serif; }
          ::-webkit-scrollbar { width: 3px; }
          ::-webkit-scrollbar-track { background: #0A0F1E; }
          ::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 2px; }
          input:focus { outline: none; }
          input::placeholder { color: #1E293B; }
          @keyframes fadeUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
          @keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
          @keyframes popIn { from { transform:scale(0.5); opacity:0 } to { transform:scale(1); opacity:1 } }
          @keyframes spin { to { transform:rotate(360deg) } }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
