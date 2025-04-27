import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from "recharts";
import { getCategoryColor, formatCurrency } from "@/lib/supabase";
import type { CategorySummary, DailySpending } from "@shared/schema";

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-md shadow-sm">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-sm text-primary">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

// Category spending component
export function CategorySpendingChart() {
  const { data: categories, isLoading } = useQuery<CategorySummary[]>({
    queryKey: ['/api/metrics/categories']
  });

  if (isLoading) {
    return (
      <Card className="bg-white rounded-lg shadow-sm border border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-slate-800">Spending by Category</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse h-full w-full bg-slate-100 rounded-md"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for chart
  const chartData = categories?.map(item => ({
    name: item.category,
    value: item.total,
    percentage: item.percentage
  })) || [];

  return (
    <Card className="bg-white rounded-lg shadow-sm border border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-slate-800">Spending by Category</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                innerRadius={55}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Daily spending timeline component
export function DailySpendingChart() {
  const { data: dailySpending, isLoading } = useQuery<DailySpending[]>({
    queryKey: ['/api/metrics/daily']
  });

  if (isLoading) {
    return (
      <Card className="bg-white rounded-lg shadow-sm border border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-slate-800">Last 7 Days Spending</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse h-full w-full bg-slate-100 rounded-md"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format dates for display
  const chartData = dailySpending?.map(item => {
    const date = new Date(item.date);
    return {
      name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: item.total
    };
  }) || [];

  return (
    <Card className="bg-white rounded-lg shadow-sm border border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-slate-800">Last 7 Days Spending</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="name" 
                padding={{ left: 10, right: 10 }} 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tickFormatter={(value) => `$${value}`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                name="Spending"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Combined visualizations component
export function SpendingVisualizations() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <div className="col-span-1">
        <CategorySpendingChart />
      </div>
      <div className="col-span-2">
        <DailySpendingChart />
      </div>
    </div>
  );
}
