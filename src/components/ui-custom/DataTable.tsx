
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, Loader2, Filter, Check, X } from "lucide-react";
import { Column } from "@/types/data-table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface DataTableProps<T> {
  data: T[];
  columns: Column[];
  searchPlaceholder?: string;
  searchKey?: keyof T | keyof T[];
  searchableColumns?: (keyof T)[];
  onRowClick?: (item: T) => void;
  className?: string;
  isLoading?: boolean;
}

export const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  searchPlaceholder = "Search...",
  searchKey,
  searchableColumns = [],
  onRowClick,
  className = "",
  isLoading = false,
}: DataTableProps<T>) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [filterPopoverOpen, setFilterPopoverOpen] = useState<Record<string, boolean>>({});
  const itemsPerPage = 8;

  // Helper function to get value from an item by key (handles nested keys like "user.name")
  const getItemValue = (item: T, key: string | keyof T) => {
    if (!key) return undefined;
    
    // Handle nested properties using dot notation (e.g., "user.name")
    if (typeof key === 'string' && key.includes('.')) {
      const keys = key.split('.');
      let value: any = item;
      
      for (const k of keys) {
        if (value === null || value === undefined) return undefined;
        value = value[k];
      }
      
      return value;
    }
    
    return item[key as keyof T];
  };

  // Search across multiple columns or use searchKey if provided
  const filteredData = data.filter(item => {
    // First apply column filters
    for (const [key, values] of Object.entries(columnFilters)) {
      if (values && values.length > 0) {
        // Get the value to filter on, handling nested properties
        let itemValue = getItemValue(item, key);
        
        // Skip this filter if the value is undefined or null
        if (itemValue === undefined || itemValue === null) continue;
        
        // Convert to string for comparison
        const stringValue = String(itemValue).toLowerCase();
        
        // Check if this value is in the filter values
        if (!values.some(value => 
          String(value).toLowerCase() === stringValue
        )) {
          return false;
        }
      }
    }
    
    // Then apply search query if provided
    if (searchQuery) {
      // If searchableColumns is provided, search only those columns
      if (searchableColumns && searchableColumns.length > 0) {
        return searchableColumns.some(column => {
          const value = getItemValue(item, column as string);
          return value !== undefined && 
                 String(value).toLowerCase().includes(searchQuery.toLowerCase());
        });
      }
      // If searchKey is provided, search only that column
      else if (searchKey) {
        const value = getItemValue(item, searchKey as string);
        return value !== undefined && 
               String(value).toLowerCase().includes(searchQuery.toLowerCase());
      }
      // Otherwise search all columns
      else {
        return columns.some(column => {
          if (!column.accessorKey) return false;
          // Fixed: Declare and use the variable properly
          const value = getItemValue(item, column.accessorKey);
          return value !== undefined && 
                 String(value).toLowerCase().includes(searchQuery.toLowerCase());
        });
      }
    }
    
    return true;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Create a mock table object for header functions
  const mockTableContext = {
    getIsAllPageRowsSelected: () => false,
    toggleAllPageRowsSelected: () => {},
    getRowModel: () => ({ rows: [] }),
  };

  // Function to get unique values for a column
  const getUniqueColumnValues = (accessorKey: string): string[] => {
    if (!data || data.length === 0) return [];
    
    const values = data
      .map(item => {
        const value = getItemValue(item, accessorKey);
        return value !== undefined && value !== null ? String(value) : null;
      })
      .filter((value): value is string => value !== null && value !== undefined);
    
    // Remove duplicates
    return Array.from(new Set(values)).sort();
  };

  // Toggle a filter value
  const toggleFilter = (accessorKey: string, value: string) => {
    setColumnFilters(prev => {
      const currentValues = prev[accessorKey] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      return {
        ...prev,
        [accessorKey]: newValues
      };
    });
    
    // Reset to page 1 when filter changes
    setCurrentPage(1);
  };

  // Clear all filters for a column
  const clearColumnFilter = (accessorKey: string) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[accessorKey];
      return newFilters;
    });
    
    // Reset to page 1 when filter changes
    setCurrentPage(1);
  };

  // Helper function to render the header content based on its type
  const renderHeader = (header: Column['header'], column: Column) => {
    if (typeof header === 'function') {
      return header({ table: mockTableContext });
    }
    
    // If column has accessorKey, make it filterable
    const accessorKey = column.accessorKey;
    if (accessorKey) {
      const displayName = typeof header === 'string' ? header : String(accessorKey);
      const uniqueValues = getUniqueColumnValues(accessorKey);
      const activeFilters = columnFilters[accessorKey] || [];
      const isFiltered = activeFilters.length > 0;
      
      return (
        <div className="flex items-center space-x-2">
          <span>{header}</span>
          <Popover 
            open={filterPopoverOpen[accessorKey]} 
            onOpenChange={(open) => setFilterPopoverOpen(prev => ({...prev, [accessorKey]: open}))}
          >
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-6 w-6 p-0 ${isFiltered ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <Filter className="h-3 w-3" />
                {isFiltered && <span className="sr-only">({activeFilters.length})</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-0" align="start">
              {uniqueValues && uniqueValues.length > 0 ? (
                <Command>
                  <CommandInput placeholder={`Search ${displayName.toLowerCase()}...`} />
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup className="max-h-60 overflow-auto">
                    {uniqueValues.map((value) => (
                      <CommandItem
                        key={value}
                        onSelect={() => toggleFilter(accessorKey, value)}
                        className="flex items-center"
                      >
                        <Checkbox
                          checked={activeFilters.includes(value)}
                          onCheckedChange={() => toggleFilter(accessorKey, value)}
                          className="mr-2"
                          id={`${accessorKey}-${value}`}
                        />
                        <span className="truncate">{value}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <div className="border-t p-2 flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => clearColumnFilter(accessorKey)}
                      disabled={!isFiltered}
                    >
                      <X className="h-4 w-4 mr-1" /> Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setFilterPopoverOpen(prev => ({...prev, [accessorKey]: false}))}
                    >
                      <Check className="h-4 w-4 mr-1" /> Apply
                    </Button>
                  </div>
                </Command>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">
                  No filterable values found.
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      );
    }
    
    return header;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="pl-10"
        />
      </div>

      {/* Filter badges */}
      {Object.entries(columnFilters).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(columnFilters).map(([key, values]) =>
            values.map(value => (
              <Badge key={`${key}-${value}`} variant="outline" className="flex items-center gap-1">
                {columns.find(col => col.accessorKey === key)?.header as React.ReactNode || key}: {value}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => toggleFilter(key, value)}
                />
              </Badge>
            ))
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setColumnFilters({});
              setCurrentPage(1);
            }}
            className="h-7 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, idx) => (
                <TableHead key={idx}>{renderHeader(column.header, column)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, idx) => (
                <TableRow 
                  key={idx}
                  className={onRowClick ? "cursor-pointer hover:bg-secondary/50" : ""}
                  onClick={() => onRowClick && onRowClick(item)}
                >
                  {columns.map((column, colIdx) => (
                    <TableCell key={colIdx}>
                      {column.cell ? column.cell(item) : getItemValue(item, column.accessorKey as string)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length}
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {[...Array(totalPages)].map((_, idx) => {
              const page = idx + 1;
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className="w-9 h-9"
                  >
                    {page}
                  </Button>
                );
              } else if (
                (page === currentPage - 2 && currentPage > 3) ||
                (page === currentPage + 2 && currentPage < totalPages - 2)
              ) {
                return <span key={page}>...</span>;
              }
              return null;
            })}
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
