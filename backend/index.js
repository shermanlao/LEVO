/**
 * Simple Express API server for LEVO products 
 * 
 * This directly accesses the Strapi SQLite database to provide a simple API
 * without the complex permission issues of Strapi
 */

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const bodyParser = require('body-parser');

// Configuration
const PORT = 3333;
const app = express();
const DB_PATH = path.join(__dirname, '../levo-cms/.tmp/data.db');

// Initialize a simple memory cache for frequent requests
const CACHE = {
  data: new Map(),
  timeouts: new Map(),
  set: function(key, value, ttlSeconds = 300) {
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
    }
    this.data.set(key, value);
    this.timeouts.set(key, setTimeout(() => {
      this.data.delete(key);
      this.timeouts.delete(key);
    }, ttlSeconds * 1000));
  },
  get: function(key) {
    return this.data.get(key);
  },
  has: function(key) {
    return this.data.has(key);
  }
};

// Add error handling for unexpected errors
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
  // Don't exit the process, just log the error
  // process.exit(1);
});

// Add graceful handling for unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥');
  console.error(err);
  // Don't exit the process, just log the error
  // process.exit(1);
});

// Middleware
app.use(cors({
  origin: '*',  // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true
}));

// Special handling for preflight requests
app.options('*', cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true
}));

// Add cache control to disable browser caching
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

app.use(bodyParser.json());

// Connect to the database
let db;
try {
  db = new Database(DB_PATH);
  console.log(`Connected to SQLite database at ${DB_PATH}`);
} catch (err) {
  console.error(`Failed to connect to database: ${err.message}`);
  process.exit(1);
}

/**
 * Database relationships verification and fix
 */
console.log('Verifying database relationships...');

// Check product types
const productTypesCount = db.prepare('SELECT COUNT(*) as count FROM product_types').get().count;
console.log(`Found ${productTypesCount} product types`);

// Add required product types if missing
if (productTypesCount === 0) {
  console.log('Adding required product types...');
  const now = new Date().toISOString();
  
  // Add Downlights product type
  const downlightsResult = db.prepare(`
    INSERT INTO product_types (name, description, slug, created_at, updated_at, published_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'Downlights',
    'Recessed lighting fixtures installed into a hollow opening in a ceiling.',
    'downlights',
    now, now, now
  );
  
  // Add Spotlights product type
  const spotlightsResult = db.prepare(`
    INSERT INTO product_types (name, description, slug, created_at, updated_at, published_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'Spotlights',
    'Directional lights that emit a concentrated beam.',
    'spotlights',
    now, now, now
  );
  
  console.log('Added required product types');
}

// Find product type IDs
const downlightsType = db.prepare("SELECT id FROM product_types WHERE slug = 'downlights'").get();
const spotlightsType = db.prepare("SELECT id FROM product_types WHERE slug = 'spotlights'").get();

const downlightsTypeId = downlightsType ? downlightsType.id : null;
const spotlightsTypeId = spotlightsType ? spotlightsType.id : null;

// Fix series without product type association
const seriesWithoutType = db.prepare('SELECT id, name FROM product_series WHERE product_type_id IS NULL').all();
if (seriesWithoutType.length > 0) {
  console.log(`Fixing ${seriesWithoutType.length} series without product type association...`);
  
  // For simplicity, associate half with downlights and half with spotlights
  const halfIndex = Math.ceil(seriesWithoutType.length / 2);
  
  for (let i = 0; i < seriesWithoutType.length; i++) {
    const series = seriesWithoutType[i];
    const typeId = i < halfIndex ? downlightsTypeId : spotlightsTypeId;
    
    if (typeId) {
      db.prepare('UPDATE product_series SET product_type_id = ? WHERE id = ?').run(typeId, series.id);
      console.log(`Updated series ${series.name} (ID: ${series.id}) with product type ID: ${typeId}`);
    }
  }
}

// Fix products without series association
const productsWithoutSeries = db.prepare('SELECT id, name FROM products WHERE series_id IS NULL').all();
if (productsWithoutSeries.length > 0) {
  console.log(`Fixing ${productsWithoutSeries.length} products without series association...`);
  
  // Get available series
  const allSeries = db.prepare('SELECT id, name, product_type_id FROM product_series').all();
  
  if (allSeries.length > 0) {
    // Use first series as default
    const defaultSeries = allSeries[0];
    
    // Update all products without series
    const updateStmt = db.prepare('UPDATE products SET series_id = ? WHERE series_id IS NULL');
    const result = updateStmt.run(defaultSeries.id);
    
    console.log(`Updated ${result.changes} products to associate with series ID ${defaultSeries.id}`);
  }
}

console.log('Database relationships verification completed');

// Root route - API documentation
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>LEVO API Server</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 {
            color: #4a00e0;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 10px;
          }
          h2 {
            margin-top: 30px;
            color: #6c63ff;
          }
          code {
            background-color: #f4f4f4;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: monospace;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
          }
          th, td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #f8f8f8;
          }
          .method {
            font-weight: bold;
          }
          .get {
            color: #009900;
          }
          .post {
            color: #0066cc;
          }
          .put {
            color: #ff9900;
          }
          .delete {
            color: #cc0000;
          }
          .section {
            margin-top: 40px;
            border: 1px solid #eee;
            border-radius: 8px;
            padding: 20px;
            background-color: #fcfcfc;
          }
        </style>
      </head>
      <body>
        <h1>LEVO API Server</h1>
        <p>Welcome to the LEVO API Server! This API provides direct access to the product database.</p>
        
        <h2>Available Endpoints</h2>
        
        <div class="section">
          <h3>Product Types</h3>
          <table>
            <tr>
              <th>Method</th>
              <th>Endpoint</th>
              <th>Description</th>
            </tr>
            <tr>
              <td class="method get">GET</td>
              <td><code>/api/product-types</code></td>
              <td>Get all product types</td>
            </tr>
            <tr>
              <td class="method get">GET</td>
              <td><code>/api/product-types/:id</code></td>
              <td>Get a single product type by ID</td>
            </tr>
            <tr>
              <td class="method post">POST</td>
              <td><code>/api/product-types</code></td>
              <td>Create a new product type</td>
            </tr>
            <tr>
              <td class="method put">PUT</td>
              <td><code>/api/product-types/:id</code></td>
              <td>Update a product type</td>
            </tr>
            <tr>
              <td class="method delete">DELETE</td>
              <td><code>/api/product-types/:id</code></td>
              <td>Delete a product type</td>
            </tr>
          </table>
        </div>
        
        <div class="section">
          <h3>Product Series</h3>
          <table>
            <tr>
              <th>Method</th>
              <th>Endpoint</th>
              <th>Description</th>
            </tr>
            <tr>
              <td class="method get">GET</td>
              <td><code>/api/product-series</code></td>
              <td>Get all product series</td>
            </tr>
            <tr>
              <td class="method get">GET</td>
              <td><code>/api/product-series/:id</code></td>
              <td>Get a single product series by ID</td>
            </tr>
            <tr>
              <td class="method post">POST</td>
              <td><code>/api/product-series</code></td>
              <td>Create a new product series</td>
            </tr>
            <tr>
              <td class="method put">PUT</td>
              <td><code>/api/product-series/:id</code></td>
              <td>Update a product series</td>
            </tr>
            <tr>
              <td class="method delete">DELETE</td>
              <td><code>/api/product-series/:id</code></td>
              <td>Delete a product series</td>
            </tr>
          </table>
        </div>
        
        <div class="section">
          <h3>Products</h3>
          <table>
            <tr>
              <th>Method</th>
              <th>Endpoint</th>
              <th>Description</th>
            </tr>
            <tr>
              <td class="method get">GET</td>
              <td><code>/api/products</code></td>
              <td>Get all products</td>
            </tr>
            <tr>
              <td class="method get">GET</td>
              <td><code>/api/products/:id</code></td>
              <td>Get a single product by ID</td>
            </tr>
            <tr>
              <td class="method post">POST</td>
              <td><code>/api/products</code></td>
              <td>Create a new product</td>
            </tr>
            <tr>
              <td class="method put">PUT</td>
              <td><code>/api/products/:id</code></td>
              <td>Update a product</td>
            </tr>
            <tr>
              <td class="method delete">DELETE</td>
              <td><code>/api/products/:id</code></td>
              <td>Delete a product</td>
            </tr>
          </table>
        </div>
        
        <div class="section">
          <h3>Utilities</h3>
          <table>
            <tr>
              <th>Method</th>
              <th>Endpoint</th>
              <th>Description</th>
            </tr>
            <tr>
              <td class="method get">GET</td>
              <td><code>/api/tables</code></td>
              <td>Utility endpoint to see all database tables</td>
            </tr>
            <tr>
              <td class="method get">GET</td>
              <td><code>/api/health</code></td>
              <td>Health check endpoint</td>
            </tr>
          </table>
        </div>
        
        <h2>Example Usage</h2>
        
        <h3>GET Example</h3>
        <p>To get all products:</p>
        <code>fetch('http://localhost:3333/api/products')</code>
        
        <h3>POST Example</h3>
        <p>To create a new product:</p>
        <pre><code>fetch('http://localhost:3333/api/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'New Product',
    slug: 'new-product',
    wattage: 15,
    cct: '3000K',
    beam_angle: '60',
    dimming: 'DALI',
    is_featured: true,
    specifications: {
      "Luminous Flux": "1500lm",
      "Color Rendering": "CRI 90"
    }
  })
})</code></pre>

        <h3>PUT Example</h3>
        <p>To update a product:</p>
        <pre><code>fetch('http://localhost:3333/api/products/1', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Updated Product Name'
  })
})</code></pre>

        <h3>DELETE Example</h3>
        <p>To delete a product:</p>
        <code>fetch('http://localhost:3333/api/products/1', { method: 'DELETE' })</code>
        
        <h2>Response Format</h2>
        <p>All successful responses follow the Strapi-compatible format with a <code>data</code> property containing the results.</p>
      </body>
    </html>
  `);
});

// API Routes

// Basic GET /api route for health check
app.get('/api', (req, res) => {
  res.json({
    status: 'success',
    message: 'API is running',
    time: new Date().toISOString(),
    clientInfo: {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin') || 'Not specified',
      host: req.get('Host')
    },
    cors: {
      enabled: true,
      allowedOrigins: '*',
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
    }
  });
});

// Get all product types
app.get('/api/product-types', (req, res) => {
  try {
    // Log table structure
    const tableInfo = db.prepare(`PRAGMA table_info(product_types)`).all();
    console.log('Product types table structure:', tableInfo.map(col => col.name));
    
    // Use a simpler query
    const productTypes = db.prepare(`
      SELECT * FROM product_types 
      WHERE published_at IS NOT NULL
    `).all();

    res.json({
      data: productTypes.map(pt => ({
        id: pt.id,
        attributes: {
          name: pt.name,
          description: pt.description,
          slug: pt.slug,
          createdAt: pt.created_at,
          updatedAt: pt.updated_at
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching product types:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new product type
app.post('/api/product-types', (req, res) => {
  try {
    const { name, description, slug } = req.body;
    
    // Validate required fields
    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required fields' });
    }
    
    // Current timestamp for created_at and updated_at
    const now = new Date().toISOString();
    
    // Insert the new product type
    const stmt = db.prepare(`
      INSERT INTO product_types (
        name, description, slug, 
        created_at, updated_at, published_at
      ) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      name, 
      description || '', 
      slug,
      now, 
      now, 
      now  // Published immediately
    );
    
    // Get the inserted product type
    const insertedType = db.prepare('SELECT * FROM product_types WHERE id = ?').get(result.lastInsertRowid);
    
    res.status(201).json({
      data: {
        id: insertedType.id,
        attributes: {
          name: insertedType.name,
          description: insertedType.description,
          slug: insertedType.slug,
          createdAt: insertedType.created_at,
          updatedAt: insertedType.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Error creating product type:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a product type
app.put('/api/product-types/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, slug } = req.body;
    
    // Check if product type exists
    const existingType = db.prepare('SELECT * FROM product_types WHERE id = ?').get(id);
    if (!existingType) {
      return res.status(404).json({ error: 'Product type not found' });
    }
    
    // Current timestamp for updated_at
    const now = new Date().toISOString();
    
    // Update the product type
    const stmt = db.prepare(`
      UPDATE product_types SET
        name = ?, 
        description = ?, 
        slug = ?,
        updated_at = ?
      WHERE id = ?
    `);
    
    stmt.run(
      name || existingType.name, 
      description !== undefined ? description : existingType.description, 
      slug || existingType.slug,
      now,
      id
    );
    
    // Get the updated product type
    const updatedType = db.prepare('SELECT * FROM product_types WHERE id = ?').get(id);
    
    res.json({
      data: {
        id: updatedType.id,
        attributes: {
          name: updatedType.name,
          description: updatedType.description,
          slug: updatedType.slug,
          createdAt: updatedType.created_at,
          updatedAt: updatedType.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Error updating product type:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a product type
app.delete('/api/product-types/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if product type exists
    const existingType = db.prepare('SELECT * FROM product_types WHERE id = ?').get(id);
    if (!existingType) {
      return res.status(404).json({ error: 'Product type not found' });
    }
    
    // Delete the product type
    db.prepare('DELETE FROM product_types WHERE id = ?').run(id);
    
    res.json({
      message: `Product type with ID ${id} successfully deleted`
    });
  } catch (error) {
    console.error('Error deleting product type:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all product series
app.get('/api/product-series', (req, res) => {
  try {
    console.log('GET /api/product-series - Request received');
    
    // Log table structure for debugging
    try {
    const tableInfo = db.prepare(`PRAGMA table_info(product_series)`).all();
    console.log('Product series table structure:', tableInfo.map(col => col.name));
    } catch (schemaError) {
      console.warn('Could not retrieve table schema:', schemaError.message);
    }
    
    // Use a simpler query with error handling
    try {
    const productSeries = db.prepare(`
      SELECT * FROM product_series
      WHERE published_at IS NOT NULL
    `).all();

      console.log(`GET /api/product-series - Found ${productSeries.length} product series`);
      
      // Format response
      const formattedData = productSeries.map(ps => ({
        id: ps.id,
        attributes: {
          name: ps.name,
          description: ps.description,
          slug: ps.slug,
          specifications: ps.specifications ? JSON.parse(ps.specifications) : {},
          createdAt: ps.created_at,
          updatedAt: ps.updated_at,
          publishedAt: ps.published_at
        }
      }));

      // Cache the data for faster retrieval
      // This helps with frequent requests from the admin interface
      CACHE.set('product_series', formattedData, 60); // Cache for 60 seconds
      
      res.json({
        data: formattedData
      });
    } catch (queryError) {
      console.error('Error executing product series query:', queryError);
      
      // Fallback to a more basic query if the first one fails
      try {
        console.log('Attempting fallback query for product series');
        const basicSeries = db.prepare(`SELECT id, name, description, slug FROM product_series`).all();
        
        res.json({
          data: basicSeries.map(s => ({
            id: s.id,
            attributes: {
              name: s.name,
              description: s.description,
              slug: s.slug
        }
      }))
    });
      } catch (fallbackError) {
        throw new Error(`Failed basic query: ${fallbackError.message}`);
      }
    }
  } catch (error) {
    console.error('Error in GET /api/product-series:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      endpoint: '/api/product-series'
    });
  }
});

// Create/Update/Delete a product series
app.post('/api/product-series', (req, res) => {
  try {
    const { name, description, slug, specifications, product_type_id, id, _method } = req.body;
    
    // Handle DELETE operations
    if (_method === 'DELETE' && id) {
      console.log(`Handling delete request for product series ID: ${id}`);
      
      // Check if product series exists
      const existingSeries = db.prepare('SELECT * FROM product_series WHERE id = ?').get(id);
      if (!existingSeries) {
        return res.status(404).json({ error: 'Product series not found' });
      }
      
      // Delete the product series
      db.prepare('DELETE FROM product_series WHERE id = ?').run(id);
      
      return res.json({
        message: `Product series with ID ${id} successfully deleted`
      });
    }
    
    // Handle UPDATE operations
    if (_method === 'UPDATE' && id) {
      console.log(`Handling update request for product series ID: ${id}`);
      
      // Check if product series exists
      const existingSeries = db.prepare('SELECT * FROM product_series WHERE id = ?').get(id);
      if (!existingSeries) {
        return res.status(404).json({ error: 'Product series not found' });
      }
      
      // Prepare specifications as JSON if provided
      const specsJson = specifications ? JSON.stringify(specifications) : existingSeries.specifications;
      
      // Current timestamp for updated_at
      const now = new Date().toISOString();
      
      // Update the product series
      const stmt = db.prepare(`
        UPDATE product_series SET
          name = ?, 
          description = ?, 
          slug = ?,
          specifications = ?,
          product_type_id = ?,
          updated_at = ?
        WHERE id = ?
      `);
      
      stmt.run(
        name || existingSeries.name, 
        description !== undefined ? description : existingSeries.description, 
        slug || existingSeries.slug,
        specsJson,
        product_type_id !== undefined ? product_type_id : existingSeries.product_type_id,
        now,
        id
      );
      
      // Get the updated product series
      const updatedSeries = db.prepare('SELECT * FROM product_series WHERE id = ?').get(id);
      
      return res.json({
        data: {
          id: updatedSeries.id,
          attributes: {
            name: updatedSeries.name,
            description: updatedSeries.description,
            slug: updatedSeries.slug,
            specifications: updatedSeries.specifications ? JSON.parse(updatedSeries.specifications) : {},
            createdAt: updatedSeries.created_at,
            updatedAt: updatedSeries.updated_at
          }
        }
      });
    }
    
    // Regular create operation (existing code)
    // Validate required fields
    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required fields' });
    }
    
    // Prepare specifications as JSON if provided
    const specsJson = specifications ? JSON.stringify(specifications) : null;
    
    // Current timestamp for created_at and updated_at
    const now = new Date().toISOString();
    
    // Insert the new product series
    const stmt = db.prepare(`
      INSERT INTO product_series (
        name, description, slug, specifications, product_type_id,
        created_at, updated_at, published_at
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      name, 
      description || '', 
      slug,
      specsJson,
      product_type_id || null,
      now, 
      now, 
      now  // Published immediately
    );
    
    // Get the inserted product series
    const insertedSeries = db.prepare('SELECT * FROM product_series WHERE id = ?').get(result.lastInsertRowid);
    
    res.status(201).json({
      data: {
        id: insertedSeries.id,
        attributes: {
          name: insertedSeries.name,
          description: insertedSeries.description,
          slug: insertedSeries.slug,
          specifications: insertedSeries.specifications ? JSON.parse(insertedSeries.specifications) : {},
          createdAt: insertedSeries.created_at,
          updatedAt: insertedSeries.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Error with product series operation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a product series
app.put('/api/product-series/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, slug, specifications, product_type_id } = req.body;
    
    // Check if product series exists
    const existingSeries = db.prepare('SELECT * FROM product_series WHERE id = ?').get(id);
    if (!existingSeries) {
      return res.status(404).json({ error: 'Product series not found' });
    }
    
    // Prepare specifications as JSON if provided
    const specsJson = specifications ? JSON.stringify(specifications) : existingSeries.specifications;
    
    // Current timestamp for updated_at
    const now = new Date().toISOString();
    
    // Update the product series
    const stmt = db.prepare(`
      UPDATE product_series SET
        name = ?, 
        description = ?, 
        slug = ?,
        specifications = ?,
        product_type_id = ?,
        updated_at = ?
      WHERE id = ?
    `);
    
    stmt.run(
      name || existingSeries.name, 
      description !== undefined ? description : existingSeries.description, 
      slug || existingSeries.slug,
      specsJson,
      product_type_id !== undefined ? product_type_id : existingSeries.product_type_id,
      now,
      id
    );
    
    // Get the updated product series
    const updatedSeries = db.prepare('SELECT * FROM product_series WHERE id = ?').get(id);
    
    res.json({
      data: {
        id: updatedSeries.id,
        attributes: {
          name: updatedSeries.name,
          description: updatedSeries.description,
          slug: updatedSeries.slug,
          specifications: updatedSeries.specifications ? JSON.parse(updatedSeries.specifications) : {},
          createdAt: updatedSeries.created_at,
          updatedAt: updatedSeries.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Error updating product series:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a product series
app.delete('/api/product-series/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if product series exists
    const existingSeries = db.prepare('SELECT * FROM product_series WHERE id = ?').get(id);
    if (!existingSeries) {
      return res.status(404).json({ error: 'Product series not found' });
    }
    
    // Delete the product series
    db.prepare('DELETE FROM product_series WHERE id = ?').run(id);
    
    res.json({
      message: `Product series with ID ${id} successfully deleted`
    });
  } catch (error) {
    console.error('Error deleting product series:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all products
app.get('/api/products', (req, res) => {
  try {
    // Add missing columns if they don't exist
    try {
      const columns = db.prepare(`PRAGMA table_info(products)`).all();
      const columnNames = columns.map(col => col.name);
      console.log('Products table columns:', columnNames);
      
      // Add lumen column if it doesn't exist
      if (!columnNames.includes('lumen')) {
        db.prepare(`ALTER TABLE products ADD COLUMN lumen REAL`).run();
        console.log('Added lumen column to products table');
      }
      
      // Add series_id column if it doesn't exist
      if (!columnNames.includes('series_id')) {
        db.prepare(`ALTER TABLE products ADD COLUMN series_id INTEGER`).run();
        console.log('Added series_id column to products table');
      }
    } catch (columnErr) {
      console.error('Error checking/adding columns:', columnErr);
    }
    
    // Get query parameters
    const { sort, limit, start } = req.query;
    
    // Check for product type filtering
    let query;
    const filterProductTypeSlug = req.query['filters[product_type][slug]'];
    
    if (filterProductTypeSlug) {
      console.log(`Filtering products by product type slug: ${filterProductTypeSlug}`);
      
      // Step 1: Find the product type ID based on the slug
      const productType = db.prepare(`
        SELECT id FROM product_types 
        WHERE slug = ? AND published_at IS NOT NULL
      `).get(filterProductTypeSlug);
      
      if (!productType) {
        console.log(`No product type found with slug: ${filterProductTypeSlug}`);
        // Return empty array if product type doesn't exist
        return res.json({ data: [] });
      }
      
      console.log(`Found product type ID: ${productType.id}`);
      
      // Step 2: Find all series belonging to this product type
      const seriesForProductType = db.prepare(`
        SELECT id FROM product_series 
        WHERE product_type_id = ? AND published_at IS NOT NULL
      `).all(productType.id);
      
      if (seriesForProductType.length === 0) {
        console.log(`No series found for product type ID: ${productType.id}`);
        // Return empty array if no series exist
        return res.json({ data: [] });
      }
      
      const seriesIds = seriesForProductType.map(s => s.id);
      console.log(`Found series IDs: ${seriesIds.join(', ')}`);
      
      // Step 3: Find all products belonging to these series
      // Create parameter placeholders for the IN clause
      const placeholders = seriesIds.map(() => '?').join(',');
      
      query = `
        SELECT * FROM products
        WHERE published_at IS NOT NULL 
        AND series_id IN (${placeholders})
        ORDER BY name ASC
      `;
      
      // Execute the query with the series IDs as parameters
      const products = db.prepare(query).all(...seriesIds);
      console.log(`Found ${products.length} products for product type ${filterProductTypeSlug}`);
      
      // Get all product series for reference
      const allSeries = db.prepare(`SELECT * FROM product_series`).all();
      const seriesMap = {};
      allSeries.forEach(s => {
        seriesMap[s.id] = s;
      });
      
      // Format the products
      const formattedProducts = products.map(product => {
        // Get series info
        const series = product.series_id ? seriesMap[product.series_id] : null;
        
        // Get product type info for this series
        let productTypeData = null;
        if (series && series.product_type_id) {
          const seriesProductType = db.prepare(`
            SELECT * FROM product_types WHERE id = ?
          `).get(series.product_type_id);
          
          if (seriesProductType) {
            productTypeData = {
              data: {
                id: seriesProductType.id,
                attributes: {
                  name: seriesProductType.name,
                  slug: seriesProductType.slug
                }
              }
            };
          }
        }
        
        return {
          id: product.id,
          attributes: {
            name: product.name,
            description: product.description,
            slug: product.slug,
            wattage: product.wattage || 0,
            lumen: product.lumen || 0,
            cct: product.cct || '',
            beam_angle: product.beam_angle || '',
            dimming: product.dimming || 'None',
            is_featured: product.is_featured === 1,
            series: {
              data: series ? {
                id: series.id,
                attributes: {
                  name: series.name,
                  slug: series.slug,
                  product_type: productTypeData
                }
              } : null
            },
            specifications: product.specifications ? JSON.parse(product.specifications) : {},
            createdAt: product.created_at,
            updatedAt: product.updated_at
          }
        };
      });
      
      return res.json({
        data: formattedProducts
      });
    } else {
      // Original behavior without filtering
      query = `
        SELECT * FROM products
        WHERE published_at IS NOT NULL
        ORDER BY name ASC
      `;
      
      // Execute the query
      const products = db.prepare(query).all();
      
      // Get all product series for reference
      const allSeries = db.prepare(`SELECT * FROM product_series`).all();
      const seriesMap = {};
      allSeries.forEach(s => {
        seriesMap[s.id] = s;
      });
      
      // Format the products
      const formattedProducts = products.map(product => {
        const seriesInfo = product.series_id && seriesMap[product.series_id] 
          ? { 
              data: {
                id: seriesMap[product.series_id].id,
                attributes: {
                  name: seriesMap[product.series_id].name,
                  slug: seriesMap[product.series_id].slug || ''
                }
              }
            }
          : null;
          
        return {
          id: product.id,
          attributes: {
            name: product.name,
            description: product.description,
            slug: product.slug,
            wattage: product.wattage || 0,
            lumen: product.lumen || 0,
            cct: product.cct || '',
            beam_angle: product.beam_angle || '',
            dimming: product.dimming || 'None',
            is_featured: product.is_featured === 1,
            series: seriesInfo,
            specifications: product.specifications ? JSON.parse(product.specifications) : {},
            createdAt: product.created_at,
            updatedAt: product.updated_at
          }
        };
      });
      
      res.json({
        data: formattedProducts
      });
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get featured products - this must come BEFORE the :id route to avoid conflicts
app.get('/api/products/featured', (req, res) => {
  try {
    // Get featured products (where is_featured = 1)
    const query = `
      SELECT * FROM products
      WHERE published_at IS NOT NULL AND is_featured = 1
      ORDER BY name ASC
    `;
    
    // Execute the query
    const products = db.prepare(query).all();
    
    // Get all product series for reference
    const allSeries = db.prepare(`SELECT * FROM product_series`).all();
    const seriesMap = {};
    allSeries.forEach(s => {
      seriesMap[s.id] = s;
    });
    
    // Format the products
    const formattedProducts = products.map(product => {
      const seriesInfo = product.series_id && seriesMap[product.series_id] 
        ? { name: seriesMap[product.series_id].name }
        : null;
        
      return {
        id: product.id,
        attributes: {
          name: product.name,
          description: product.description,
          slug: product.slug,
          wattage: product.wattage || 0,
          lumen: product.lumen || 0,
          cct: product.cct || '',
          beam_angle: product.beam_angle || '',
          dimming: product.dimming || 'None',
          is_featured: product.is_featured === 1,
          series_id: product.series_id,
          series: seriesInfo,
          specifications: product.specifications ? JSON.parse(product.specifications) : {},
          createdAt: product.created_at,
          updatedAt: product.updated_at
        }
      };
    });
    
    res.json({
      data: formattedProducts
    });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single product by ID or slug - this needs to come AFTER the /featured route
app.get('/api/products/:idOrSlug', (req, res) => {
  try {
    const { idOrSlug } = req.params;
    
    // Ensure required columns exist
    try {
      const columns = db.prepare(`PRAGMA table_info(products)`).all();
      const columnNames = columns.map(col => col.name);
      
      if (!columnNames.includes('lumen')) {
        db.prepare(`ALTER TABLE products ADD COLUMN lumen REAL`).run();
      }
      
      if (!columnNames.includes('series_id')) {
        db.prepare(`ALTER TABLE products ADD COLUMN series_id INTEGER`).run();
      }
    } catch (columnErr) {
      console.error('Error checking/adding columns:', columnErr);
    }
    
    // Check if the parameter is a number (ID) or string (slug)
    const isNumeric = /^\d+$/.test(idOrSlug);
    
    // Get product either by ID or by slug
    let product;
    if (isNumeric) {
      console.log(`Looking up product by ID: ${idOrSlug}`);
      product = db.prepare(`
        SELECT * FROM products
        WHERE id = ? AND published_at IS NOT NULL
      `).get(idOrSlug);
    } else {
      console.log(`Looking up product by slug: ${idOrSlug}`);
      product = db.prepare(`
        SELECT * FROM products
        WHERE slug = ? AND published_at IS NOT NULL
      `).get(idOrSlug);
    }

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Get series information if series_id exists
    let series = null;
    let productType = null;
    if (product.series_id) {
      series = db.prepare('SELECT * FROM product_series WHERE id = ?').get(product.series_id);
      
      // Get product type information if available
      if (series && series.product_type_id) {
        productType = db.prepare('SELECT * FROM product_types WHERE id = ?').get(series.product_type_id);
      }
    }

    res.json({
      data: {
        id: product.id,
        attributes: {
          name: product.name,
          description: product.description,
          slug: product.slug,
          wattage: product.wattage || 0,
          lumen: product.lumen || 0,
          cct: product.cct || '',
          beam_angle: product.beam_angle || '',
          dimming: product.dimming || 'None',
          is_featured: product.is_featured === 1,
          featured_image: { 
            data: { 
              attributes: { 
                url: '/images/placeholder.svg' 
              } 
            } 
          },
          images: { data: [] },
          series: series ? {
            data: {
              id: series.id,
              attributes: {
                name: series.name,
                slug: series.slug,
                product_type: productType ? {
                  data: {
                    id: productType.id,
                    attributes: {
                      name: productType.name,
                      slug: productType.slug
                    }
                  }
                } : null
              }
            }
          } : null,
          specifications: product.specifications ? JSON.parse(product.specifications) : {},
          createdAt: product.created_at,
          updatedAt: product.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new product
app.post('/api/products', (req, res) => {
  try {
    const { name, description, slug, wattage, lumen, cct, beam_angle, dimming, is_featured, series_id, specifications } = req.body;
    
    // Validate required fields
    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required fields' });
    }
    
    // Prepare specifications as JSON if provided
    const specsJson = specifications ? JSON.stringify(specifications) : null;
    
    // Current timestamp for created_at and updated_at
    const now = new Date().toISOString();
    
    // Check if we need to add lumen column if it doesn't exist
    try {
      // Check if lumen column exists
      const columns = db.prepare(`PRAGMA table_info(products)`).all();
      if (!columns.some(col => col.name === 'lumen')) {
        // Add lumen column if it doesn't exist
        db.prepare(`ALTER TABLE products ADD COLUMN lumen REAL`).run();
        console.log('Added lumen column to products table');
      }
    } catch (columnErr) {
      console.error('Error checking/adding lumen column:', columnErr);
    }
    
    // Insert the new product
    const stmt = db.prepare(`
      INSERT INTO products (
        name, description, slug, 
        wattage, lumen, cct, beam_angle, dimming, is_featured, series_id, specifications,
        created_at, updated_at, published_at
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      name, 
      description || '', 
      slug,
      wattage || 0,
      lumen || 0,
      cct || '', 
      beam_angle || '', 
      dimming || 'None', 
      is_featured ? 1 : 0,
      series_id || null,
      specsJson,
      now, 
      now, 
      now  // Published immediately
    );
    
    // Get the inserted product
    const insertedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    
    // Get the series for the product if available
    let series = null;
    if (insertedProduct.series_id) {
      series = db.prepare('SELECT * FROM product_series WHERE id = ?').get(insertedProduct.series_id);
    }
    
    res.status(201).json({
      data: {
        id: insertedProduct.id,
        attributes: {
          name: insertedProduct.name,
          description: insertedProduct.description,
          slug: insertedProduct.slug,
          wattage: insertedProduct.wattage || 0,
          lumen: insertedProduct.lumen || 0,
          cct: insertedProduct.cct || '',
          beam_angle: insertedProduct.beam_angle || '',
          dimming: insertedProduct.dimming || 'None',
          is_featured: insertedProduct.is_featured === 1,
          series_id: insertedProduct.series_id,
          series: series ? {
            id: series.id,
            name: series.name
          } : null,
          specifications: insertedProduct.specifications ? JSON.parse(insertedProduct.specifications) : {},
          createdAt: insertedProduct.created_at,
          updatedAt: insertedProduct.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a product
app.put('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, slug, wattage, lumen, cct, beam_angle, dimming, is_featured, series_id, specifications } = req.body;
    
    // Check if product exists
    const existingProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Check if lumen column exists and add it if needed
    try {
      const columns = db.prepare(`PRAGMA table_info(products)`).all();
      if (!columns.some(col => col.name === 'lumen')) {
        db.prepare(`ALTER TABLE products ADD COLUMN lumen REAL`).run();
        console.log('Added lumen column to products table');
      }
    } catch (columnErr) {
      console.error('Error checking/adding lumen column:', columnErr);
    }
    
    // Prepare specifications as JSON if provided
    const specsJson = specifications ? JSON.stringify(specifications) : existingProduct.specifications;
    
    // Current timestamp for updated_at
    const now = new Date().toISOString();
    
    // Update the product
    const stmt = db.prepare(`
      UPDATE products SET
        name = ?, 
        description = ?, 
        slug = ?,
        wattage = ?, 
        lumen = ?,
        cct = ?, 
        beam_angle = ?, 
        dimming = ?, 
        is_featured = ?,
        series_id = ?,
        specifications = ?,
        updated_at = ?
      WHERE id = ?
    `);
    
    stmt.run(
      name || existingProduct.name, 
      description !== undefined ? description : existingProduct.description, 
      slug || existingProduct.slug,
      wattage !== undefined ? wattage : existingProduct.wattage,
      lumen !== undefined ? lumen : (existingProduct.lumen || 0),
      cct !== undefined ? cct : existingProduct.cct, 
      beam_angle !== undefined ? beam_angle : existingProduct.beam_angle, 
      dimming !== undefined ? dimming : existingProduct.dimming, 
      is_featured !== undefined ? (is_featured ? 1 : 0) : existingProduct.is_featured,
      series_id !== undefined ? series_id : existingProduct.series_id,
      specsJson,
      now,
      id
    );
    
    // Get the updated product
    const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    
    // Get the series for the product if available
    let series = null;
    if (updatedProduct.series_id) {
      series = db.prepare('SELECT * FROM product_series WHERE id = ?').get(updatedProduct.series_id);
    }
    
    res.json({
      data: {
        id: updatedProduct.id,
        attributes: {
          name: updatedProduct.name,
          description: updatedProduct.description,
          slug: updatedProduct.slug,
          wattage: updatedProduct.wattage || 0,
          lumen: updatedProduct.lumen || 0,
          cct: updatedProduct.cct || '',
          beam_angle: updatedProduct.beam_angle || '',
          dimming: updatedProduct.dimming || 'None',
          is_featured: updatedProduct.is_featured === 1,
          series_id: updatedProduct.series_id,
          series: series ? {
            id: series.id,
            name: series.name
          } : null,
          specifications: updatedProduct.specifications ? JSON.parse(updatedProduct.specifications) : {},
          createdAt: updatedProduct.created_at,
          updatedAt: updatedProduct.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a product
app.delete('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if product exists
    const existingProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Delete the product
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    
    res.json({
      message: `Product with ID ${id} successfully deleted`
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single product type by ID
app.get('/api/product-types/:id', (req, res) => {
  try {
    const { id } = req.params;
    const productType = db.prepare(`
      SELECT * FROM product_types WHERE id = ? AND published_at IS NOT NULL
    `).get(id);

    if (!productType) {
      return res.status(404).json({ error: 'Product type not found' });
    }

    res.json({
      data: {
        id: productType.id,
        attributes: {
          name: productType.name,
          description: productType.description,
          slug: productType.slug,
          createdAt: productType.created_at,
          updatedAt: productType.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Error fetching product type:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single product series by ID
app.get('/api/product-series/:id', (req, res) => {
  try {
    const { id } = req.params;
    console.log(`GET /api/product-series/${id} - Request received`);
    
    // Try to parse id as a number if it's not
    const seriesId = isNaN(id) ? id : parseInt(id);
    
    // First check if this is actually a slug instead of an ID
    let productSeries;
    let isSlug = false;
    
    if (typeof seriesId === 'string') {
      console.log(`Treating "${seriesId}" as a slug`);
      isSlug = true;
      productSeries = db.prepare(`
        SELECT * FROM product_series
        WHERE slug = ? AND published_at IS NOT NULL
      `).get(seriesId);
    } else {
      console.log(`Looking up series with ID: ${seriesId}`);
      productSeries = db.prepare(`
      SELECT * FROM product_series
      WHERE id = ? AND published_at IS NOT NULL
      `).get(seriesId);
    }

    if (!productSeries) {
      console.log(`Series ${isSlug ? 'with slug' : 'with ID'} "${seriesId}" not found`);
      return res.status(404).json({ 
        error: 'Product series not found',
        requested: seriesId
      });
    }
    
    console.log(`Found series: ${productSeries.name}`);
    
    // Get product type if available
    let productType = null;
    if (productSeries.product_type_id) {
      try {
        productType = db.prepare(`
          SELECT * FROM product_types
          WHERE id = ?
        `).get(productSeries.product_type_id);
      } catch (typeError) {
        console.warn(`Could not fetch product type for series ${productSeries.name}:`, typeError);
      }
    }
    
    // Get products in this series
    let products = [];
    try {
      products = db.prepare(`
        SELECT * FROM products
        WHERE series_id = ?
      `).all(productSeries.id);
    } catch (productsError) {
      console.warn(`Could not fetch products for series ${productSeries.name}:`, productsError);
    }

    res.json({
      data: {
        id: productSeries.id,
        attributes: {
          name: productSeries.name,
          description: productSeries.description,
          slug: productSeries.slug,
          specifications: productSeries.specifications ? JSON.parse(productSeries.specifications) : {},
          createdAt: productSeries.created_at,
          updatedAt: productSeries.updated_at,
          publishedAt: productSeries.published_at,
          product_type: {
            data: productType ? {
              id: productType.id,
              attributes: {
                name: productType.name,
                slug: productType.slug
              }
            } : null
          },
          products: {
            data: products.map(p => ({
              id: p.id,
              attributes: {
                name: p.name,
                slug: p.slug
              }
            }))
          }
        }
      }
    });
  } catch (error) {
    console.error(`Error in GET /api/product-series/${req.params.id}:`, error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      endpoint: `/api/product-series/${req.params.id}`
    });
  }
});

// Add a utility endpoint to see what tables exist
app.get('/api/tables', (req, res) => {
  try {
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `).all();
    
    res.json({ tables: tables.map(t => t.name) });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a product type by slug - must come before ID route to prevent conflicts
app.get('/api/product-types/by-slug/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    
    console.log(`Looking up product type with slug: ${slug}`);
    
    // Get all product types to debug
    const allTypes = db.prepare(`SELECT id, name, slug FROM product_types`).all();
    console.log('All product types in database:', allTypes.map(t => `${t.name} (${t.slug})`).join(', '));
    
    // Find the product type by slug
    const productType = db.prepare(`
      SELECT * FROM product_types 
      WHERE slug = ?
    `).get(slug);

    if (!productType) {
      console.log(`No product type found with slug: ${slug}`);
      return res.status(404).json({ error: 'Product type not found' });
    }
    
    console.log(`Found product type: ${productType.name} (ID: ${productType.id})`);

    // Get series for this product type
    const series = db.prepare(`
      SELECT * FROM product_series 
      WHERE product_type_id = ?
    `).all(productType.id);
    
    console.log(`Found ${series.length} series for product type ${productType.name}`);

    // Format response
    res.json({
      data: {
        id: productType.id,
        attributes: {
          name: productType.name,
          description: productType.description,
          slug: productType.slug,
          createdAt: productType.created_at,
          updatedAt: productType.updated_at,
          publishedAt: productType.published_at,
          series: {
            data: series.map(s => ({
              id: s.id,
              attributes: {
                name: s.name,
                slug: s.slug,
                description: s.description
              }
            }))
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching product type by slug:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get a product series by slug using query parameter
app.get('/api/product-series-by-slug', (req, res) => {
  try {
    const { slug } = req.query;
    
    if (!slug) {
      return res.status(400).json({ error: 'Slug parameter is required' });
    }
    
    console.log(`GET /api/product-series-by-slug - Looking up series with slug: "${slug}"`);
    
    const productSeries = db.prepare(`
      SELECT * FROM product_series 
      WHERE slug = ? AND published_at IS NOT NULL
    `).get(slug);

    if (!productSeries) {
      console.log(`Series with slug "${slug}" not found`);
      return res.status(404).json({ 
        error: 'Product series not found',
        requestedSlug: slug
      });
    }
    
    console.log(`Found series: ${productSeries.name}`);

    // Get product type if available
    let productType = null;
    if (productSeries.product_type_id) {
      try {
      productType = db.prepare(`
          SELECT * FROM product_types
          WHERE id = ?
        `).get(productSeries.product_type_id);
      } catch (typeError) {
        console.warn(`Could not fetch product type for series ${productSeries.name}:`, typeError);
      }
    }

    // Get products in this series
    let products = [];
    try {
      products = db.prepare(`
      SELECT * FROM products 
        WHERE series_id = ?
      `).all(productSeries.id);
    } catch (productsError) {
      console.warn(`Could not fetch products for series ${productSeries.name}:`, productsError);
    }
    
    res.json({
      data: {
        id: productSeries.id,
        attributes: {
          name: productSeries.name,
          description: productSeries.description,
          slug: productSeries.slug,
          specifications: productSeries.specifications ? JSON.parse(productSeries.specifications) : {},
          createdAt: productSeries.created_at,
          updatedAt: productSeries.updated_at,
          publishedAt: productSeries.published_at,
          product_type: {
            data: productType ? {
              id: productType.id,
              attributes: {
                name: productType.name,
                slug: productType.slug
              }
            } : null
          },
          products: {
            data: products.map(p => ({
              id: p.id,
              attributes: {
                name: p.name,
                slug: p.slug
              }
            }))
          }
        }
      }
    });
  } catch (error) {
    console.error('Error in GET /api/product-series-by-slug:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      endpoint: '/api/product-series-by-slug'
    });
  }
});

// Add a database status endpoint to check if database is set up correctly
app.get('/api/db-status', (req, res) => {
  try {
    // Check if database is connected
    const dbConnected = !!db;
    
    // Count tables
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `).all();
    
    // Count product types
    const productTypesCount = db.prepare('SELECT COUNT(*) as count FROM product_types').get().count;
    
    // Count product series
    const productSeriesCount = db.prepare('SELECT COUNT(*) as count FROM product_series').get().count;
    
    // Count products
    const productsCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    
    // Get all product types
    const productTypes = db.prepare('SELECT id, name, slug FROM product_types').all();
    
    // Check if downlights exists
    const downlights = db.prepare("SELECT id FROM product_types WHERE slug = 'downlights'").get();
    
    res.json({
      status: 'ok',
      dbConnected,
      tables: tables.map(t => t.name),
      counts: {
        productTypes: productTypesCount,
        productSeries: productSeriesCount,
        products: productsCount
      },
      productTypes,
      hasSampleData: productTypesCount > 0 && productSeriesCount > 0 && productsCount > 0,
      hasDownlights: !!downlights
    });
  } catch (error) {
    console.error('Error checking database status:', error);
    res.status(500).json({ 
      status: 'error',
      error: error.message,
      stack: error.stack 
    });
  }
});

// Add a special test endpoint
app.get('/api/test-routes/:param', (req, res) => {
  const { param } = req.params;
  console.log(`TEST ROUTE - Called with param: "${param}"`);
  
  // Try to use the same database query that the real endpoint uses
  const series = db.prepare(`
    SELECT * FROM product_series 
    WHERE slug = ? AND published_at IS NOT NULL
  `).get(param);
  
  res.json({
    message: 'Test route working',
    param: param,
    paramType: typeof param,
    found: !!series,
    series: series ? series.name : null
  });
});

// Specific route for slim-line that bypasses the dynamic route
app.get('/api/product-series/slim-line-direct', (req, res) => {
  console.log('Direct slim-line endpoint called');
  
  const series = db.prepare(`
    SELECT * FROM product_series 
    WHERE slug = 'slim-line' AND published_at IS NOT NULL
  `).get();
  
  if (!series) {
    console.log('Direct endpoint - No series found');
    return res.status(404).json({ error: 'Product series not found' });
  }
  
  console.log(`Direct endpoint - Found series: ${series.name}`);
  
  // Format response like the regular endpoint
  res.json({
    data: {
      id: series.id,
      attributes: {
        name: series.name,
        description: series.description,
        slug: series.slug,
        specifications: series.specifications ? JSON.parse(series.specifications) : {},
        product_type: null,
        products: { data: [] }
      }
    }
  });
});

// Special debug endpoint to see params
app.get('/api/debug-params', (req, res) => {
  res.json({
    originalUrl: req.originalUrl,
    url: req.url,
    baseUrl: req.baseUrl,
    path: req.path,
    params: req.params,
    query: req.query
  });
});

// Add health check endpoint for easier testing
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    apiVersion: '1.0.0',
    databaseConnected: !!db,
    cors: 'enabled',
    server: 'LEVO API Server'
  });
});

// Add a catch-all handler for undefined routes
app.use((req, res, next) => {
  console.log(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'Route not found',
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Add an error handler
app.use((err, req, res, next) => {
  console.error('Express error handler caught an error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET /api/product-types');
  console.log('  GET /api/product-series');
  console.log('  GET /api/products');
  console.log('  GET /api/product-types/:id');
  console.log('  GET /api/product-series/:id');
  console.log('  GET /api/products/:id');
  console.log('  GET /api/tables (utility endpoint)');
}); 