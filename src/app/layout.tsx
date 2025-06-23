
"use client"; // Convertido a Client Component para usar usePathname

// import type { Metadata } from 'next'; // Ya no es necesario importar Metadata
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// La exportación de 'metadata' se elimina porque este es un Client Component.
// export const metadata: Metadata = {
//   title: 'ExamSecure',
//   description: 'Plataforma Segura de Evaluación en Línea',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isPrintPage = pathname.includes("/print");

  return (
    <html lang="es-AR">
      <head>
        <title>ExamSecure</title>
        <meta name="description" content="Plataforma Segura de Evaluación en Línea" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className={cn(
        "font-body antialiased",
        isPrintPage ? "" : "min-h-screen flex flex-col" // Aplica clases condicionalmente
      )}>
        {children}
        <div className={isPrintPage ? "no-print" : ""}>
          <Toaster />
        </div>
      </body>
    </html>
  );
}
