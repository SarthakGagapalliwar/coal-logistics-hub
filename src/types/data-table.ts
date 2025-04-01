
import { ReactNode } from "react";

export interface Column<T> {
  header: string;
  accessorKey: keyof T | string;
  cell?: (item: T) => ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchKey?: keyof T;
  onRowClick?: (item: T) => void;
  className?: string;
}
