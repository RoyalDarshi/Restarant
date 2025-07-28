-- Sample database schema with multiple tables for analytics

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    age INTEGER,
    city VARCHAR(100),
    country VARCHAR(100),
    registration_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active'
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10,2),
    stock_quantity INTEGER,
    supplier_id INTEGER,
    created_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    total_amount DECIMAL(10,2),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    shipping_address TEXT
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    revenue DECIMAL(10,2),
    profit DECIMAL(10,2),
    commission DECIMAL(10,2),
    sale_date DATE DEFAULT CURRENT_DATE,
    region VARCHAR(100),
    sales_rep VARCHAR(255)
);

-- Analytics Events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    event_type VARCHAR(100),
    event_data JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(255),
    page_url TEXT
);

-- Insert sample data
INSERT INTO users (name, email, age, city, country, registration_date, status) VALUES
('John Doe', 'john@example.com', 28, 'New York', 'USA', '2024-01-15', 'active'),
('Jane Smith', 'jane@example.com', 34, 'London', 'UK', '2024-01-20', 'active'),
('Mike Johnson', 'mike@example.com', 25, 'Toronto', 'Canada', '2024-02-01', 'active'),
('Sarah Wilson', 'sarah@example.com', 31, 'Sydney', 'Australia', '2024-02-10', 'inactive'),
('David Brown', 'david@example.com', 29, 'Berlin', 'Germany', '2024-02-15', 'active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (name, category, price, stock_quantity, supplier_id, created_date, is_active) VALUES
('Laptop Pro', 'Electronics', 1299.99, 50, 1, '2024-01-10', true),
('Wireless Mouse', 'Electronics', 29.99, 200, 1, '2024-01-12', true),
('Office Chair', 'Furniture', 199.99, 30, 2, '2024-01-15', true),
('Smartphone', 'Electronics', 699.99, 75, 1, '2024-01-20', true),
('Desk Lamp', 'Furniture', 49.99, 100, 2, '2024-02-01', true)
ON CONFLICT DO NOTHING;

INSERT INTO orders (user_id, product_id, quantity, total_amount, order_date, status, shipping_address) VALUES
(1, 1, 1, 1299.99, '2024-01-16 10:30:00', 'completed', '123 Main St, New York, NY'),
(2, 2, 2, 59.98, '2024-01-21 14:15:00', 'completed', '456 Oak Ave, London, UK'),
(3, 3, 1, 199.99, '2024-02-02 09:45:00', 'shipped', '789 Pine St, Toronto, ON'),
(1, 4, 1, 699.99, '2024-02-05 16:20:00', 'completed', '123 Main St, New York, NY'),
(4, 5, 3, 149.97, '2024-02-11 11:30:00', 'pending', '321 Elm St, Sydney, NSW')
ON CONFLICT DO NOTHING;

INSERT INTO sales (order_id, revenue, profit, commission, sale_date, region, sales_rep) VALUES
(1, 1299.99, 300.00, 65.00, '2024-01-16', 'North America', 'Alice Johnson'),
(2, 59.98, 20.00, 3.00, '2024-01-21', 'Europe', 'Bob Smith'),
(3, 199.99, 50.00, 10.00, '2024-02-02', 'North America', 'Charlie Brown'),
(4, 699.99, 150.00, 35.00, '2024-02-05', 'North America', 'Alice Johnson'),
(5, 149.97, 45.00, 7.50, '2024-02-11', 'Asia Pacific', 'Diana Lee')
ON CONFLICT DO NOTHING;