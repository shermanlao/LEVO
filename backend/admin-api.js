/**
 * Simplified Admin API server for LEVO admin interface
 * 
 * This server focuses only on admin endpoints needed for the frontend
 */

const express = require('express');
const cors = require('cors');
const PORT = 3334; // Use a different port to avoid conflicts

const app = express();

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[ADMIN API] ${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Basic health check endpoint
app.get('/api', (req, res) => {
  res.json({
    status: 'success',
    message: 'Admin API is running',
    time: new Date().toISOString()
  });
});

// Product types endpoint for admin
app.get('/api/product-types', (req, res) => {
  console.log('Admin API: Serving product types');
  
  const productTypes = [
    {
      id: 1,
      attributes: {
        name: "Downlights",
        description: "High-quality recessed lighting fixtures for residential and commercial spaces.",
        slug: "downlights", 
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString()
      }
    },
    {
      id: 2,
      attributes: {
        name: "Linear Lighting",
        description: "Sleek profile linear fixtures for modern architectural applications.",
        slug: "linear-lighting",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString()
      }
    },
    {
      id: 3,
      attributes: {
        name: "Track Lighting",
        description: "Versatile track lighting systems for retail, gallery and hospitality spaces.",
        slug: "track-lighting",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString()
      }
    },
    {
      id: 4,
      attributes: {
        name: "Spotlights",
        description: "Directional lights that emit a concentrated beam for accent lighting.",
        slug: "spotlights",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString()
      }
    }
  ];
  
  res.json({ data: productTypes });
});

// Product series endpoint for admin
app.get('/api/product-series', (req, res) => {
  console.log('Admin API: Serving product series');
  
  const productSeries = [
    {
      id: 1,
      attributes: {
        name: "Basic Downlight Series",
        description: "A basic series of downlights suitable for residential use.",
        slug: "basic-downlight-series",
        specifications: { "power": "10W", "color": "White" },
        product_type: {
          data: {
            id: 1,
            attributes: {
              name: "Downlights",
              slug: "downlights"
            }
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString()
      }
    },
    {
      id: 2,
      attributes: {
        name: "Modern Linear Series",
        description: "Sleek linear lighting options for contemporary spaces.",
        slug: "modern-linear-series",
        specifications: { "power": "20W", "color": "Black" },
        product_type: {
          data: {
            id: 2,
            attributes: {
              name: "Linear Lighting",
              slug: "linear-lighting"
            }
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString()
      }
    },
    {
      id: 3,
      attributes: {
        name: "Retail Track Series",
        description: "Versatile track lights for retail environments.",
        slug: "retail-track-series",
        specifications: { "power": "15W", "color": "Silver" },
        product_type: {
          data: {
            id: 3,
            attributes: {
              name: "Track Lighting",
              slug: "track-lighting"
            }
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString()
      }
    }
  ];
  
  res.json({ data: productSeries });
});

// Admin-specific product types endpoint
app.get('/api/admin/product-types', (req, res) => {
  console.log('Admin API: Serving admin product types');
  
  const productTypes = [
    {
      id: 1,
      attributes: {
        name: "Downlights",
        description: "High-quality recessed lighting fixtures for residential and commercial spaces.",
        slug: "downlights", 
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString()
      }
    },
    {
      id: 2,
      attributes: {
        name: "Linear Lighting",
        description: "Sleek profile linear fixtures for modern architectural applications.",
        slug: "linear-lighting",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString()
      }
    },
    {
      id: 3,
      attributes: {
        name: "Track Lighting",
        description: "Versatile track lighting systems for retail, gallery and hospitality spaces.",
        slug: "track-lighting",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString()
      }
    },
    {
      id: 4,
      attributes: {
        name: "Spotlights",
        description: "Directional lights that emit a concentrated beam for accent lighting.",
        slug: "spotlights",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString()
      }
    }
  ];
  
  res.json({ data: productTypes });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Admin API error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message,
    path: req.path
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Admin API server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET /api');
  console.log('  GET /api/product-types');
  console.log('  GET /api/product-series');
  console.log('  GET /api/admin/product-types');
}); 