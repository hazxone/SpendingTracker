import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { editTransactionSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  const apiRouter = app.route('/api');
  
  // Get transactions with optional filtering and pagination
  app.get('/api/transactions', async (req: Request, res: Response) => {
    try {
      const { search, category, sortBy, page, limit, dateFilter } = req.query;
      
      const filters = {
        search: search as string | undefined,
        category: category as string | undefined,
        sortBy: sortBy as string | undefined,
        dateFilter: dateFilter as string | undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10
      };
      
      const result = await storage.getTransactions(undefined, filters);
      
      // Calculate the total sum of the filtered transactions
      const filteredTotal = result.transactions.reduce(
        (sum, transaction) => sum + Number(transaction.price), 
        0
      );
      
      res.json({
        transactions: result.transactions,
        pagination: {
          total: result.totalCount,
          page: filters.page,
          limit: filters.limit,
          pages: Math.ceil(result.totalCount / filters.limit)
        },
        filteredTotal: parseFloat(filteredTotal.toFixed(2))
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });
  
  // Get a single transaction
  app.get('/api/transactions/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid transaction ID" });
      }
      
      const transaction = await storage.getTransaction(id);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.json(transaction);
    } catch (error) {
      console.error("Error fetching transaction:", error);
      res.status(500).json({ message: "Failed to fetch transaction" });
    }
  });
  
  // Update a transaction
  app.put('/api/transactions/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid transaction ID" });
      }
      
      try {
        const data = editTransactionSchema.parse({
          id,
          ...req.body
        });
        
        const transaction = await storage.getTransaction(id);
        
        if (!transaction) {
          return res.status(404).json({ message: "Transaction not found" });
        }
        
        const updatedTransaction = await storage.updateTransaction(id, data);
        res.json(updatedTransaction);
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({ 
            message: "Validation error", 
            errors: error.errors 
          });
        }
        throw error;
      }
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });
  
  // Get spending summary metrics
  app.get('/api/metrics/summary', async (_req: Request, res: Response) => {
    try {
      const summary = await storage.getSpendingSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching spending summary:", error);
      res.status(500).json({ message: "Failed to fetch spending summary" });
    }
  });
  
  // Get category summary data
  app.get('/api/metrics/categories', async (_req: Request, res: Response) => {
    try {
      const categorySummary = await storage.getCategorySummary();
      res.json(categorySummary);
    } catch (error) {
      console.error("Error fetching category summary:", error);
      res.status(500).json({ message: "Failed to fetch category summary" });
    }
  });
  
  // Get daily spending data
  app.get('/api/metrics/daily', async (req: Request, res: Response) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const dailySpending = await storage.getDailySpending(undefined, days);
      res.json(dailySpending);
    } catch (error) {
      console.error("Error fetching daily spending:", error);
      res.status(500).json({ message: "Failed to fetch daily spending" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
