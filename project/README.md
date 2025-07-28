# React Data Analytics Dashboard with PostgreSQL Backend

A comprehensive data analytics dashboard built with React, TypeScript, and Node.js that connects to PostgreSQL databases for real-time data visualization and analysis.

## Features

### Frontend (React + TypeScript)
- **Interactive Dashboard**: Modern sidebar navigation with multiple views
- **Database Explorer**: Connect to PostgreSQL and browse all tables
- **Dynamic Data Tables**: View, search, and sort data from any database table
- **Drag & Drop Chart Builder**: Create charts by dragging database columns
- **Multiple Chart Types**: Bar, Line, Area, Pie, and Mixed charts
- **Multi-Column Analysis**: Compare multiple metrics simultaneously
- **Real-time Updates**: Charts update automatically when configuration changes
- **Responsive Design**: Works seamlessly on desktop and tablet devices

### Backend (Node.js + PostgreSQL)
- **Database Connection**: Secure PostgreSQL connection with connection pooling
- **Dynamic Schema Discovery**: Automatically detect tables and columns
- **RESTful API**: Clean API endpoints for data access and aggregation
- **Data Aggregation**: Built-in support for SUM, AVG, COUNT, MIN, MAX operations
- **Query Safety**: SQL injection protection and query validation
- **Error Handling**: Comprehensive error handling and logging

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Configure your database:**
Edit the `.env` file with your PostgreSQL connection details:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password
PORT=3001
```

3. **Initialize sample database (optional):**
```bash
# Run the SQL script in server/database/init.sql in your PostgreSQL database
# This creates sample tables with test data
```

4. **Start both frontend and backend:**
```bash
npm run dev:full
```

This will start:
- Backend API server on http://localhost:3001
- Frontend React app on http://localhost:5173

## Usage

### 1. Database Explorer
- Navigate to the "Database Explorer" tab
- Click "Refresh" to load all tables from your database
- Select a table to view its structure and data
- Use the search functionality to filter records

### 2. Analytics Dashboard
- Go to the "Analytics Dashboard" tab
- Select a database table from the Database Explorer first
- Drag columns from the left panel to the chart configuration areas:
  - **X-Axis**: Categories (usually text/date columns)
  - **Y-Axis**: Values (numeric columns) - supports multiple columns
  - **Group By**: Additional dimension for data segmentation
- Choose your preferred chart type and aggregation method
- Charts update automatically as you modify the configuration

### 3. Chart Types
- **Bar Chart**: Compare values across categories
- **Line Chart**: Show trends over time or categories
- **Area Chart**: Visualize cumulative values
- **Mixed Chart**: Combine bars and lines for different metrics
- **Pie Chart**: Show proportional data (uses first Y-axis column)

### 4. Aggregation Options
- **SUM**: Total values
- **AVG**: Average values
- **COUNT**: Count of records
- **MIN**: Minimum values
- **MAX**: Maximum values

## API Endpoints

### Database Operations
- `GET /api/database/tables` - Get all database tables
- `GET /api/database/tables/:tableName/columns` - Get table columns
- `GET /api/database/tables/:tableName/data` - Get table data with pagination
- `POST /api/database/query` - Execute custom SELECT queries

### Analytics Operations
- `POST /api/analytics/aggregate` - Get aggregated data for charts
- `GET /api/analytics/tables/:tableName/stats` - Get table statistics

### Health Check
- `GET /api/health` - Server health status

## Database Schema

The system works with any PostgreSQL database. Sample tables included:
- **users**: User information and demographics
- **products**: Product catalog with pricing
- **orders**: Order transactions
- **sales**: Sales performance data
- **analytics_events**: User behavior tracking

## Technology Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Recharts for data visualization
- React DnD for drag-and-drop functionality
- Lucide React for icons

### Backend
- Node.js with Express
- PostgreSQL with pg driver
- CORS enabled for cross-origin requests
- Environment-based configuration

## Development

### Project Structure
```
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── services/          # API service layer
│   └── types/             # TypeScript definitions
├── server/                # Node.js backend
│   ├── database/          # Database connection and schemas
│   ├── routes/            # API route handlers
│   └── server.js          # Express server setup
└── package.json           # Dependencies and scripts
```

### Available Scripts
- `npm run dev` - Start frontend only
- `npm run server` - Start backend only
- `npm run dev:full` - Start both frontend and backend
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## Security Features

- SQL injection protection through parameterized queries
- Query validation (only SELECT statements allowed for custom queries)
- Environment variable configuration for sensitive data
- CORS configuration for secure cross-origin requests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details