
import { ColumnDef } from "@tanstack/react-table";
import { ReactNode } from "react";

// Base interface for the column definition
export interface Column {
  header: string;
  accessorKey: string;
  cell?: (props: any) => ReactNode;
}

// Column definition for the data table
export type DataTableColumn<T> = ColumnDef<T>;

// Row selection state for the data table
export interface RowSelectionState {
  [key: string]: boolean;
}
