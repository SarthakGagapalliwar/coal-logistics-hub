import { ReactNode } from "react";

// Base interface for the column definition
export interface Column {
  header: string | ReactNode | (({ table }: { table: any }) => ReactNode);
  accessorKey?: string;
  id?: string;
  cell?: (props: any) => ReactNode;
  enableSorting?: boolean;
  enableHiding?: boolean;
}

// Column definition for the data table
export type DataTableColumn<T> = ColumnDef<T>;

// Row selection state for the data table
export interface RowSelectionState {
  [key: string]: boolean;
}
