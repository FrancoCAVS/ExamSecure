
"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintButtonClientProps {
  className?: string;
}

export function PrintButtonClient({ className }: PrintButtonClientProps) {
  const handlePrint = () => {
    console.log("PrintButtonClient: handlePrint triggered. Attempting window.print().");
    window.print();
  };

  return (
    <Button variant="outline" onClick={handlePrint} className={className}>
      <Printer className="mr-2 h-4 w-4" /> Imprimir Listado
    </Button>
  );
}
