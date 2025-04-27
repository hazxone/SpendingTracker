import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { EditTransactionDialog } from "./EditTransactionDialog";
import { formatCurrency, formatDate, formatTime, getCategoryBadgeClasses, CATEGORIES, SORT_OPTIONS, DATE_FILTERS } from "@/lib/supabase";
import { type Transaction } from "@shared/schema";

interface TransactionsResponse {
  transactions: Transaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  filteredTotal: number;
}

export function TransactionTable() {
  // State for filters and pagination
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date:desc");
  const [page, setPage] = useState(1);
  const limit = 10;
  
  // State for edit dialog
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Query for transactions with filters
  const { data, isLoading } = useQuery<TransactionsResponse>({
    queryKey: ['/api/transactions', { search, category, dateFilter, sortBy, page, limit }],
    queryFn: async ({ queryKey }) => {
      const [_, params] = queryKey as [string, any];
      const searchParams = new URLSearchParams();
      
      if (params.search) searchParams.append('search', params.search);
      if (params.category && params.category !== 'all') searchParams.append('category', params.category);
      if (params.dateFilter && params.dateFilter !== 'all') searchParams.append('dateFilter', params.dateFilter);
      if (params.sortBy) searchParams.append('sortBy', params.sortBy);
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      
      const response = await fetch(`/api/transactions?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return response.json();
    }
  });
  
  // Open edit dialog with transaction data
  const handleEdit = (transaction: Transaction) => {
    setEditTransaction(transaction);
    setIsEditDialogOpen(true);
  };
  
  // Close edit dialog
  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditTransaction(null);
  };
  
  // Handle page changes
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  // Generate page links for pagination
  const renderPaginationLinks = () => {
    if (!data) return null;
    
    const { pages, page: currentPage } = data.pagination;
    const pageLinks = [];
    
    // Determine range of pages to show
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(pages, startPage + 4);
    
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    
    // First page
    if (startPage > 1) {
      pageLinks.push(
        <PaginationItem key="first">
          <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
        </PaginationItem>
      );
      
      if (startPage > 2) {
        pageLinks.push(
          <PaginationItem key="ellipsis-start">
            <span className="px-4 py-2">...</span>
          </PaginationItem>
        );
      }
    }
    
    // Page links
    for (let i = startPage; i <= endPage; i++) {
      pageLinks.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => handlePageChange(i)}
            isActive={i === currentPage}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    // Last page
    if (endPage < pages) {
      if (endPage < pages - 1) {
        pageLinks.push(
          <PaginationItem key="ellipsis-end">
            <span className="px-4 py-2">...</span>
          </PaginationItem>
        );
      }
      
      pageLinks.push(
        <PaginationItem key="last">
          <PaginationLink onClick={() => handlePageChange(pages)}>
            {pages}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return pageLinks;
  };
  
  return (
    <>
      <Card className="bg-white rounded-lg shadow-sm border border-slate-200">
        <CardHeader className="px-6 py-5 border-b border-slate-200">
          <div className="flex flex-wrap items-center justify-between">
            <CardTitle className="text-lg font-medium text-slate-800">
              Transactions
            </CardTitle>
            <div className="flex flex-wrap space-x-2 mt-2 sm:mt-0">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="relative">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary h-10 w-[140px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary h-10 w-[140px]">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FILTERS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary h-10 w-[140px]">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Items
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Price
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Category
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Date
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Time
                </TableHead>
                <TableHead className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-slate-200 rounded w-16"></div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="h-6 bg-slate-200 rounded w-24"></div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-slate-200 rounded w-24"></div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-slate-200 rounded w-16"></div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="h-4 bg-slate-200 rounded w-8 ml-auto"></div>
                    </TableCell>
                  </TableRow>
                ))
              ) : data?.transactions && data.transactions.length > 0 ? (
                // Transaction rows
                data.transactions.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-slate-50">
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {transaction.items}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {formatCurrency(Number(transaction.price))}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryBadgeClasses(transaction.category)}`}>
                        {transaction.category}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(transaction.dateOnly.toString())}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatTime(transaction.dateTime.toString())}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        className="text-primary hover:text-primary-dark"
                        onClick={() => handleEdit(transaction)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                // No data state
                <TableRow>
                  <TableCell colSpan={6} className="px-6 py-4 text-center text-sm text-slate-500">
                    No transactions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="px-4 py-3 border-t border-slate-200 sm:px-6">
          <div className="flex flex-wrap items-center justify-between">
            {data && (
              <div className="mb-2 sm:mb-0">
                <p className="text-sm text-slate-700">
                  Showing <span className="font-medium">{data.transactions.length > 0 ? (data.pagination.page - 1) * data.pagination.limit + 1 : 0}</span> to <span className="font-medium">
                    {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)}
                  </span> of <span className="font-medium">{data.pagination.total}</span> transactions
                </p>
                {/* Display filtered total if filters are applied */}
                {((category && category !== 'all') || (dateFilter && dateFilter !== 'all') || search) && (
                  <p className="text-sm font-medium text-slate-900 mt-1">
                    Filtered Total: <span className="text-emerald-600 font-bold">{formatCurrency(data.filteredTotal)}</span>
                  </p>
                )}
              </div>
            )}
            
            {data && data.pagination.pages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      className={page === 1 ? "pointer-events-none opacity-50" : ""}
                      onClick={() => handlePageChange(Math.max(1, page - 1))}
                    />
                  </PaginationItem>
                  
                  {renderPaginationLinks()}
                  
                  <PaginationItem>
                    <PaginationNext
                      className={page === data.pagination.pages ? "pointer-events-none opacity-50" : ""}
                      onClick={() => handlePageChange(Math.min(data.pagination.pages, page + 1))}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>
      </Card>
      
      {/* Edit Transaction Dialog */}
      <EditTransactionDialog
        transaction={editTransaction}
        isOpen={isEditDialogOpen}
        onClose={handleCloseEditDialog}
      />
    </>
  );
}
