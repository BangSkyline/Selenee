import './globals.css'

export const metadata = {
  title: 'Sélénée | Cosmos',
  description: 'Cosmos.Corp Ressource Management System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
