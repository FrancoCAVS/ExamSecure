
"use client";

import { useState, useEffect } from "react";
import type { ManagedStudent } from "@/lib/types";
import { deleteManagedStudentAction, toggleStudentAuthorizationAction } from "@/lib/actions/teacher.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, BookText, Search, Edit, CheckCircle, XCircle } from "lucide-react"; // Added Edit icon
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog"; // Added Dialog components
import { useToast } from "@/hooks/use-toast";
import { EditStudentForm } from "./EditStudentForm"; // Import the new form
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ManagedStudentsTableProps {
  students: ManagedStudent[];
}

export function ManagedStudentsTable({ students: initialStudents }: ManagedStudentsTableProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredStudents, setFilteredStudents] = useState<ManagedStudent[]>(initialStudents);
  const [editingStudent, setEditingStudent] = useState<ManagedStudent | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    setFilteredStudents(initialStudents);
  }, [initialStudents]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = initialStudents.filter(student => {
      return (
        student.dni.toLowerCase().includes(lowercasedFilter) ||
        (student.apellidosNombres && student.apellidosNombres.toLowerCase().includes(lowercasedFilter)) ||
        student.email.toLowerCase().includes(lowercasedFilter)
      );
    });
    setFilteredStudents(filteredData);
  }, [searchTerm, initialStudents]);

  const handleDelete = async (studentId: string, studentDni: string) => {
    const formData = new FormData();
    formData.append("studentId", studentId); // This is the Supabase User ID / profiles.id
    try {
      await deleteManagedStudentAction(formData);
      toast({
        title: "Estudiante Eliminado",
        description: `El perfil del estudiante con DNI ${studentDni} ha sido eliminado. La cuenta de autenticación permanece.`,
      });
      // Revalidation should happen server-side
    } catch (error) {
       toast({
        title: "Error al Eliminar",
        description: error instanceof Error ? error.message : "No se pudo eliminar el perfil del estudiante.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (student: ManagedStudent) => {
    setEditingStudent(student);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Label htmlFor="studentSearch" className="sr-only">Buscar Estudiante</Label>
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="studentSearch"
          type="search"
          placeholder="Buscar por DNI, Apellidos, Nombres o Email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-8 pr-4 py-2 border rounded-md shadow-sm"
        />
      </div>
      <div className="border rounded-lg shadow-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Apellidos y Nombres</TableHead>
              <TableHead>DNI</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Materia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {searchTerm ? "No se encontraron estudiantes que coincidan con la búsqueda." : "No hay estudiantes registrados todavía."}
                </TableCell>
              </TableRow>
            )}
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.apellidosNombres || "N/A"}</TableCell>
                <TableCell>{student.dni}</TableCell>
                <TableCell>{student.email}</TableCell>
                <TableCell>{student.materia || "N/A"}</TableCell>
                <TableCell>
                   <Badge variant={student.is_authorized ? "default" : "destructive"} className={cn(student.is_authorized ? "bg-green-600 text-white" : "")}>
                    {student.is_authorized ? "Autorizado" : "Pendiente"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                    <form action={toggleStudentAuthorizationAction}>
                        <input type="hidden" name="studentId" value={student.id} />
                        <input type="hidden" name="currentStatus" value={String(student.is_authorized || false)} />
                        <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            title={student.is_authorized ? "Revocar autorización" : "Autorizar estudiante"}
                        >
                            {student.is_authorized ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            <span className="ml-1 hidden sm:inline">{student.is_authorized ? "Revocar" : "Autorizar"}</span>
                        </Button>
                    </form>
                  <Button variant="outline" size="sm" asChild title="Ver Historial de Exámenes">
                    <Link href={`/teacher/students/${student.dni}/history`}>
                      <BookText className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">Historial</span>
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(student)} title="Editar Estudiante">
                    <Edit className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">Editar</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" title="Eliminar Estudiante">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Esto eliminará permanentemente el perfil del estudiante con DNI {student.dni} de la tabla de perfiles (la cuenta de autenticación permanecerá).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <form action={() => handleDelete(student.id, student.dni)}>
                          <AlertDialogAction type="submit" className="bg-destructive hover:bg-destructive/90">
                              Sí, eliminar perfil
                          </AlertDialogAction>
                        </form>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {filteredStudents.length > 0 && (
              <TableCaption>
                {searchTerm
                  ? `${filteredStudents.length} estudiante(s) encontrado(s) de ${initialStudents.length} total(es).`
                  : `Un total de ${initialStudents.length} estudiante(s) registrado(s).`
                }
              </TableCaption>
          )}
        </Table>
      </div>
      {editingStudent && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Estudiante</DialogTitle>
              <DialogDescription>
                Modifica los datos del estudiante. DNI y Email son de solo lectura aquí.
              </DialogDescription>
            </DialogHeader>
            <EditStudentForm
              student={editingStudent}
              onFormSubmit={() => setIsEditDialogOpen(false)} // Close dialog on successful submit
              onCancel={() => setIsEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
