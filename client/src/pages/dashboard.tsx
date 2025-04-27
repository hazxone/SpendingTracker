import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SpendingVisualizations } from "@/components/dashboard/SpendingVisualizations";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { formatCurrency } from "@/lib/supabase";
import type { SpendingSummary } from "@shared/schema";

export default function Dashboard() {
  // Fetch summary metrics
  const { data: summaryData, isLoading: isLoadingSummary } = useQuery<SpendingSummary>({
    queryKey: ['/api/metrics/summary']
  });
  
  return (
    <DashboardLayout>
      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Today's Spending"
          value={summaryData ? formatCurrency(summaryData.todayTotal) : "$0.00"}
          trend={summaryData?.todayTrend}
          trendLabel="less than avg"
          isLoading={isLoadingSummary}
        />
        
        <MetricCard
          title="This Month"
          value={summaryData ? formatCurrency(summaryData.monthTotal) : "$0.00"}
          trend={summaryData?.monthTrend}
          trendLabel={summaryData?.monthTrend && summaryData.monthTrend >= 0 
            ? "more than last month" 
            : "less than last month"}
          isLoading={isLoadingSummary}
        />
        
        <MetricCard
          title="Top Category"
          value={summaryData?.topCategory || "None"}
          subValue={summaryData 
            ? `${formatCurrency(summaryData.topCategoryAmount)} (${Math.round(summaryData.topCategoryPercentage)}%)`
            : "$0.00 (0%)"}
          isLoading={isLoadingSummary}
        />
        
        <MetricCard
          title="Daily Average"
          value={summaryData ? formatCurrency(summaryData.dailyAverage) : "$0.00"}
          subValue="This month"
          isLoading={isLoadingSummary}
        />
      </div>
      
      {/* Visualizations */}
      <SpendingVisualizations />
      
      {/* Transactions Table */}
      <TransactionTable />
    </DashboardLayout>
  );
}
