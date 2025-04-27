import { 
  users, 
  transactions, 
  type User, 
  type InsertUser, 
  type Transaction, 
  type InsertTransaction,
  type EditTransaction,
  type SpendingSummary,
  type CategorySummary,
  type DailySpending
} from "@shared/schema";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, gte, lte, desc, sql, count } from 'drizzle-orm';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays } from 'date-fns';

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Transaction operations
  getTransactions(userId?: number, filters?: {
    search?: string;
    category?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }): Promise<{ transactions: Transaction[]; totalCount: number }>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  updateTransaction(id: number, transaction: EditTransaction): Promise<Transaction>;
  
  // Metrics and summary operations
  getSpendingSummary(userId?: number): Promise<SpendingSummary>;
  getCategorySummary(userId?: number): Promise<CategorySummary[]>;
  getDailySpending(userId?: number, days?: number): Promise<DailySpending[]>;
}

// Database Storage Implementation with Supabase
export class DbStorage implements IStorage {
  private db;
  private client;

  constructor() {
    // Connection to database using postgres.js
    const connectionString = process.env.DATABASE_URL || '';
    this.client = postgres(connectionString);
    this.db = drizzle(this.client);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Transaction methods
  async getTransactions(userId?: number, filters?: {
    search?: string;
    category?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }): Promise<{ transactions: Transaction[]; totalCount: number }> {
    const limit = filters?.limit || 10;
    const offset = ((filters?.page || 1) - 1) * limit;
    
    // Build the basic query with filters
    let whereConditions = [];
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    if (userId) {
      whereConditions.push(`user_id = $${paramIndex++}`);
      queryParams.push(userId);
    }
    
    if (filters?.category) {
      whereConditions.push(`category = $${paramIndex++}`);
      queryParams.push(filters.category);
    }
    
    if (filters?.search) {
      whereConditions.push(`items ILIKE $${paramIndex++}`);
      queryParams.push(`%${filters.search}%`);
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM transactions 
      ${whereClause}
    `;
    
    const countResult = await this.client.unsafe(countQuery, ...queryParams);
    const totalCount = parseInt(countResult[0]?.total || '0', 10);
    
    // Build sorting
    let orderClause = 'ORDER BY datetime DESC';
    if (filters?.sortBy) {
      const [field, direction] = filters.sortBy.split(':');
      
      if (field === 'price') {
        orderClause = `ORDER BY price ${direction === 'desc' ? 'DESC' : 'ASC'}`;
      } else if (field === 'date') {
        orderClause = `ORDER BY datetime ${direction === 'desc' ? 'DESC' : 'ASC'}`;
      }
    }
    
    // Final query with pagination
    const query = `
      SELECT * 
      FROM transactions 
      ${whereClause}
      ${orderClause}
      LIMIT $${paramIndex++} 
      OFFSET $${paramIndex++}
    `;
    
    queryParams.push(limit, offset);
    const result = await this.client.unsafe(query, ...queryParams);
    
    return { 
      transactions: result as Transaction[], 
      totalCount 
    };
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const result = await this.db.select().from(transactions).where(eq(transactions.id, id));
    return result[0];
  }

  async updateTransaction(id: number, updatedData: EditTransaction): Promise<Transaction> {
    // Use SQL for update to avoid type issues
    const query = `
      UPDATE transactions
      SET 
        price = $1,
        items = $2,
        datetime = $3,
        date_only = $4,
        category = $5
      WHERE id = $6
      RETURNING *
    `;
    
    const result = await this.client.unsafe(
      query,
      updatedData.price,
      updatedData.items,
      new Date(updatedData.dateTime),
      new Date(updatedData.dateOnly),
      updatedData.category,
      id
    );
    
    return result[0] as Transaction;
  }

  // Summary metrics methods
  async getSpendingSummary(userId?: number): Promise<SpendingSummary> {
    const today = new Date();
    const startOfToday = format(startOfDay(today), 'yyyy-MM-dd HH:mm:ss');
    const endOfToday = format(endOfDay(today), 'yyyy-MM-dd HH:mm:ss');
    const startOfCurrentMonth = format(startOfMonth(today), 'yyyy-MM-dd');
    const endOfCurrentMonth = format(endOfMonth(today), 'yyyy-MM-dd');
    const startOfLastMonth = format(startOfMonth(subDays(startOfMonth(today), 1)), 'yyyy-MM-dd');
    const endOfLastMonth = format(endOfMonth(subDays(startOfMonth(today), 1)), 'yyyy-MM-dd');
    
    // Prepare conditions based on userId
    const userIdCondition = userId ? `AND user_id = $1` : '';
    const params = userId ? [userId] : [];
    
    // Get today's total
    const todayQuery = `
      SELECT COALESCE(SUM(price), 0) as sum
      FROM transactions
      WHERE datetime >= '${startOfToday}' 
      AND datetime <= '${endOfToday}'
      ${userIdCondition}
    `;
    
    const todayResult = await this.client.unsafe(todayQuery, ...params);
    const todayTotal = parseFloat(todayResult[0]?.sum || '0');
    
    // Calculate average daily spending for comparison
    const lastWeekStart = format(subDays(today, 7), 'yyyy-MM-dd');
    const yesterdayEnd = format(subDays(startOfToday, 1), 'yyyy-MM-dd 23:59:59');
    
    const avgDailyQuery = `
      SELECT COALESCE(AVG(daily_sum), 0) as avg
      FROM (
        SELECT SUM(price) as daily_sum, DATE(date_only) as day
        FROM transactions
        WHERE datetime >= '${lastWeekStart}'
        AND datetime <= '${yesterdayEnd}'
        ${userIdCondition}
        GROUP BY DATE(date_only)
      ) as daily_sums
    `;
    
    const avgDailyResult = await this.client.unsafe(avgDailyQuery, ...params);
    const avgDaily = parseFloat(avgDailyResult[0]?.avg || '0');
    
    // Calculate today's trend compared to average
    const todayTrend = avgDaily > 0 ? ((todayTotal - avgDaily) / avgDaily) * -100 : 0;
    
    // Get month's total
    const monthQuery = `
      SELECT COALESCE(SUM(price), 0) as sum
      FROM transactions
      WHERE date_only >= '${startOfCurrentMonth}'
      AND date_only <= '${endOfCurrentMonth}'
      ${userIdCondition}
    `;
    
    const monthResult = await this.client.unsafe(monthQuery, ...params);
    const monthTotal = parseFloat(monthResult[0]?.sum || '0');
    
    // Get last month's total
    const lastMonthQuery = `
      SELECT COALESCE(SUM(price), 0) as sum
      FROM transactions
      WHERE date_only >= '${startOfLastMonth}'
      AND date_only <= '${endOfLastMonth}'
      ${userIdCondition}
    `;
    
    const lastMonthResult = await this.client.unsafe(lastMonthQuery, ...params);
    const lastMonthTotal = parseFloat(lastMonthResult[0]?.sum || '0');
    
    // Calculate month's trend compared to last month
    const monthTrend = lastMonthTotal > 0 ? ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;
    
    // Get top category
    const topCategoryQuery = `
      SELECT category, SUM(price) as sum
      FROM transactions
      WHERE date_only >= '${startOfCurrentMonth}'
      AND date_only <= '${endOfCurrentMonth}'
      ${userIdCondition}
      GROUP BY category
      ORDER BY sum DESC
      LIMIT 1
    `;
    
    const topCategoryResult = await this.client.unsafe(topCategoryQuery, ...params);
    const topCategory = topCategoryResult[0]?.category || 'None';
    const topCategoryAmount = parseFloat(topCategoryResult[0]?.sum || '0');
    const topCategoryPercentage = monthTotal > 0 ? (topCategoryAmount / monthTotal) * 100 : 0;
    
    // Calculate daily average
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dailyAverage = monthTotal / daysInMonth;
    
    return {
      todayTotal,
      todayTrend,
      monthTotal,
      monthTrend,
      topCategory,
      topCategoryAmount,
      topCategoryPercentage,
      dailyAverage
    };
  }

  async getCategorySummary(userId?: number): Promise<CategorySummary[]> {
    const today = new Date();
    const startOfCurrentMonth = format(startOfMonth(today), 'yyyy-MM-dd');
    const endOfCurrentMonth = format(endOfMonth(today), 'yyyy-MM-dd');
    
    // Prepare conditions based on userId
    const userIdCondition = userId ? `AND user_id = $1` : '';
    const params = userId ? [userId] : [];
    
    // Get spending by category
    const categoryQuery = `
      SELECT 
        category, 
        COALESCE(SUM(price), 0) as total
      FROM transactions
      WHERE date_only >= '${startOfCurrentMonth}'
      AND date_only <= '${endOfCurrentMonth}'
      ${userIdCondition}
      GROUP BY category
      ORDER BY total DESC
    `;
    
    const categoryResults = await this.client.unsafe(categoryQuery, ...params);
    
    // Get total spending for the month to calculate percentages
    const totalQuery = `
      SELECT COALESCE(SUM(price), 0) as sum
      FROM transactions
      WHERE date_only >= '${startOfCurrentMonth}'
      AND date_only <= '${endOfCurrentMonth}'
      ${userIdCondition}
    `;
    
    const totalResult = await this.client.unsafe(totalQuery, ...params);
    const totalSpending = parseFloat(totalResult[0]?.sum || '0');
    
    return categoryResults.map((item: any) => ({
      category: item.category,
      total: parseFloat(item.total),
      percentage: totalSpending > 0 ? (parseFloat(item.total) / totalSpending) * 100 : 0
    }));
  }

  async getDailySpending(userId?: number, days: number = 7): Promise<DailySpending[]> {
    const today = new Date();
    const startDate = subDays(today, days - 1);
    
    // Format dates for query
    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    const formattedEndDate = format(today, 'yyyy-MM-dd');
    
    // Prepare conditions based on userId
    const userIdCondition = userId ? `AND user_id = $1` : '';
    const params = userId ? [userId] : [];
    
    // Get daily spending
    const dailyQuery = `
      SELECT 
        date_only as date, 
        COALESCE(SUM(price), 0) as total
      FROM transactions
      WHERE date_only >= '${formattedStartDate}'
      AND date_only <= '${formattedEndDate}'
      ${userIdCondition}
      GROUP BY date_only
      ORDER BY date_only
    `;
    
    const dailyResults = await this.client.unsafe(dailyQuery, ...params);
    
    // Fill in missing dates with zero values
    const allDates: DailySpending[] = [];
    for (let i = 0; i < days; i++) {
      const currentDate = subDays(today, days - 1 - i);
      const formattedDate = format(currentDate, 'yyyy-MM-dd');
      
      const existingEntry = dailyResults.find(
        (entry: any) => format(new Date(entry.date), 'yyyy-MM-dd') === formattedDate
      );
      
      allDates.push({
        date: formattedDate,
        total: existingEntry ? parseFloat(existingEntry.total) : 0
      });
    }
    
    return allDates;
  }
}

// Memory Storage Implementation (for development/testing)
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transactions: Map<number, Transaction>;
  private userIdCounter: number;
  private transactionIdCounter: number;

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.userIdCounter = 1;
    this.transactionIdCounter = 1;
    
    // Add some sample transactions
    this.seedTransactions();
  }

  // Seed some sample transactions for testing
  private seedTransactions() {
    const categories = [
      'Food', 'Petrol', 'Rent', 'Healthcare', 'Entertainment',
      'Clothing', 'Insurance', 'Communication', 'Loans', 'Toll',
      'Transportation', 'Miscellaneous'
    ];
    
    const today = new Date();
    const items = [
      'Groceries', 'Gas Station', 'Monthly Rent', 'Pharmacy', 'Movie Tickets',
      'T-shirt', 'Car Insurance', 'Phone Bill', 'Loan Payment', 'Highway Toll',
      'Bus Ticket', 'Coffee'
    ];
    
    // Add 20 sample transactions over the last 30 days
    for (let i = 0; i < 20; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      const categoryIndex = Math.floor(Math.random() * categories.length);
      const itemIndex = Math.floor(Math.random() * items.length);
      const price = Math.round(Math.random() * 10000) / 100;
      
      const transaction: Transaction = {
        id: this.transactionIdCounter++,
        price: price,
        items: items[itemIndex],
        dateTime: date,
        dateOnly: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        category: categories[categoryIndex] as any,
        userId: 1
      };
      
      this.transactions.set(transaction.id, transaction);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Transaction methods
  async getTransactions(userId?: number, filters?: {
    search?: string;
    category?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }): Promise<{ transactions: Transaction[]; totalCount: number }> {
    let filteredTransactions = Array.from(this.transactions.values());
    
    // Apply userId filter
    if (userId) {
      filteredTransactions = filteredTransactions.filter(t => t.userId === userId);
    }
    
    // Apply category filter
    if (filters?.category) {
      filteredTransactions = filteredTransactions.filter(t => t.category === filters.category);
    }
    
    // Apply search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filteredTransactions = filteredTransactions.filter(t => 
        t.items.toLowerCase().includes(searchLower)
      );
    }
    
    // Get total count before pagination
    const totalCount = filteredTransactions.length;
    
    // Apply sorting
    if (filters?.sortBy) {
      const [field, direction] = filters.sortBy.split(':');
      const isDesc = direction === 'desc';
      
      if (field === 'price') {
        filteredTransactions.sort((a, b) => {
          return isDesc 
            ? Number(b.price) - Number(a.price)
            : Number(a.price) - Number(b.price);
        });
      } else if (field === 'date') {
        filteredTransactions.sort((a, b) => {
          const dateA = new Date(a.dateTime).getTime();
          const dateB = new Date(b.dateTime).getTime();
          return isDesc ? dateB - dateA : dateA - dateB;
        });
      }
    } else {
      // Default sort by date descending
      filteredTransactions.sort((a, b) => {
        const dateA = new Date(a.dateTime).getTime();
        const dateB = new Date(b.dateTime).getTime();
        return dateB - dateA;
      });
    }
    
    // Apply pagination
    const limit = filters?.limit || 10;
    const page = filters?.page || 1;
    const startIndex = (page - 1) * limit;
    const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + limit);
    
    return {
      transactions: paginatedTransactions,
      totalCount
    };
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async updateTransaction(id: number, updatedData: EditTransaction): Promise<Transaction> {
    const transaction = this.transactions.get(id);
    
    if (!transaction) {
      throw new Error(`Transaction with id ${id} not found`);
    }
    
    const updated: Transaction = {
      ...transaction,
      price: updatedData.price,
      items: updatedData.items,
      dateTime: new Date(updatedData.dateTime),
      dateOnly: new Date(updatedData.dateOnly),
      category: updatedData.category
    };
    
    this.transactions.set(id, updated);
    return updated;
  }

  // Summary metrics methods
  async getSpendingSummary(userId?: number): Promise<SpendingSummary> {
    const allTransactions = Array.from(this.transactions.values());
    let userTransactions = allTransactions;
    
    if (userId) {
      userTransactions = allTransactions.filter(t => t.userId === userId);
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Today's spending
    const todayTransactions = userTransactions.filter(t => {
      const transactionDate = new Date(t.dateOnly);
      transactionDate.setHours(0, 0, 0, 0);
      return transactionDate.getTime() === today.getTime();
    });
    
    const todayTotal = todayTransactions.reduce((sum, t) => sum + Number(t.price), 0);
    
    // Average daily spending for last week (excluding today)
    const lastWeek = new Array(7).fill(0).map((_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (i + 1));
      return date;
    });
    
    const dailyAmounts = lastWeek.map(date => {
      const dayTransactions = userTransactions.filter(t => {
        const transactionDate = new Date(t.dateOnly);
        transactionDate.setHours(0, 0, 0, 0);
        return transactionDate.getTime() === date.getTime();
      });
      
      return dayTransactions.length > 0 
        ? dayTransactions.reduce((sum, t) => sum + Number(t.price), 0) 
        : 0;
    });
    
    const avgDailySpending = dailyAmounts.reduce((sum: number, total: number) => sum + total, 0) / lastWeek.length;
    const todayTrend = avgDailySpending > 0 ? ((todayTotal - avgDailySpending) / avgDailySpending) * -100 : 0;
    
    // This month's spending
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const monthTransactions = userTransactions.filter(t => {
      const date = new Date(t.dateOnly);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const monthTotal = monthTransactions.reduce((sum, t) => sum + Number(t.price), 0);
    
    // Last month's spending
    let lastMonthMonth = currentMonth - 1;
    let lastMonthYear = currentYear;
    
    if (lastMonthMonth < 0) {
      lastMonthMonth = 11;
      lastMonthYear -= 1;
    }
    
    const lastMonthTransactions = userTransactions.filter(t => {
      const date = new Date(t.dateOnly);
      return date.getMonth() === lastMonthMonth && date.getFullYear() === lastMonthYear;
    });
    
    const lastMonthTotal = lastMonthTransactions.reduce((sum, t) => sum + Number(t.price), 0);
    const monthTrend = lastMonthTotal > 0 ? ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;
    
    // Top category
    const categoryTotals = new Map<string, number>();
    
    for (const transaction of monthTransactions) {
      const category = transaction.category;
      const existingTotal = categoryTotals.get(category) || 0;
      categoryTotals.set(category, existingTotal + Number(transaction.price));
    }
    
    let topCategory = 'None';
    let topCategoryAmount = 0;
    
    categoryTotals.forEach((amount, category) => {
      if (amount > topCategoryAmount) {
        topCategoryAmount = amount;
        topCategory = category;
      }
    });
    
    const topCategoryPercentage = monthTotal > 0 ? (topCategoryAmount / monthTotal) * 100 : 0;
    
    // Daily average for the month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyAverage = monthTotal / daysInMonth;
    
    return {
      todayTotal,
      todayTrend,
      monthTotal,
      monthTrend,
      topCategory,
      topCategoryAmount,
      topCategoryPercentage,
      dailyAverage
    };
  }

  async getCategorySummary(userId?: number): Promise<CategorySummary[]> {
    const allTransactions = Array.from(this.transactions.values());
    let userTransactions = allTransactions;
    
    if (userId) {
      userTransactions = allTransactions.filter(t => t.userId === userId);
    }
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Filter transactions for current month
    const monthTransactions = userTransactions.filter(t => {
      const date = new Date(t.dateOnly);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    // Calculate total spending
    const totalSpending = monthTransactions.reduce((sum, t) => sum + Number(t.price), 0);
    
    // Group by category
    const categoryTotals = new Map<string, number>();
    
    for (const transaction of monthTransactions) {
      const category = transaction.category;
      const existingTotal = categoryTotals.get(category) || 0;
      categoryTotals.set(category, existingTotal + Number(transaction.price));
    }
    
    // Convert to array and calculate percentages
    const categorySummary: CategorySummary[] = [];
    
    categoryTotals.forEach((total, category) => {
      const percentage = totalSpending > 0 ? (total / totalSpending) * 100 : 0;
      categorySummary.push({
        category,
        total,
        percentage
      });
    });
    
    // Sort by total (descending)
    return categorySummary.sort((a, b) => b.total - a.total);
  }

  async getDailySpending(userId?: number, days: number = 7): Promise<DailySpending[]> {
    const allTransactions = Array.from(this.transactions.values());
    let userTransactions = allTransactions;
    
    if (userId) {
      userTransactions = allTransactions.filter(t => t.userId === userId);
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Create array of dates
    const dates = new Array(days).fill(0).map((_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (days - 1 - i));
      return date;
    });
    
    // Calculate daily spending
    return dates.map(date => {
      const dayTransactions = userTransactions.filter(t => {
        const transactionDate = new Date(t.dateOnly);
        transactionDate.setHours(0, 0, 0, 0);
        return transactionDate.getTime() === date.getTime();
      });
      
      const total = dayTransactions.reduce((sum, t) => sum + Number(t.price), 0);
      
      return {
        date: format(date, 'yyyy-MM-dd'),
        total
      };
    });
  }
}

// Export storage instance (using MemStorage for development)
export const storage = process.env.NODE_ENV === 'production' 
  ? new DbStorage() 
  : new MemStorage();
