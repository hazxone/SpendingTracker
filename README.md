# Spending Tracker Application

A full-stack financial tracking application that allows users to view, filter, and edit transaction data with spending visualizations and summary metrics.

## Tech Stack

### Frontend
- **React**: UI library for building the user interface components
- **TypeScript**: For type-safe code development
- **shadcn/ui**: Component library with beautiful UI elements based on Radix UI
- **TailwindCSS**: Utility-first CSS framework for styling
- **Tanstack React Query**: For managing API requests and data fetching
- **React Hook Form**: For handling form state and validation
- **Zod**: For schema validation
- **recharts**: For data visualization in charts
- **wouter**: For client-side routing

### Backend
- **Node.js**: JavaScript runtime environment
- **Express**: Web application framework for handling HTTP requests
- **PostgreSQL**: Relational database for storage
- **Drizzle ORM**: Type-safe ORM for database interactions
- **Zod**: For API request validation

## Key Features

- View and edit financial transactions in a table format
- Filter transactions by:
  - Category (Food, Petrol, Rent, etc.)
  - Date range (Today, Yesterday, This Week, This Month)
  - Search by transaction items
- Sort transactions by date or price
- Display summary metrics (today's total, monthly total, spending trends)
- Category-based spending visualizations
- Daily spending chart
- Responsive design for mobile and desktop

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- PostgreSQL database

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd spending-tracker
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   - Database connection URL is expected in the `DATABASE_URL` environment variable
   - No additional configuration is required as the PostgreSQL connection is already set up

### Running the Application

1. Start the development server:
   ```
   npm run dev
   ```

2. The application will be available at `http://localhost:5000`

### Database Structure

The application uses a PostgreSQL database with the following main table:

- **transactions**: Stores all financial transaction records
  - `id`: Primary key
  - `price`: Transaction amount
  - `items`: Description of purchased items
  - `dateTime`: Timestamp of the transaction
  - `dateOnly`: Date of the transaction
  - `category`: Category of spending (enum with options like Food, Petrol, etc.)
  - `userId`: ID of the user who owns the transaction

## Development

### Project Structure

- `/client`: Frontend React application
  - `/src/components`: UI components
  - `/src/lib`: Utility functions and shared code
  - `/src/pages`: Application pages
  - `/src/hooks`: Custom React hooks
- `/server`: Backend Express server
  - `index.ts`: Server entry point
  - `routes.ts`: API routes
  - `storage.ts`: Data access layer
- `/shared`: Code shared between frontend and backend
  - `schema.ts`: Database schema and type definitions

### API Routes

- `GET /api/transactions`: List transactions with filters
- `GET /api/transactions/:id`: Get a single transaction
- `PUT /api/transactions/:id`: Update a transaction
- `GET /api/metrics/summary`: Get spending summary metrics
- `GET /api/metrics/categories`: Get category-based spending data
- `GET /api/metrics/daily`: Get daily spending data

## Deployment

The application is designed to be deployed on Replit, but can be deployed to any hosting service that supports Node.js applications.

## License

This project is licensed under the MIT License - see the LICENSE file for details.