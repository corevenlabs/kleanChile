import { FIELDS } from "../../../../src/domain/import/fields.js";
import { requireUser } from "../../../../src/lib/adminSession.js";

/**
 * La plantilla que se descarga.
 *
 * Se genera desde `FIELDS`, la misma lista que alimenta el selector de mapeo y
 * el validador. Escribirla a mano acá sería la cuarta copia de los mismos
 * nombres de columna y la primera en quedar desactualizada.
 *
 * CSV y no XLSX: Excel, Numbers y Google Sheets lo abren igual, pesa nada y no
 * hay que armar un binario para entregar ocho encabezados.
 */
export async function GET() {
  await requireUser();

  const headers = FIELDS.map((field) => field.label);

  const examples = [
    ["PROV-123", "Detergente Industrial 5L", "Limpieza", "químico", "12990", "40", "Detergente concentrado para uso industrial.", "https://…/detergente.jpg", "", "Sí"],
    ["PROV-123", "", "", "", "13500", "", "", "", "", ""],
  ];

  const escape = (cell) => (/[",;\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);
  const body = [headers, ...examples].map((row) => row.map(escape).join(";")).join("\r\n");

  return new Response(
    // BOM para que Excel en Windows reconozca UTF-8 y no rompa las tildes.
    `﻿${body}`,
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="plantilla-productos-kleanchile.csv"',
        "Cache-Control": "no-store",
      },
    },
  );
}
