import './globals.css';

export const metadata = {
  title: 'Funny Gadgets — małe gadżety, wielka frajda',
  description: 'Funny Gadgets — małe gadżety, wielka frajda. Odkryj rzeczy, które podkręcają codzienność. Pokazowy sklep z trzema przykładowymi produktami.',
  icons: { icon: '/assets/favicon.svg' },
};

export const viewport = { themeColor: '#f33b2f' };

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
