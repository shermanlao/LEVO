/**
 * Minimal Express API server for LEVO products 
 */

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');

// Configuration
const PORT = 3333;
const app = express();
const DB_PATH = path.join(__dirname, '..', 'database', 'database.sqlite');
const FRONTEND_PATH = path.join(__dirname, '..', 'levo-frontend');
const UPLOADS_DIR = path.join(FRONTEND_PATH, 'public', 'images', 'products');
const apiUrl = `http://localhost:${PORT}`;

// Create uploads directory if it doesn't exist
try {
  // First create the main uploads directory
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log(`Creating uploads directory at: ${UPLOADS_DIR}`);
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  
  console.log(`Base uploads directory configured at: ${UPLOADS_DIR}`);
} catch (err) {
  console.error(`Error creating uploads directory: ${err.message}`);
}

// Validate DB path exists before attempting to open
try {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Database file not found at: ${DB_PATH}`);
  } else {
    console.log(`Verified database file exists at: ${DB_PATH}`);
  }
} catch (err) {
  console.error(`Error checking database file: ${err.message}`);
}

// Middleware
app.use(cors({
  origin: '*',  // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'Cache-Control', 'Pragma'],
  credentials: true,
  exposedHeaders: ['Content-Disposition']
}));

// Additional debug-friendly headers
app.use((req, res, next) => {
  // Add extra headers to help debug across origins
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Cache-Control, Pragma');
  
  // Add cache control headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Add more detailed logging when response completes
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    
    // Log more details for error responses
    if (res.statusCode >= 400) {
      console.error(`Error response for ${req.url}: HTTP ${res.statusCode}`);
    }
  });
  
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));
console.log(`Serving static files from: ${path.join(__dirname, 'public/uploads')}`);

// Connect to the database
let db;
try {
  console.log(`Attempting to connect to database at: ${DB_PATH}`);
  db = new Database(DB_PATH, { verbose: console.log });
  console.log(`Connected to SQLite database at ${DB_PATH}`);
  
  // Verify database structure
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log(`Database contains ${tables.length} tables:`, tables.map(t => t.name).join(', '));
  
  // Create directories for each series slug from the database
  try {
    if (tables.some(t => t.name === 'product_series')) {
      console.log('Creating upload directories for each product series in database...');
      const seriesList = db.prepare('SELECT slug FROM product_series').all();
      
      if (seriesList && seriesList.length > 0) {
        seriesList.forEach(series => {
          if (series.slug) {
            const seriesDir = path.join(UPLOADS_DIR, series.slug);
            if (!fs.existsSync(seriesDir)) {
              console.log(`Creating directory for series '${series.slug}': ${seriesDir}`);
              fs.mkdirSync(seriesDir, { recursive: true });
            }
          }
        });
        console.log(`Created directories for ${seriesList.length} product series`);
      } else {
        console.log('No product series found in database');
      }
    } else {
      console.warn('Product series table not found in database');
    }
  } catch (dirErr) {
    console.error(`Error creating series directories: ${dirErr.message}`);
  }
  
} catch (err) {
  console.error(`Failed to connect to database: ${err.message}`);
}

// Configure multer for file uploads - Now db is defined before this configuration
// First, ensure we parse form data correctly
app.use(bodyParser.urlencoded({ extended: true }));

// Create a multer middleware function that processes the upload after body parsing
const createUploadMiddleware = () => {
  const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      console.log('Multer destination function called with file:', file.originalname);
      console.log('Request body in multer destination:', JSON.stringify(req.body, null, 2));
      
      // Get product ID from request (required parameter)
      const productId = parseInt(req.body.productId);
      console.log(`Parsed productId: ${productId}, type: ${typeof productId}, isNaN: ${isNaN(productId)}`);
      
      if (!productId || isNaN(productId)) {
        console.error('Missing or invalid productId in upload request');
        return cb(new Error('Missing or invalid productId'));
      }
      
      try {
        if (!db) {
          console.error('Database not available for folder determination');
          return cb(new Error('Database connection not available, upload failed'));
        }
        
        // Query to get the product series info based on product ID
        const query = `
          SELECT ps.slug as series_slug
          FROM products p
          LEFT JOIN product_series ps ON p.series_id = ps.id
          WHERE p.id = ?
        `;
        
        console.log(`Executing query for product ID: ${productId}`);
        const productInfo = db.prepare(query).get(productId);
        console.log('Query result:', productInfo);
        
        if (!productInfo || !productInfo.series_slug) {
          console.error(`No series info found in database for product ID ${productId}`);
          // As a workaround, use eco-pro for ID 1-2, slim-line for ID 5-6, and general for others
          let folder = 'general';
          if (productId === 1 || productId === 2) {
            folder = 'eco-pro';
          } else if (productId >= 5 && productId <= 6) {
            folder = 'slim-line';
          }
          console.log(`Using hardcoded fallback folder for known product ID: ${folder}`);
          
          // Set the target directory based on the determined folder
          const targetDir = path.join(UPLOADS_DIR, folder);
          
          // Ensure the directory exists
          if (!fs.existsSync(targetDir)) {
            console.log(`Directory does not exist, creating: ${targetDir}`);
            fs.mkdirSync(targetDir, { recursive: true });
            console.log(`Created directory: ${targetDir}`);
          }
          
          console.log(`Storing file to fallback directory: ${targetDir}`);
          return cb(null, targetDir);
        }
        
        const folder = productInfo.series_slug;
        console.log(`Determined folder from database: ${folder} for product ID ${productId}`);
        
        // Set the target directory based on the determined folder
        const targetDir = path.join(UPLOADS_DIR, folder);
        console.log(`Target directory: ${targetDir}`);
        
        // Ensure the directory exists
        if (!fs.existsSync(targetDir)) {
          console.log(`Directory does not exist, creating: ${targetDir}`);
          fs.mkdirSync(targetDir, { recursive: true });
          console.log(`Created directory: ${targetDir}`);
        } else {
          console.log(`Directory already exists: ${targetDir}`);
        }
        
        console.log(`Storing file to: ${targetDir}`);
        cb(null, targetDir);
        
      } catch (err) {
        console.error(`Error determining folder from database: ${err.message}`);
        console.error('Error stack:', err.stack);
        cb(new Error(`Failed to determine upload folder: ${err.message}`));
      }
    },
    filename: function(req, file, cb) {
      console.log('Multer filename function called with file:', file.originalname);
      
      // Get product ID and image type from request (required parameters)
      const productId = parseInt(req.body.productId);
      const imageType = req.body.imageType;
      
      console.log(`Filename function - productId: ${productId}, imageType: ${imageType}`);
      
      // Determine the file extension from original file or default to .jpg
      const fileExt = path.extname(file.originalname) || '.jpg';
      
      if (!productId || !imageType) {
        console.error('Missing productId or imageType in upload request');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        // Fallback to a timestamped name if missing required params
        const timestamp = Date.now();
        const fileName = `upload-${timestamp}${fileExt}`;
        console.log(`Missing required parameters, using fallback filename: ${fileName}`);
        cb(null, fileName);
        return;
      }
      
      // Simplify image type: main_image_A -> main-A, application_image -> application, etc.
      let simplifiedType = imageType;
      if (imageType === 'main_image_A') {
        simplifiedType = 'main-A';
      } else if (imageType === 'main_image_B') {
        simplifiedType = 'main-B';
      } else if (imageType.includes('_')) {
        // For other types, just remove "_image" suffix if present
        simplifiedType = imageType.replace('_image', '');
      }
      
      // Create filename in the correct format: [id]-[simplified_type].[ext]
      const fileName = `${productId}-${simplifiedType}${fileExt}`;
      console.log(`Generated filename: ${fileName} for product ${productId}, type ${imageType}`);
      cb(null, fileName);
    }
  });
  
  return multer({
    storage: storage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: function(req, file, cb) {
      // Accept only images
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'));
      }
      cb(null, true);
    }
  });
};

// Create the upload middleware
const upload = createUploadMiddleware();

// --------------------------------
// API Routes
// --------------------------------

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root API endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'LEVO Lighting API',
    endpoints: [
      '/api/health',
      '/api/products',
      '/api/product-types',
      '/api/product-series',
      '/api/projects'
    ]
  });
});

// Get all products
app.get('/api/products', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    // Simple query without condition
    const query = `
      SELECT p.*, ps.name as series_name, ps.slug as series_slug,
             pt.id as product_type_id, pt.name as product_type_name, pt.slug as product_type_slug
      FROM products p
      LEFT JOIN product_series ps ON p.series_id = ps.id
      LEFT JOIN product_types pt ON ps.product_type_id = pt.id
      WHERE 1=1
    `;
    
    const products = db.prepare(query).all();
    
    // Format products for response
    const formattedProducts = products.map(p => ({
      id: p.id,
      attributes: {
        name: p.name,
        description: p.description,
        slug: p.slug,
        wattage: p.wattage,
        lumen: p.lumen,
        cct: p.cct,
        beam_angle: p.beam_angle,
        dimming: p.dimming,
        is_featured: p.is_featured ? true : false,
        // Explicitly include series_id to ensure it's available to the frontend
        series_id: p.series_id,
        
        // CRITICAL: Include ALL database fields for complete data integrity
        product_code: p.product_code,
        dimensions: p.dimensions,
        cutout_size: p.cutout_size,
        mounting_type: p.mounting_type,
        trim_color: p.trim_color,
        reflector_finish: p.reflector_finish,
        orientation: p.orientation,
        lamp_source: p.lamp_source,
        system_lumen: p.system_lumen,
        cri: p.cri,
        ip_rating: p.ip_rating,
        lifetime: p.lifetime,
        driver_type: p.driver_type,
        power_factor: p.power_factor,
        input_voltage: p.input_voltage,
        warranty: p.warranty,
        colour: p.colour,
        material: p.material,
        efficacy: p.efficacy,
        optic: p.optic,
        operating_temperature: p.operating_temperature,
        datasheet: p.datasheet,
        
        // Include all image fields
        main_image_A: p.main_image_A,
        main_image_B: p.main_image_B,
        size_image: p.size_image,
        application_image: p.application_image,
        photometric_image: p.photometric_image,
        featured_image: p.featured_image,
        
        series: p.series_id ? {
          data: {
            id: p.series_id,
            attributes: {
              name: p.series_name,
              slug: p.series_slug,
              product_type: p.product_type_id ? {
                data: {
                  id: p.product_type_id,
                  attributes: {
                    name: p.product_type_name,
                    slug: p.product_type_slug
                  }
                }
              } : null
            }
          }
        } : null,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }
    }));
    
    return res.json({ data: formattedProducts });
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get featured products endpoint - MUST be before any other /api/products/:something routes
app.get('/api/products/featured', (req, res) => {
  try {
    console.log('GET /api/products/featured - Request received');
    
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    // Query featured products
    const query = `
      SELECT p.*, ps.name as series_name, ps.slug as series_slug,
             pt.id as product_type_id, pt.name as product_type_name, pt.slug as product_type_slug,
             p.main_image_A, p.main_image_B, p.size_image, p.application_image, p.photometric_image, p.featured_image
      FROM products p
      LEFT JOIN product_series ps ON p.series_id = ps.id
      LEFT JOIN product_types pt ON ps.product_type_id = pt.id
      WHERE p.is_featured = 1
    `;
    
    console.log('Executing featured products query');
    const products = db.prepare(query).all();
    console.log(`Found ${products.length} featured products`);
    
    // Format products for response
    const formattedProducts = products.map(p => {
      // Check if image fields exist in database
      const seriesSlug = p.series_slug || 'general';
      
      // Format proper image paths for frontend
      let mainImageA = p.main_image_A;
      let mainImageB = p.main_image_B;
      let sizeImage = p.size_image;
      let applicationImage = p.application_image;
      let photometricImage = p.photometric_image;
      let featuredImage = p.featured_image;
      
      // If database values don't contain full paths, generate them
      if (mainImageA && !mainImageA.startsWith('/')) {
        mainImageA = `/images/products/${seriesSlug}/${mainImageA}`;
      }
      
      if (mainImageB && !mainImageB.startsWith('/')) {
        mainImageB = `/images/products/${seriesSlug}/${mainImageB}`;
      }
      
      if (sizeImage && !sizeImage.startsWith('/')) {
        sizeImage = `/images/products/${seriesSlug}/${sizeImage}`;
      }
      
      if (applicationImage && !applicationImage.startsWith('/')) {
        applicationImage = `/images/products/${seriesSlug}/${applicationImage}`;
      }
      
      if (photometricImage && !photometricImage.startsWith('/')) {
        photometricImage = `/images/products/${seriesSlug}/${photometricImage}`;
      }
      
      if (featuredImage && !featuredImage.startsWith('/')) {
        featuredImage = `/images/products/${seriesSlug}/${featuredImage}`;
      }
      
      // Always ensure we have a path even if database has null
      if (!mainImageA) {
        mainImageA = `/images/products/${seriesSlug}/${p.id}-main_image_A.jpg`;
      }
      
      if (!featuredImage) {
        featuredImage = mainImageA; // Use main image as featured image if not specified
      }
      
      return {
        id: p.id,
        attributes: {
          name: p.name,
          description: p.description,
          slug: p.slug,
          wattage: p.wattage,
          lumen: p.lumen,
          cct: p.cct,
          beam_angle: p.beam_angle,
          dimming: p.dimming,
          is_featured: p.is_featured ? true : false,
          // Include image fields with properly formatted paths
          main_image_A: mainImageA,
          main_image_B: mainImageB,
          size_image: sizeImage,
          application_image: applicationImage,
          photometric_image: photometricImage,
          featured_image: featuredImage,
          series: p.series_id ? {
            data: {
              id: p.series_id,
              attributes: {
                name: p.series_name,
                slug: p.series_slug,
                product_type: p.product_type_id ? {
                  data: {
                    id: p.product_type_id,
                    attributes: {
                      name: p.product_type_name,
                      slug: p.product_type_slug
                    }
                  }
                } : null
              }
            }
          } : null,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        }
      };
    });
    
    console.log(`Successfully formatted ${formattedProducts.length} featured products`);
    console.log('Sending featured products response');
    return res.json({ data: formattedProducts });
  } catch (error) {
    console.error('Error in GET /api/products/featured:', error);
    console.error(error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Get product by path
app.get('/api/products/by-path/:type_slug/:series_slug/:product_slug', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { type_slug, series_slug, product_slug } = req.params;
    
    // Special handling for flex-beam products
    if (product_slug.includes('flex-beam')) {
      console.log(`Special handling for flex-beam product: ${product_slug}`);
      
      // Try to find the product by slug only, ignoring path constraints
      const flexbeamQuery = `
        SELECT p.*, ps.name as series_name, ps.slug as series_slug,
               pt.id as product_type_id, pt.name as product_type_name, pt.slug as product_type_slug
        FROM products p
        LEFT JOIN product_series ps ON p.series_id = ps.id
        LEFT JOIN product_types pt ON ps.product_type_id = pt.id
        WHERE p.slug LIKE ?
      `;
      
      // Use LIKE with wildcard to find any flex-beam product
      const product = db.prepare(flexbeamQuery).get(`%flex-beam%`);
      
      if (product) {
        console.log(`Found flex-beam product with ID: ${product.id}`);
        
        // Inject the correct image paths for this product if it's flex-beam-22w
        if (product_slug === 'flex-beam-22w') {
          product.main_image_A = 'flex-beam-22w/flex-beam-22w-main.jpg';
          // Use the featured_image field instead of featured_image_id
          product.featured_image = '/images/products/flex-beam/10-featured_image.JPG';
        } else {
          product.main_image_A = 'flex-beam/10-main_image_a.jpg';
        }
        
        // Format product for response
        const formattedProduct = {
          id: product.id,
          attributes: {
            name: product_slug === 'flex-beam-22w' ? 'FlexBeam 22W' : product.name,
            description: product.description,
            slug: product_slug, // Use the requested slug
            wattage: product_slug === 'flex-beam-22w' ? 22 : product.wattage,
            lumen: product.lumen,
            cct: product.cct,
            beam_angle: product.beam_angle,
            dimming: product.dimming,
            is_featured: product.is_featured ? true : false,
            product_code: product_slug === 'flex-beam-22w' ? 'FB-22W' : product.product_code,
            dimensions: product.dimensions,
            cutout_size: product.cutout_size,
            mounting_type: product.mounting_type,
            trim_color: product.trim_color,
            reflector_finish: product.reflector_finish,
            orientation: product.orientation,
            lamp_source: product.lamp_source,
            system_lumen: product.system_lumen,
            lifetime: product.lifetime,
            driver_type: product.driver_type,
            power_factor: product.power_factor,
            input_voltage: product.input_voltage,
            datasheet: product.datasheet,
            // Unified columns
            warranty: product.warranty,
            installation_type: product.installation_type,
            colour: product.colour,
            material: product.material,
            cri: product.cri,
            ip_rating: product.ip_rating,
            // Include image fields with our custom paths
            main_image_A: product.main_image_A,
            main_image_B: product.main_image_B,
            size_image: product.size_image,
            application_image: product.application_image,
            photometric_image: product.photometric_image,
            featured_image: product.featured_image,
            series: {
              data: {
                id: product.series_id || 1,
                attributes: {
                  name: "FlexBeam",
                  slug: "flex-beam",
                  product_type: {
                    data: {
                      id: product.product_type_id || 4,
                      attributes: {
                        name: "Spotlights",
                        slug: "spotlights"
                      }
                    }
                  }
                }
              }
            },
            // Only include other specifications that are not now columns
            specifications: (() => {
              let specs = {};
              try {
                specs = product.specifications ? JSON.parse(product.specifications) : {};
              } catch (e) {}
              // Remove unified fields from specifications
              delete specs['Warranty'];
              delete specs['Installation'];
              delete specs['Installation Type'];
              delete specs['Colour'];
              delete specs['Color'];
              delete specs['Material'];
              delete specs['CRI'];
              delete specs['IP Rating'];
              return specs;
            })(),
            createdAt: product.created_at,
            updatedAt: product.updated_at
          }
        };
        
        return res.json({ data: formattedProduct });
      }
    }
    
    // Query product by path
    const query = `
      SELECT p.*, ps.name as series_name, ps.slug as series_slug,
             pt.id as product_type_id, pt.name as product_type_name, pt.slug as product_type_slug
      FROM products p
      LEFT JOIN product_series ps ON p.series_id = ps.id
      LEFT JOIN product_types pt ON ps.product_type_id = pt.id
      WHERE p.slug = ? AND ps.slug = ? AND pt.slug = ?
    `;
    
    const product = db.prepare(query).get(product_slug, series_slug, type_slug);
    
    if (!product) {
      return res.status(404).json({ 
        error: 'Product not found',
        path: `${type_slug}/${series_slug}/${product_slug}`
      });
    }
    
    // Format product for response
    const formattedProduct = {
      id: product.id,
      attributes: {
        name: product.name,
        description: product.description,
        slug: product.slug,
        wattage: product.wattage,
        lumen: product.lumen,
        cct: product.cct,
        beam_angle: product.beam_angle,
        dimming: product.dimming,
        is_featured: product.is_featured ? true : false,
        product_code: product.product_code,
        dimensions: product.dimensions,
        cutout_size: product.cutout_size,
        mounting_type: product.mounting_type,
        trim_color: product.trim_color,
        reflector_finish: product.reflector_finish,
        orientation: product.orientation,
        lamp_source: product.lamp_source,
        system_lumen: product.system_lumen,
        lifetime: product.lifetime,
        driver_type: product.driver_type,
        power_factor: product.power_factor,
        input_voltage: product.input_voltage,
        datasheet: product.datasheet,
        // Unified columns
        warranty: product.warranty,
        installation_type: product.installation_type,
        colour: product.colour,
        material: product.material,
        cri: product.cri,
        ip_rating: product.ip_rating,
        // Include image fields
        main_image_A: product.main_image_A,
        main_image_B: product.main_image_B,
        size_image: product.size_image,
        application_image: product.application_image,
        photometric_image: product.photometric_image,
        featured_image: product.featured_image,
        series: product.series_id ? {
          data: {
            id: product.series_id,
            attributes: {
              name: product.series_name,
              slug: product.series_slug,
              product_type: product.product_type_id ? {
                data: {
                  id: product.product_type_id,
                  attributes: {
                    name: product.product_type_name,
                    slug: product.product_type_slug
                  }
                }
              } : null
            }
          }
        } : null,
        // Only include other specifications that are not now columns
        specifications: (() => {
          let specs = {};
          try {
            specs = product.specifications ? JSON.parse(product.specifications) : {};
          } catch (e) {}
          // Remove unified fields from specifications
          delete specs['Warranty'];
          delete specs['Installation'];
          delete specs['Installation Type'];
          delete specs['Colour'];
          delete specs['Color'];
          delete specs['Material'];
          delete specs['CRI'];
          delete specs['IP Rating'];
          return specs;
        })(),
        createdAt: product.created_at,
        updatedAt: product.updated_at
      }
    };
    
    return res.json({ data: formattedProduct });
  } catch (error) {
    console.error('Error in GET /api/products/by-path:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get product by ID
app.get('/api/products/:id', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { id } = req.params;
    
    // Query product by ID
    const query = `
      SELECT p.*, ps.name as series_name, ps.slug as series_slug,
             pt.id as product_type_id, pt.name as product_type_name, pt.slug as product_type_slug
      FROM products p
      LEFT JOIN product_series ps ON p.series_id = ps.id
      LEFT JOIN product_types pt ON ps.product_type_id = pt.id
      WHERE p.id = ? OR p.slug = ?
    `;
    
    const product = db.prepare(query).get(id, id);
    
    if (!product) {
      return res.status(404).json({ 
        error: 'Product not found',
        id: id
      });
    }
    
    // Format product for response
    const formattedProduct = {
      id: product.id,
      attributes: {
        name: product.name,
        description: product.description,
        slug: product.slug,
        wattage: product.wattage,
        lumen: product.lumen,
        cct: product.cct,
        beam_angle: product.beam_angle,
        dimming: product.dimming,
        is_featured: product.is_featured ? true : false,
        product_code: product.product_code,
        dimensions: product.dimensions,
        cutout_size: product.cutout_size,
        mounting_type: product.mounting_type,
        trim_color: product.trim_color,
        reflector_finish: product.reflector_finish,
        orientation: product.orientation,
        lamp_source: product.lamp_source,
        system_lumen: product.system_lumen,
        lifetime: product.lifetime,
        driver_type: product.driver_type,
        power_factor: product.power_factor,
        input_voltage: product.input_voltage,
        datasheet: product.datasheet,
        // Unified columns
        warranty: product.warranty,
        installation_type: product.installation_type,
        colour: product.colour,
        material: product.material,
        cri: product.cri,
        ip_rating: product.ip_rating,
        // Include image fields
        main_image_A: product.main_image_A,
        main_image_B: product.main_image_B,
        size_image: product.size_image,
        application_image: product.application_image,
        photometric_image: product.photometric_image,
        featured_image: product.featured_image,
        series: product.series_id ? {
          data: {
            id: product.series_id,
            attributes: {
              name: product.series_name,
              slug: product.series_slug,
              product_type: product.product_type_id ? {
                data: {
                  id: product.product_type_id,
                  attributes: {
                    name: product.product_type_name,
                    slug: product.product_type_slug
                  }
                }
              } : null
            }
          }
        } : null,
        // Only include other specifications that are not now columns
        specifications: (() => {
          let specs = {};
          try {
            specs = product.specifications ? JSON.parse(product.specifications) : {};
          } catch (e) {}
          // Remove unified fields from specifications
          delete specs['Warranty'];
          delete specs['Installation'];
          delete specs['Installation Type'];
          delete specs['Colour'];
          delete specs['Color'];
          delete specs['Material'];
          delete specs['CRI'];
          delete specs['IP Rating'];
          return specs;
        })(),
        createdAt: product.created_at,
        updatedAt: product.updated_at
      }
    };
    
    return res.json({ data: formattedProduct });
  } catch (error) {
    console.error(`Error in GET /api/products/${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get all product types
app.get('/api/product-types', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    // Check for populate parameter
    const populate = req.query.populate;
    console.log('Populate parameter:', populate);
    
    const productTypes = db.prepare('SELECT * FROM product_types').all();
    
    // Format product types for response
    const formattedTypes = productTypes.map(pt => {
      // Base attributes that are always included
      const attributes = {
        name: pt.name,
        description: pt.description,
        slug: pt.slug,
        createdAt: pt.created_at,
        updatedAt: pt.updated_at
      };
      
      // Add featured_image if requested or if it exists
      if (populate === 'featured_image' || populate === '*') {
        if (pt.featured_image) {
          console.log(`Product type ${pt.name} has featured_image: ${pt.featured_image}`);
          attributes.featured_image = {
            data: {
              attributes: {
                url: pt.featured_image
              }
            }
          };
        } else {
          console.log(`Product type ${pt.name} has no featured_image`);
          attributes.featured_image = { data: null };
        }
      }
      
      return {
        id: pt.id,
        attributes: attributes
      };
    });
    
    return res.json({ data: formattedTypes });
  } catch (error) {
    console.error('Error in GET /api/product-types:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get product type by slug - MUST come before :id route to prevent conflicts
app.get('/api/product-types/by-slug/:slug', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { slug } = req.params;
    
    const productType = db.prepare('SELECT * FROM product_types WHERE slug = ?').get(slug);
    
    if (!productType) {
      return res.status(404).json({ error: 'Product type not found', slug });
    }
    
    return res.json({
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
    console.error(`Error in GET /api/product-types/by-slug/${req.params.slug}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get product type by ID
app.get('/api/product-types/:id', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { id } = req.params;
    const productType = db.prepare('SELECT * FROM product_types WHERE id = ?').get(id);
    
    if (!productType) {
      return res.status(404).json({ error: 'Product type not found' });
    }
    
    return res.json({
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
    console.error(`Error in GET /api/product-types/${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new product type
app.post('/api/product-types', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
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
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { id } = req.params;
    const { name, description, slug } = req.body;
    
    console.log(`PUT /api/product-types/${id} - Request received with data:`, req.body);
    
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
    
    console.log(`Successfully updated product type ID ${id}`);
    
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
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { id } = req.params;
    
    // Check if product type exists
    const existingType = db.prepare('SELECT * FROM product_types WHERE id = ?').get(id);
    if (!existingType) {
      return res.status(404).json({ error: 'Product type not found' });
    }
    
    console.log(`DELETE /api/product-types/${id} - Deleting product type: ${existingType.name}`);
    
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
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const query = `
      SELECT ps.*, pt.name as product_type_name, pt.slug as product_type_slug 
      FROM product_series ps
      LEFT JOIN product_types pt ON ps.product_type_id = pt.id
    `;
    
    const series = db.prepare(query).all();
    
    // Format series for response
    const formattedSeries = series.map(s => ({
      id: s.id,
      attributes: {
        name: s.name,
        description: s.description,
        slug: s.slug,
        specifications: s.specifications ? JSON.parse(s.specifications) : {},
        product_type: s.product_type_id ? {
          data: {
            id: s.product_type_id,
            attributes: {
              name: s.product_type_name,
              slug: s.product_type_slug
            }
          }
        } : null,
        createdAt: s.created_at,
        updatedAt: s.updated_at
      }
    }));
    
    return res.json({ data: formattedSeries });
  } catch (error) {
    console.error('Error in GET /api/product-series:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get product series by ID or slug
app.get('/api/product-series/:id', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { id } = req.params;
    console.log(`GET /api/product-series/${id} - Request received`);
    
    // Try to parse id as a number if it's not
    const seriesId = isNaN(id) ? id : parseInt(id);
    
    // First check if this is actually a slug instead of an ID
    let productSeries;
    let isSlug = false;
    
    if (typeof seriesId === 'string' && isNaN(seriesId)) {
      console.log(`Treating "${seriesId}" as a slug`);
      isSlug = true;
      
      const query = `
        SELECT ps.*, pt.name as product_type_name, pt.slug as product_type_slug
        FROM product_series ps
        LEFT JOIN product_types pt ON ps.product_type_id = pt.id
        WHERE ps.slug = ?
      `;
      
      productSeries = db.prepare(query).get(seriesId);
    } else {
      console.log(`Looking up series with ID: ${seriesId}`);
      
      const query = `
        SELECT ps.*, pt.name as product_type_name, pt.slug as product_type_slug
        FROM product_series ps
        LEFT JOIN product_types pt ON ps.product_type_id = pt.id
        WHERE ps.id = ?
      `;
      
      productSeries = db.prepare(query).get(seriesId);
    }
    
    if (!productSeries) {
      console.log(`Series ${isSlug ? 'with slug' : 'with ID'} "${seriesId}" not found`);
      return res.status(404).json({ 
        error: 'Product series not found',
        requested: seriesId
      });
    }
    
    console.log(`Found series: ${productSeries.name}`);
    
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
    
    return res.json({
      data: {
        id: productSeries.id,
        attributes: {
          name: productSeries.name,
          description: productSeries.description,
          slug: productSeries.slug,
          specifications: productSeries.specifications ? JSON.parse(productSeries.specifications) : {},
          product_type: productSeries.product_type_id ? {
            data: {
              id: productSeries.product_type_id,
              attributes: {
                name: productSeries.product_type_name,
                slug: productSeries.product_type_slug
              }
            }
          } : null,
          createdAt: productSeries.created_at,
          updatedAt: productSeries.updated_at,
          products: {
            data: products.map(p => ({
              id: p.id,
              attributes: {
                name: p.name,
                description: p.description,
                slug: p.slug,
                wattage: p.wattage,
                lumen: p.lumen,
                cct: p.cct,
                beam_angle: p.beam_angle,
                dimming: p.dimming,
                is_featured: p.is_featured ? true : false,
                series_id: p.series_id,
                
                // CRITICAL: Include ALL database fields for complete data integrity
                product_code: p.product_code,
                dimensions: p.dimensions,
                cutout_size: p.cutout_size,
                mounting_type: p.mounting_type,
                trim_color: p.trim_color,
                reflector_finish: p.reflector_finish,
                orientation: p.orientation,
                lamp_source: p.lamp_source,
                system_lumen: p.system_lumen,
                cri: p.cri,
                ip_rating: p.ip_rating,
                lifetime: p.lifetime,
                driver_type: p.driver_type,
                power_factor: p.power_factor,
                input_voltage: p.input_voltage,
                warranty: p.warranty,
                colour: p.colour,
                material: p.material,
                efficacy: p.efficacy,
                optic: p.optic,
                operating_temperature: p.operating_temperature,
                datasheet: p.datasheet,
                
                // Include all image fields - this fixes the image path issue
                main_image_A: p.main_image_A,
                main_image_B: p.main_image_B,
                size_image: p.size_image,
                application_image: p.application_image,
                photometric_image: p.photometric_image,
                featured_image: p.featured_image,
                
                // Include series information within each product
                series: {
                  data: {
                    id: productSeries.id,
                    attributes: {
                      name: productSeries.name,
                      slug: productSeries.slug,
                      product_type: productSeries.product_type_id ? {
                        data: {
                          id: productSeries.product_type_id,
                          attributes: {
                            name: productSeries.product_type_name,
                            slug: productSeries.product_type_slug
                          }
                        }
                      } : null
                    }
                  }
                },
                
                createdAt: p.created_at,
                updatedAt: p.updated_at
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
      endpoint: `/api/product-series/${req.params.id}`
    });
  }
});

// Get product series by slug using query parameter
app.get('/api/product-series-by-slug', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { slug } = req.query;
    
    if (!slug) {
      return res.status(400).json({ error: 'Slug parameter is required' });
    }
    
    console.log(`GET /api/product-series-by-slug - Looking up series with slug: "${slug}"`);
    
    const query = `
      SELECT ps.*, pt.name as product_type_name, pt.slug as product_type_slug
      FROM product_series ps
      LEFT JOIN product_types pt ON ps.product_type_id = pt.id
      WHERE ps.slug = ?
    `;
    
    const productSeries = db.prepare(query).get(slug);
    
    if (!productSeries) {
      console.log(`Series with slug "${slug}" not found`);
      return res.status(404).json({ 
        error: 'Product series not found',
        requestedSlug: slug
      });
    }
    
    console.log(`Found series: ${productSeries.name}`);
    
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
    
    return res.json({
      data: {
        id: productSeries.id,
        attributes: {
          name: productSeries.name,
          description: productSeries.description,
          slug: productSeries.slug,
          specifications: productSeries.specifications ? JSON.parse(productSeries.specifications) : {},
          product_type: productSeries.product_type_id ? {
            data: {
              id: productSeries.product_type_id,
              attributes: {
                name: productSeries.product_type_name,
                slug: productSeries.product_type_slug
              }
            }
          } : null,
          createdAt: productSeries.created_at,
          updatedAt: productSeries.updated_at,
          products: {
            data: products.map(p => ({
              id: p.id,
              attributes: {
                name: p.name,
                description: p.description,
                slug: p.slug,
                wattage: p.wattage,
                lumen: p.lumen,
                cct: p.cct,
                beam_angle: p.beam_angle,
                dimming: p.dimming,
                is_featured: p.is_featured ? true : false,
                series_id: p.series_id,
                
                // CRITICAL: Include ALL database fields for complete data integrity
                product_code: p.product_code,
                dimensions: p.dimensions,
                cutout_size: p.cutout_size,
                mounting_type: p.mounting_type,
                trim_color: p.trim_color,
                reflector_finish: p.reflector_finish,
                orientation: p.orientation,
                lamp_source: p.lamp_source,
                system_lumen: p.system_lumen,
                cri: p.cri,
                ip_rating: p.ip_rating,
                lifetime: p.lifetime,
                driver_type: p.driver_type,
                power_factor: p.power_factor,
                input_voltage: p.input_voltage,
                warranty: p.warranty,
                colour: p.colour,
                material: p.material,
                efficacy: p.efficacy,
                optic: p.optic,
                operating_temperature: p.operating_temperature,
                datasheet: p.datasheet,
                
                // Include all image fields - this fixes the image path issue
                main_image_A: p.main_image_A,
                main_image_B: p.main_image_B,
                size_image: p.size_image,
                application_image: p.application_image,
                photometric_image: p.photometric_image,
                featured_image: p.featured_image,
                
                // Include series information within each product
                series: {
                  data: {
                    id: productSeries.id,
                    attributes: {
                      name: productSeries.name,
                      slug: productSeries.slug,
                      product_type: productSeries.product_type_id ? {
                        data: {
                          id: productSeries.product_type_id,
                          attributes: {
                            name: productSeries.product_type_name,
                            slug: productSeries.product_type_slug
                          }
                        }
                      } : null
                    }
                  }
                },
                
                createdAt: p.created_at,
                updatedAt: p.updated_at
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

// Add admin API endpoints
app.get('/admin/api/product-types', (req, res) => {
  // Route for admin interface product types
  console.log('Admin requested product types');
  
  if (!db) {
    return res.status(503).json({ error: 'Database not available' });
  }
  
  try {
    const productTypes = db.prepare('SELECT * FROM product_types').all();
    
    // Format product types for response
    const formattedTypes = productTypes.map(pt => ({
      id: pt.id,
      attributes: {
        name: pt.name,
        description: pt.description,
        slug: pt.slug,
        createdAt: pt.created_at,
        updatedAt: pt.updated_at
      }
    }));
    
    return res.json({ data: formattedTypes });
  } catch (error) {
    console.error('Error in GET /admin/api/product-types:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/admin/api/product-series', (req, res) => {
  // Route for admin interface product series
  console.log('Admin requested product series');
  
  if (!db) {
    return res.status(503).json({ error: 'Database not available' });
  }
  
  try {
    const query = `
      SELECT ps.*, pt.name as product_type_name, pt.slug as product_type_slug 
      FROM product_series ps
      LEFT JOIN product_types pt ON ps.product_type_id = pt.id
    `;
    
    const series = db.prepare(query).all();
    
    // Format series for response
    const formattedSeries = series.map(s => ({
      id: s.id,
      attributes: {
        name: s.name,
        description: s.description,
        slug: s.slug,
        specifications: s.specifications ? JSON.parse(s.specifications) : {},
        product_type: s.product_type_id ? {
          data: {
            id: s.product_type_id,
            attributes: {
              name: s.product_type_name,
              slug: s.product_type_slug
            }
          }
        } : null,
        createdAt: s.created_at,
        updatedAt: s.updated_at
      }
    }));
    
    return res.json({ data: formattedSeries });
  } catch (error) {
    console.error('Error in GET /admin/api/product-series:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/admin/api/products', (req, res) => {
  // Route for admin interface products
  console.log('Admin requested products');
  
  if (!db) {
    return res.status(503).json({ error: 'Database not available' });
  }
  
  try {
    // Simple query without condition
    const query = `
      SELECT p.*, ps.name as series_name, ps.slug as series_slug,
             pt.id as product_type_id, pt.name as product_type_name, pt.slug as product_type_slug
      FROM products p
      LEFT JOIN product_series ps ON p.series_id = ps.id
      LEFT JOIN product_types pt ON ps.product_type_id = pt.id
      WHERE 1=1
    `;
    
    const products = db.prepare(query).all();
    
    // Format products for response
    const formattedProducts = products.map(p => ({
      id: p.id,
      attributes: {
        name: p.name,
        description: p.description,
        slug: p.slug,
        wattage: p.wattage,
        lumen: p.lumen,
        cct: p.cct,
        beam_angle: p.beam_angle,
        dimming: p.dimming,
        is_featured: p.is_featured ? true : false,
        // Include image fields
        main_image_A: p.main_image_A,
        main_image_B: p.main_image_B,
        size_image: p.size_image,
        application_image: p.application_image,
        photometric_image: p.photometric_image,
        featured_image: p.featured_image,
        series: p.series_id ? {
          data: {
            id: p.series_id,
            attributes: {
              name: p.series_name,
              slug: p.series_slug,
              product_type: p.product_type_id ? {
                data: {
                  id: p.product_type_id,
                  attributes: {
                    name: p.product_type_name,
                    slug: p.product_type_slug
                  }
                }
              } : null
            }
          }
        } : null,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }
    }));
    
    return res.json({ data: formattedProducts });
  } catch (error) {
    console.error('Error in GET /admin/api/products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a product by ID or slug - Admin specific endpoint
app.get('/admin/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    console.log(`GET /admin/api/products/${id} - Admin request received`);
    
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    // Query with both numeric ID and string slug support
    const query = `
      SELECT p.*, ps.name as series_name, ps.slug as series_slug,
             pt.id as product_type_id, pt.name as product_type_name, pt.slug as product_type_slug,
             p.main_image_A, p.main_image_B, p.size_image, p.application_image, p.photometric_image
      FROM products p
      LEFT JOIN product_series ps ON p.series_id = ps.id
      LEFT JOIN product_types pt ON ps.product_type_id = pt.id
      WHERE p.id = ? OR p.slug = ?
    `;
    
    const product = db.prepare(query).get(id, id);
    
    if (!product) {
      console.log(`Admin API: Product not found with ID/slug: ${id}`);
      return res.status(404).json({ 
        error: 'Product not found',
        id: id
      });
    }
    
    console.log(`Admin API: Found product ${product.name}`);
    
    // Format product for response
    const formattedProduct = {
      id: product.id,
      attributes: {
        name: product.name,
        description: product.description,
        slug: product.slug,
        wattage: product.wattage,
        lumen: product.lumen,
        cct: product.cct,
        beam_angle: product.beam_angle,
        dimming: product.dimming,
        is_featured: product.is_featured ? true : false,
        series_id: product.series_id,
        
        // CRITICAL: Include ALL database fields for complete data integrity
        product_code: product.product_code,
        dimensions: product.dimensions,
        cutout_size: product.cutout_size,
        mounting_type: product.mounting_type,
        trim_color: product.trim_color,
        reflector_finish: product.reflector_finish,
        orientation: product.orientation,
        lamp_source: product.lamp_source,
        system_lumen: product.system_lumen,
        cri: product.cri,
        ip_rating: product.ip_rating,
        lifetime: product.lifetime,
        driver_type: product.driver_type,
        power_factor: product.power_factor,
        input_voltage: product.input_voltage,
        warranty: product.warranty,
        colour: product.colour,
        material: product.material,
        efficacy: product.efficacy,
        optic: product.optic,
        operating_temperature: product.operating_temperature,
        datasheet: product.datasheet,
        
        // Include all image fields
        main_image_A: product.main_image_A,
        main_image_B: product.main_image_B,
        size_image: product.size_image,
        application_image: product.application_image,
        photometric_image: product.photometric_image,
        featured_image: product.featured_image,
        
        series: product.series_id ? {
          data: {
            id: product.series_id,
            attributes: {
              name: product.series_name,
              slug: product.series_slug,
              product_type: product.product_type_id ? {
                data: {
                  id: product.product_type_id,
                  attributes: {
                    name: product.product_type_name,
                    slug: product.product_type_slug
                  }
                }
              } : null
            }
          }
        } : null,
        createdAt: product.created_at,
        updatedAt: product.updated_at
      }
    };
    
    return res.json({ data: formattedProduct });
  } catch (error) {
    console.error(`Error in GET /admin/api/products/${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Add upload endpoint to handle file uploads (array/multiple)
app.post('/api/upload', (req, res) => {
  console.log('Upload request received, processing...');
  console.log('Headers:', req.headers);
  
  // Use the upload middleware directly here
  upload.array('files')(req, res, function(err) {
    if (err) {
      console.error('Multer error during upload:', err);
      return res.status(500).json({ 
        error: err.message,
        details: 'Error occurred during file upload processing'
      });
    }
    
    try {
      console.log(`POST /api/upload - Files processed: ${req.files?.length || 0}`);
      console.log('Request body after multer:', JSON.stringify(req.body || {}, null, 2));
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }
      
      // Get requested folder from form data or productId + seriesSlug
      let targetFolder = '';
      const productId = parseInt(req.body.productId);
      const seriesSlug = req.body.seriesSlug;
      
      // Determine folder based on productId and seriesSlug
      if (seriesSlug) {
        targetFolder = seriesSlug;
      } else if (productId) {
        // Use product ID to determine folder as fallback
        if (productId === 1 || productId === 2) {
          targetFolder = 'eco-pro';
        } else if (productId >= 5 && productId <= 6) {
          targetFolder = 'slim-line';
        } else {
          targetFolder = 'general';
        }
      } else {
        targetFolder = req.body.folder || 'general';
      }
      
      console.log(`Using target folder: ${targetFolder}`);
      
      // Create target directory if it doesn't exist
      const fullUploadPath = path.join(UPLOADS_DIR, targetFolder);
      if (!fs.existsSync(fullUploadPath)) {
        console.log(`Creating directory: ${fullUploadPath}`);
        fs.mkdirSync(fullUploadPath, { recursive: true });
      }
      
      // Process uploaded files and return their information
      const uploadedFiles = req.files.map(file => {
        console.log(`Uploaded file: ${file.originalname} to ${file.path}`);
        
        // Rename file if productId and imageType are provided
        if (productId && req.body.imageType) {
          const originalExt = path.extname(file.filename);
          
          // Simplify image type: main_image_A -> main-A, application_image -> application, etc.
          let simplifiedType = req.body.imageType;
          if (req.body.imageType === 'main_image_A') {
            simplifiedType = 'main-A';
          } else if (req.body.imageType === 'main_image_B') {
            simplifiedType = 'main-B';
          } else if (req.body.imageType.includes('_')) {
            // For other types, just remove "_image" suffix if present
            simplifiedType = req.body.imageType.replace('_image', '');
          }
          
          const newFilename = `${productId}-${simplifiedType}${originalExt}`;
          const newPath = path.join(path.dirname(file.path), newFilename);
          
          try {
            // Only rename if the new filename is different
            if (path.basename(file.path) !== newFilename) {
              console.log(`Renaming ${file.path} to ${newPath}`);
              fs.renameSync(file.path, newPath);
              file.path = newPath;
              file.filename = newFilename;
            }
          } catch (renameErr) {
            console.error(`Error renaming file: ${renameErr.message}`);
          }
        }
        
        // Generate proper URL path for frontend
        const fileUrl = `/images/products/${targetFolder}/${file.filename}`;
        
        // Format response to match what frontend expects
        return {
          id: file.filename,
          name: file.filename,
          originalName: file.originalname,
          url: fileUrl,
          size: file.size,
          type: file.mimetype
        };
      });
      
      console.log(`Successfully uploaded ${uploadedFiles.length} files`);
      // Return array of uploaded files to match the format expected by frontend
      return res.json(uploadedFiles);
    } catch (error) {
      console.error('Error in POST /api/upload:', error);
      // Log more details about the error
      console.error('Error stack:', error.stack);
      console.error('Request body:', req.body);
      console.error('Request query:', req.query);
      console.error('Request params:', req.params);
      res.status(500).json({ error: error.message });
    }
  });
});

// Simple upload endpoint that doesn't require multer configuration (single file)
app.post('/api/simple-upload', (req, res) => {
  try {
    console.log('POST /api/simple-upload - Received request');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    
    // Process as form-data
    const upload = multer({
      storage: multer.diskStorage({
        destination: function(req, file, cb) {
          const productSlug = req.body.productSlug || '';
          const seriesSlug = req.body.seriesSlug || '';
          
          // Get the upload path based on product data - generic approach
          let targetDir = UPLOADS_DIR;
          
          // If we have series information, we can use it to organize files
          if (seriesSlug) {
            // Create a subfolder for this specific product series
            const seriesDir = path.join(UPLOADS_DIR, seriesSlug);
            
            // Ensure the directory exists
            if (!fs.existsSync(seriesDir)) {
              fs.mkdirSync(seriesDir, { recursive: true });
              console.log(`Created directory for series: ${seriesDir}`);
            }
            
            targetDir = seriesDir;
            console.log(`Using series subfolder for upload: ${targetDir}`);
          }
          
          console.log(`Storing file to: ${targetDir}`);
          cb(null, targetDir);
        },
        filename: function(req, file, cb) {
          // Try to get product ID and image type for better naming
          const productId = req.body.productId;
          const imageType = req.body.imageType;
          const fileExt = path.extname(file.originalname) || '.jpg';
          
          // If we have both product ID and image type, use a descriptive name
          if (productId && imageType) {
            // Simplify image type: main_image_A -> main-A, application_image -> application, etc.
            let simplifiedType = imageType;
            if (imageType === 'main_image_A') {
              simplifiedType = 'main-A';
            } else if (imageType === 'main_image_B') {
              simplifiedType = 'main-B';
            } else if (imageType.includes('_')) {
              // For other types, just remove "_image" suffix if present
              simplifiedType = imageType.replace('_image', '');
            }
            
            const fileName = `${productId}-${simplifiedType}${fileExt}`;
            console.log(`Generated descriptive filename: ${fileName} for product ${productId}`);
            cb(null, fileName);
          } else {
            // Fallback to a timestamped name
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const originalNameWithoutExt = path.basename(file.originalname, fileExt);
            const safeOriginalName = originalNameWithoutExt.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
            
            const fileName = `${uniqueSuffix}-${safeOriginalName}${fileExt}`;
            console.log(`Generated fallback filename: ${fileName}`);
            cb(null, fileName);
          }
        }
      })
    }).single('file');
    
    upload(req, res, function(err) {
      if (err) {
        console.error('Upload error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const fileUrl = `/uploads/${req.file.filename}`;
      console.log(`File uploaded successfully: ${req.file.filename}`);
      
      return res.json({
        id: req.file.filename,
        name: req.file.originalname,
        url: fileUrl
      });
    });
  } catch (error) {
    console.error('Error in POST /api/simple-upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a product by ID - endpoint for admin product updates
app.put('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const productData = req.body.data;
    
    console.log(`PUT /api/products/${id} - Updating product`);
    console.log('Received product data:', JSON.stringify(productData, null, 2));
    
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    // Check if product exists
    const existingProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found', id });
    }
    
    // Get table columns to ensure we only update existing columns
    const tableInfo = db.prepare('PRAGMA table_info(products)').all();
    const columns = tableInfo.map(col => col.name);
    console.log('Available columns in products table:', columns.join(', '));
    
    // Base update data - empty initially
    const updateData = {};
    
    // Add updated_at only if it exists in the schema
    if (columns.includes('updated_at')) {
      updateData.updated_at = new Date().toISOString();
    }
    
    // Only include fields that exist in the database table
    // For fields with NOT NULL constraint like name, ensure we never send NULL
    if (columns.includes('name')) {
      updateData.name = productData.name || existingProduct.name || 'Unnamed Product';
      // Validate name is not empty - use existing name if empty
      if (!updateData.name || updateData.name.trim() === '') {
        updateData.name = existingProduct.name || 'Unnamed Product';
      }
    }
    
    if (columns.includes('description')) updateData.description = productData.description || '';
    if (columns.includes('slug')) {
      updateData.slug = productData.slug || existingProduct.slug || 'unnamed-product';
      // Validate slug is not empty - use existing slug if empty
      if (!updateData.slug || updateData.slug.trim() === '') {
        updateData.slug = existingProduct.slug || 'unnamed-product';
      }
    }
    
    // Handle series_id for NOT NULL constraint
    if (columns.includes('series_id')) {
      // Use series_id from request, fallback to existing value, or find default
      if (productData.series_id) {
        updateData.series_id = productData.series_id;
      } else if (existingProduct.series_id) {
        // Keep existing value
        updateData.series_id = existingProduct.series_id;
      } else {
        // Need to find a default series - look up first available series
        try {
          const defaultSeries = db.prepare('SELECT id FROM product_series LIMIT 1').get();
          if (defaultSeries) {
            updateData.series_id = defaultSeries.id;
            console.log(`No series_id provided, using default series ID: ${defaultSeries.id}`);
          } else {
            // No series exists - create one
            console.log('No product series found. Creating a default series...');
            const insertSeriesStmt = db.prepare(`
              INSERT INTO product_series (name, slug, created_at, updated_at) 
              VALUES (?, ?, ?, ?)
            `);
            const now = new Date().toISOString();
            const result = insertSeriesStmt.run('Default Series', 'default-series', now, now);
            updateData.series_id = result.lastInsertRowid;
            console.log(`Created default series with ID ${updateData.series_id}`);
          }
        } catch (seriesErr) {
          console.error('Error handling series_id:', seriesErr);
          // As a last resort, use 1 which often exists in fresh databases
          updateData.series_id = 1;
        }
      }
    }
    
    if (columns.includes('wattage')) updateData.wattage = productData.wattage || 0;
    if (columns.includes('lumen')) updateData.lumen = productData.lumen || 0;
    if (columns.includes('cct')) updateData.cct = productData.cct || '';
    if (columns.includes('beam_angle')) updateData.beam_angle = productData.beam_angle || '';
    if (columns.includes('dimming')) updateData.dimming = productData.dimming || '';
    if (columns.includes('is_featured')) updateData.is_featured = productData.is_featured ? 1 : 0;
    if (columns.includes('specifications')) updateData.specifications = JSON.stringify(productData.specifications || {});
    if (columns.includes('main_image_A')) updateData.main_image_A = productData.main_image_A || null;
    if (columns.includes('main_image_B')) updateData.main_image_B = productData.main_image_B || null;
    if (columns.includes('size_image')) updateData.size_image = productData.size_image || null;
    if (columns.includes('application_image')) updateData.application_image = productData.application_image || null;
    if (columns.includes('photometric_image')) updateData.photometric_image = productData.photometric_image || null;
    
    console.log('Fields being updated:', Object.keys(updateData).join(', '));
    console.log('Update data:', updateData);
    
    // Only proceed if we have fields to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    // Build the SQL update statement
    const updateFields = Object.keys(updateData)
      .map(key => `${key} = @${key}`)
      .join(', ');
    
    const updateQuery = `UPDATE products SET ${updateFields} WHERE id = @id`;
    
    // Execute the update
    const updateResult = db.prepare(updateQuery).run({
      ...updateData,
      id: id
    });
    
    console.log(`Product updated, changes: ${updateResult.changes}`);
    
    // Get the updated product to return
    const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    
    // Format response based on available columns
    const response = {
      data: {
        id: updatedProduct.id,
        attributes: {}
      }
    };
    
    // Add available fields to response
    if (columns.includes('name')) response.data.attributes.name = updatedProduct.name;
    if (columns.includes('description')) response.data.attributes.description = updatedProduct.description;
    if (columns.includes('slug')) response.data.attributes.slug = updatedProduct.slug;
    if (columns.includes('wattage')) response.data.attributes.wattage = updatedProduct.wattage;
    if (columns.includes('lumen')) response.data.attributes.lumen = updatedProduct.lumen;
    if (columns.includes('cct')) response.data.attributes.cct = updatedProduct.cct;
    if (columns.includes('beam_angle')) response.data.attributes.beam_angle = updatedProduct.beam_angle;
    if (columns.includes('dimming')) response.data.attributes.dimming = updatedProduct.dimming;
    if (columns.includes('is_featured')) response.data.attributes.is_featured = updatedProduct.is_featured ? true : false;
    if (columns.includes('series_id')) response.data.attributes.series_id = updatedProduct.series_id;
    if (columns.includes('specifications') && updatedProduct.specifications) {
      try {
        response.data.attributes.specifications = JSON.parse(updatedProduct.specifications);
      } catch (e) {
        response.data.attributes.specifications = {};
      }
    }
    if (columns.includes('created_at')) response.data.attributes.createdAt = updatedProduct.created_at;
    if (columns.includes('updated_at')) response.data.attributes.updatedAt = updatedProduct.updated_at;
    
    return res.json(response);
  } catch (error) {
    console.error(`Error in PUT /api/products/${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get product by slug (simplified endpoint for direct slug access)
app.get('/api/products/by-slug/:slug', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { slug } = req.params;
    console.log(`GET /api/products/by-slug/${slug} - Looking up product with slug: "${slug}"`);
    
    // Query product by slug and join with series and product type to get the full path information
    const query = `
      SELECT p.*, ps.name as series_name, ps.slug as series_slug,
             pt.id as product_type_id, pt.name as product_type_name, pt.slug as product_type_slug
      FROM products p
      LEFT JOIN product_series ps ON p.series_id = ps.id
      LEFT JOIN product_types pt ON ps.product_type_id = pt.id
      WHERE p.slug = ?
    `;
    
    const product = db.prepare(query).get(slug);
    
    if (!product) {
      console.log(`Product with slug "${slug}" not found`);
      return res.status(404).json({ 
        error: 'Product not found',
        slug: slug
      });
    }
    
    console.log(`Found product: ${product.name} in series: ${product.series_name}, type: ${product.product_type_name}`);
    
    // Format product for response with all path information
    const formattedProduct = {
      id: product.id,
      attributes: {
        name: product.name,
        description: product.description,
        slug: product.slug,
        wattage: product.wattage,
        lumen: product.lumen,
        cct: product.cct,
        beam_angle: product.beam_angle,
        dimming: product.dimming,
        is_featured: product.is_featured ? true : false,
        product_code: product.product_code,
        dimensions: product.dimensions,
        cutout_size: product.cutout_size,
        mounting_type: product.mounting_type,
        trim_color: product.trim_color,
        reflector_finish: product.reflector_finish,
        orientation: product.orientation,
        lamp_source: product.lamp_source,
        system_lumen: product.system_lumen,
        lifetime: product.lifetime,
        driver_type: product.driver_type,
        power_factor: product.power_factor,
        input_voltage: product.input_voltage,
        datasheet: product.datasheet,
        // Unified columns
        warranty: product.warranty,
        installation_type: product.installation_type,
        colour: product.colour,
        material: product.material,
        cri: product.cri,
        ip_rating: product.ip_rating,
        // Include full path information
        path: {
          type_slug: product.product_type_slug,
          series_slug: product.series_slug
        },
        series: product.series_id ? {
          data: {
            id: product.series_id,
            attributes: {
              name: product.series_name,
              slug: product.series_slug,
              product_type: product.product_type_id ? {
                data: {
                  id: product.product_type_id,
                  attributes: {
                    name: product.product_type_name,
                    slug: product.product_type_slug
                  }
                }
              } : null
            }
          }
        } : null,
        createdAt: product.created_at,
        updatedAt: product.updated_at
      }
    };
    
    return res.json({ data: formattedProduct });
  } catch (error) {
    console.error(`Error in GET /api/products/by-slug/${req.params.slug}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new product - endpoint to support adding products and duplication
app.post('/api/products', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const productData = req.body.data;
    console.log('Creating new product:', productData);
    
    if (!productData || !productData.name || !productData.slug) {
      return res.status(400).json({ error: 'Missing required fields (name, slug)' });
    }
    
    // Ensure slug is unique
    const existingProduct = db.prepare('SELECT * FROM products WHERE slug = ?').get(productData.slug);
    if (existingProduct) {
      return res.status(400).json({ error: 'Product slug already exists' });
    }
    
    // Get table columns to ensure we only insert valid fields
    const tableInfo = db.prepare('PRAGMA table_info(products)').all();
    const columns = tableInfo.map(col => col.name);
    console.log('Available columns in products table:', columns.join(', '));
    
    // Build valid data object based on columns
    const validData = {};
    
    // Add fields that exist in the database table
    if (columns.includes('name')) validData.name = productData.name;
    if (columns.includes('description')) validData.description = productData.description || '';
    if (columns.includes('slug')) validData.slug = productData.slug;
    if (columns.includes('wattage')) validData.wattage = productData.wattage || 0;
    if (columns.includes('lumen')) validData.lumen = productData.lumen || 0;
    if (columns.includes('cct')) validData.cct = productData.cct || '';
    if (columns.includes('beam_angle')) validData.beam_angle = productData.beam_angle || '';
    if (columns.includes('dimming')) validData.dimming = productData.dimming || '';
    if (columns.includes('is_featured')) validData.is_featured = productData.is_featured ? 1 : 0;
    if (columns.includes('series_id')) validData.series_id = productData.series_id || null;
    if (columns.includes('specifications')) validData.specifications = JSON.stringify(productData.specifications || {});
    if (columns.includes('created_at')) validData.created_at = new Date().toISOString();
    if (columns.includes('updated_at')) validData.updated_at = new Date().toISOString();
    
    // Build the SQL insert statement
    const columnNames = Object.keys(validData).join(', ');
    const placeholders = Object.keys(validData).map(() => '?').join(', ');
    const values = Object.values(validData);
    
    const insertQuery = `INSERT INTO products (${columnNames}) VALUES (${placeholders})`;
    console.log('Insert query:', insertQuery);
    
    // Execute the insert
    const insertResult = db.prepare(insertQuery).run(...values);
    
    console.log(`Product created with ID: ${insertResult.lastInsertRowid}`);
    
    // Get the newly created product to return
    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(insertResult.lastInsertRowid);
    
    // Format the response
    const formattedProduct = {
      data: {
        id: newProduct.id,
        attributes: {
          name: newProduct.name,
          description: newProduct.description,
          slug: newProduct.slug,
          wattage: newProduct.wattage,
          lumen: newProduct.lumen,
          cct: newProduct.cct,
          beam_angle: newProduct.beam_angle,
          dimming: newProduct.dimming,
          is_featured: newProduct.is_featured ? true : false,
          series_id: newProduct.series_id,
          specifications: newProduct.specifications ? JSON.parse(newProduct.specifications) : {},
          createdAt: newProduct.created_at,
          updatedAt: newProduct.updated_at,
        }
      }
    };
    
    return res.status(201).json(formattedProduct);
  } catch (error) {
    console.error('Error in POST /api/products:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get product-series mappings for image display
app.get('/api/product-series-mapping', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    console.log('GET /api/product-series-mapping - Request received');
    
    const query = `
      SELECT p.id as product_id, ps.slug as series_slug
      FROM products p
      LEFT JOIN product_series ps ON p.series_id = ps.id
    `;
    
    const mappings = db.prepare(query).all();
    console.log(`Found ${mappings.length} product-series mappings`);
    
    // Convert to an object mapping productId -> seriesSlug
    const mappingObject = {};
    mappings.forEach(mapping => {
      if (mapping.product_id && mapping.series_slug) {
        mappingObject[mapping.product_id] = mapping.series_slug;
      }
    });
    
    return res.json({ data: mappingObject });
  } catch (error) {
    console.error('Error in GET /api/product-series-mapping:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add file checking endpoint to check if images exist
app.get('/api/check-files', (req, res) => {
  try {
    const { path: requestedPath } = req.query;
    
    if (!requestedPath) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }
    
    console.log(`GET /api/check-files - Checking path: ${requestedPath}`);
    
    // Special handling for flex-beam products
    if (requestedPath.includes('flex-beam')) {
      console.log('Detected request for flex-beam products, using special handling');
      
      // Check if we're looking for the flex-beam-22w variant
      if (requestedPath.includes('flex-beam-22w')) {
        // Return the image we have in the flex-beam-22w directory
        return res.json([
          '/images/products/flex-beam-22w/flex-beam-22w-main.jpg'
        ]);
      }
      
      // For other flex-beam requests, return the default flex-beam image
      return res.json([
        '/images/products/flex-beam/10-main_image_a.jpg'
      ]);
    }
    
    // Clean the path to prevent directory traversal
    const sanitizedPath = requestedPath.replace(/\.\./g, '').replace(/\/+/g, '/');
    
    // Build the full path relative to the frontend public directory
    const fullPath = path.join(FRONTEND_PATH, 'public', sanitizedPath);
    console.log(`Checking existence of directory/files at: ${fullPath}`);
    
    // Check if the path exists
    if (!fs.existsSync(fullPath)) {
      console.log(`Path does not exist: ${fullPath}`);
      
      // Check if this is a case-sensitive filename issue, especially for main_image_b
      // This happens when the frontend is looking for main_image_B but the file is stored as main_image_b
      if (sanitizedPath.toLowerCase().includes('main_image_b') || sanitizedPath.toLowerCase().includes('main-b')) {
        console.log('Checking for case-insensitive variations of main image B');
        
        // Try to find variations with different capitalization
        const dirPath = path.dirname(fullPath);
        if (fs.existsSync(dirPath)) {
          try {
            const files = fs.readdirSync(dirPath);
            const matchingFiles = files.filter(file => 
              file.toLowerCase().includes('main_image_b') || 
              file.toLowerCase().includes('main-b') ||
              file.toLowerCase().includes('main_b')
            );
            
            if (matchingFiles.length > 0) {
              console.log(`Found case-insensitive matches for main image B: ${matchingFiles.join(', ')}`);
              return res.json(matchingFiles.map(file => `${sanitizedPath.replace(/\/[^\/]+$/, '')}/${file}`));
            }
          } catch (err) {
            console.error(`Error checking directory for case-insensitive matches: ${err.message}`);
          }
        }
      }
      
      return res.json({ exists: false, files: [] });
    }
    
    // Check if it's a directory
    const isDirectory = fs.statSync(fullPath).isDirectory();
    
    if (isDirectory) {
      // List files in the directory
      const files = fs.readdirSync(fullPath)
        .filter(file => !file.startsWith('.')) // Filter out hidden files
        .map(file => {
          const filePath = path.join(fullPath, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: path.join(sanitizedPath, file),
            type: stats.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime
          };
        });
      
      console.log(`Found ${files.length} files/directories in ${fullPath}`);
      return res.json({ exists: true, isDirectory: true, files });
    } else {
      // Return file info
      const stats = fs.statSync(fullPath);
      console.log(`File exists: ${fullPath}`);
      return res.json({
        exists: true,
        isDirectory: false,
        file: {
          name: path.basename(fullPath),
          path: sanitizedPath,
          type: 'file',
          size: stats.size,
          modified: stats.mtime
        }
      });
    }
  } catch (error) {
    console.error('Error in GET /api/check-files:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a file existence check endpoint
app.head('/api/check-files', (req, res) => {
  try {
    const { path: requestedPath } = req.query;
    
    if (!requestedPath) {
      return res.status(400).end();
    }
    
    // Special handling for flex-beam products
    if (requestedPath.includes('flex-beam')) {
      console.log('HEAD request for flex-beam products, returning 200 OK');
      // Always return OK for flex-beam paths since we handle them specially
      return res.status(200).end();
    }
    
    // Clean the path to prevent directory traversal
    const sanitizedPath = requestedPath.replace(/\.\./g, '').replace(/\/+/g, '/');
    
    // Build the full path relative to the frontend public directory
    const fullPath = path.join(FRONTEND_PATH, 'public', sanitizedPath);
    
    // Check if the path exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).end();
    }
    
    // Return 200 OK if the file exists
    return res.status(200).end();
  } catch (error) {
    console.error('Error in HEAD /api/check-files:', error);
    res.status(500).end();
  }
});

// Add project API routes
// Get all projects
app.get('/api/projects', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    console.log('GET /api/projects - Fetching all projects');
    
    // Simple query to get all projects
    const query = `
      SELECT * FROM projects
    `;
    
    const projects = db.prepare(query).all();
    console.log(`Found ${projects.length} projects`);
    
    // Format projects for response
    const formattedProjects = projects.map(p => ({
      id: p.id,
      attributes: {
        name: p.title, // Use title as name
        title: p.title, // Also include the original title
        subtitle: p.subtitle,
        location: p.location,
        category: p.category,
        year: p.year,
        description: p.description,
        thumbnail: p.thumbnail || null,
        slug: p.slug,
        featured: p.featured ? true : false,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }
    }));
    
    return res.json({ data: formattedProjects });
  } catch (error) {
    console.error('Error in GET /api/projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Project image upload endpoint
app.post('/api/project-upload', (req, res) => {
  try {
    console.log('POST /api/project-upload - Processing request');
    
    // Configure multer for project images
    const projectUpload = multer({
      storage: multer.diskStorage({
        destination: function(req, file, cb) {
          // Get project slug from the request
          const projectSlug = req.body.projectSlug;
          console.log(`Project upload - projectSlug: ${projectSlug}`);
          
          if (!projectSlug) {
            return cb(new Error('Missing projectSlug parameter'), null);
          }
          
          // Create target directory in frontend public images
          const targetDir = path.join(FRONTEND_PATH, 'public', 'images', 'projects', projectSlug);
          
          // Ensure directory exists
          if (!fs.existsSync(targetDir)) {
            console.log(`Creating project image directory: ${targetDir}`);
            fs.mkdirSync(targetDir, { recursive: true });
          }
          
          console.log(`Storing project image to: ${targetDir}`);
          cb(null, targetDir);
        },
        filename: function(req, file, cb) {
          // Get metadata from request
          const projectSlug = req.body.projectSlug;
          const imageType = req.body.imageType || 'image';
          
          // Generate filename
          const fileExt = path.extname(file.originalname) || '.jpg';
          const timestamp = Date.now();
          
          let fileName;
          if (imageType === 'thumbnail') {
            // Use standard name for thumbnail
            fileName = `${projectSlug}-thumbnail${fileExt}`;
          } else {
            // Use timestamp for uniqueness
            fileName = `${projectSlug}-${imageType}-${timestamp}${fileExt}`;
          }
          
          console.log(`Generated project image filename: ${fileName}`);
          cb(null, fileName);
        }
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: function(req, file, cb) {
        // Accept only images
        if (!file.mimetype.startsWith('image/')) {
          return cb(new Error('Only image files are allowed'));
        }
        cb(null, true);
      }
    }).single('file');
    
    // Process the upload
    projectUpload(req, res, function(err) {
      if (err) {
        console.error('Project upload error:', err);
        return res.status(500).json({ 
          error: err.message,
          details: 'Error occurred during project image upload processing'
        });
      }
      
      try {
        console.log('Project image upload - file processed');
        
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const projectSlug = req.body.projectSlug;
        
        // Generate proper URL path for frontend
        const fileUrl = `/images/projects/${projectSlug}/${req.file.filename}`;
        
        // Format response for frontend
        return res.json({
          success: true,
          fileName: req.file.filename,
          filePath: fileUrl,
          name: req.file.filename,
          url: fileUrl
        });
      } catch (innerError) {
        console.error('Error processing project upload:', innerError);
        return res.status(500).json({ error: innerError.message });
      }
    });
  } catch (outerError) {
    console.error('Outer error in project upload endpoint:', outerError);
    res.status(500).json({ error: outerError.message });
  }
});

// Get project by slug
app.get('/api/projects/slug/:slug', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { slug } = req.params;
    console.log(`GET /api/projects/slug/${slug} - Looking up project`);
    
    // First do a basic check if the project exists
    const projectCheck = db.prepare('SELECT * FROM projects WHERE slug = ?').get(slug);
    
    if (!projectCheck) {
      console.log(`No project found with slug: ${slug}`);
      
      // Log all available projects for debugging
      const allProjects = db.prepare('SELECT id, name, slug FROM projects').all();
      console.log('Available projects:', allProjects.map(p => `${p.id}: ${p.name} (${p.slug})`));
      
      return res.status(404).json({
        success: false,
        error: `Project not found with slug "${slug}"`,
        availableProjects: allProjects.map(p => p.slug)
      });
    }
    
    console.log(`Found project: ${projectCheck.name} (ID: ${projectCheck.id})`);
    
    // Now get the project with all its related data
    // Get project sections
    const sections = db.prepare(`
      SELECT * FROM project_sections 
      WHERE project_id = ? 
      ORDER BY \`order\` ASC
    `).all(projectCheck.id);
    
    console.log(`Found ${sections.length} sections for project`);
    
    // Get section images for each section
    const formattedSections = sections.map(section => {
      const images = db.prepare(`
        SELECT * FROM project_section_images 
        WHERE section_id = ?
        ORDER BY \`order\` ASC
      `).all(section.id);
      
      return {
        ...section,
        images: images
      };
    });
    
    // Get project products
    const products = db.prepare(`
      SELECT * FROM project_products
      WHERE project_id = ?
      ORDER BY \`order\` ASC
    `).all(projectCheck.id);
    
    console.log(`Found ${products.length} products for project`);
    
    // Get project paragraphs
    const paragraphs = db.prepare(`
      SELECT * FROM project_paragraphs
      WHERE project_id = ?
      ORDER BY \`order\` ASC
    `).all(projectCheck.id);
    
    console.log(`Found ${paragraphs.length} paragraphs for project`);
    
    // Format final response
    const project = {
      id: projectCheck.id,
      attributes: {
        name: projectCheck.title, // Use title as name
        title: projectCheck.title, // Also include original title
        subtitle: projectCheck.subtitle,
        location: projectCheck.location,
        category: projectCheck.category,
        year: projectCheck.year,
        description: projectCheck.description,
        slug: projectCheck.slug,
        featured: projectCheck.featured ? true : false,
        sections: formattedSections,
        products: products,
        paragraphs: paragraphs,
        createdAt: projectCheck.created_at,
        updatedAt: projectCheck.updated_at
      }
    };
    
    return res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Error fetching project by slug:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Available API endpoints:');
  console.log('  GET    /api/products');
  console.log('  GET    /api/products/featured');
  console.log('  GET    /api/products/:id');
  console.log('  POST   /api/products');
  console.log('  PUT    /api/products/:id');
  console.log('  GET    /api/product-types');
  console.log('  GET    /api/product-types/by-slug/:slug');
  console.log('  GET    /api/product-types/:id');
  console.log('  POST   /api/product-types');
  console.log('  PUT    /api/product-types/:id');
  console.log('  DELETE /api/product-types/:id');
  console.log('  GET    /api/product-series');
  console.log('  GET    /api/product-series/:id');
});

// Add catch-all handler for undefined routes
app.use((req, res, next) => {
  console.log(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'Route not found',
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Add error handler for unexpected errors
app.use((err, req, res, next) => {
  console.error('Express error handler caught an error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
}); 