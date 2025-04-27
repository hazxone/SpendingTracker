import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  subValue?: string;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export function MetricCard({
  title,
  value,
  trend,
  trendLabel,
  subValue,
  icon,
  isLoading = false,
}: MetricCardProps) {
  const showTrend = trend !== undefined;
  const isTrendPositive = trend !== undefined && trend >= 0;
  const isTrendNegative = trend !== undefined && trend < 0;
  
  // Determine if trend is good or bad (negative for spending is good)
  const isTrendGood = isTrendNegative;
  
  return (
    <Card className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <CardContent className="p-4">
        <h3 className="text-sm font-medium text-slate-500">{title}</h3>
        
        {isLoading ? (
          <div className="mt-2 animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-2/3"></div>
            {showTrend && <div className="mt-2 h-4 bg-slate-200 rounded w-1/2"></div>}
          </div>
        ) : (
          <>
            <div className="mt-2 flex items-baseline">
              <p className="text-2xl font-semibold text-slate-900">{value}</p>
              
              {showTrend && (
                <span
                  className={`ml-2 text-sm font-medium flex items-center ${
                    isTrendGood ? 'text-success' : 'text-danger'
                  }`}
                >
                  {isTrendNegative ? (
                    <TrendingDown className="h-4 w-4 mr-0.5" />
                  ) : (
                    <TrendingUp className="h-4 w-4 mr-0.5" />
                  )}
                  <span className="ml-0.5">
                    {Math.abs(trend).toFixed(1)}%
                    {trendLabel && ` ${trendLabel}`}
                  </span>
                </span>
              )}
            </div>
            
            {subValue && <p className="text-sm text-slate-500 mt-1">{subValue}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
