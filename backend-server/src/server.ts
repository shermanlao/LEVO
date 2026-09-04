import './models';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import projectRoutes from './routes/projectRoutes';
import productRoutes from './routes/productRoutes';
import productTypeRoutes from './routes/productTypeRoutes';
import productSeriesRoutes from './routes/productSeriesRoutes';
import uploadRoutes from './routes/uploadRoutes';
import externalCatalogRoutes from './routes/externalCatalogRoutes';
import helpTipRoutes from './routes/helpTipRoutes';
import productMediaRoutes from './routes/productMediaRoutes';
import contactRoutes from './routes/contactRoutes';
import contactInquiryRoutes from './routes/contactInquiryRoutes';
import datasheetRoutes from './routes/datasheetRoutes';
import variantOptionRoutes from './routes/variantOptionRoutes';
import seriesFileRoutes from './routes/seriesFileRoutes';
import labelRoutes from './routes/labelRoutes';
import photometricLibraryRoutes from './routes/photometricLibraryRoutes';
import aiRoutes from './routes/aiRoutes';
import siteSettingsRoutes from './routes/siteSettingsRoutes';
import adminUserRoutes, { authRoutes } from './routes/adminUserRoutes';
import dashboardRoutes, { visitorRoutes } from './routes/dashboardRoutes';
import { rateLimit } from './lib/rateLimit';

const app = express();
const PORT = Number(process.env.PORT || 3333);
const SITE_ORIGIN = process.env.SITE_ORIGIN || 'http://localhost:3000';

app.use(compression());
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: [SITE_ORIGIN, 'http://127.0.0.1:3000', 'http://localhost:3000'],
    credentials: true,
  })
);

app.use('/api/ai', express.json({ limit: '20mb' }), express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use(
  '/uploads/photometric-library',
  express.static(path.join(__dirname, '..', '..', 'frontend', 'public', 'uploads', 'photometric-library'))
);
app.use(
  '/uploads/product-ldt',
  express.static(path.join(__dirname, '..', '..', 'frontend', 'public', 'uploads', 'product-ldt'))
);
app.use('/images/products', express.static(path.join(__dirname, '..', '..', 'frontend', 'public', 'images', 'products')));
app.use('/images/ai', express.static(path.join(__dirname, '..', '..', 'frontend', 'public', 'images', 'ai')));
app.use('/images/site', express.static(path.join(__dirname, '..', '..', 'frontend', 'public', 'images', 'site')));
app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'frontend', 'public', 'images', 'products')));

app.use('/api/projects', projectRoutes);
app.use('/api/products', productRoutes);
app.use('/api/product-types', productTypeRoutes);
app.use('/api/product-series', productSeriesRoutes);
app.use('/api/upload', rateLimit({ windowMs: 60 * 60 * 1000, max: 40, name: 'upload' }), uploadRoutes);
app.use('/api/product-media', productMediaRoutes);
app.use('/api/external-catalog', externalCatalogRoutes);
app.use('/api/help-tips', helpTipRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/site-settings', siteSettingsRoutes);
app.use('/api/contact-inquiries', contactInquiryRoutes);
app.use('/api/datasheets', datasheetRoutes);
app.use('/api/variant-options', variantOptionRoutes);
app.use('/api/series', seriesFileRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/photometric-library', photometricLibraryRoutes);
app.use(
  '/api/ai',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 20, name: 'ai' }),
  aiRoutes
);
app.use('/api/auth', authRoutes);
app.use('/api/admin-users', adminUserRoutes);
app.use('/api/visitor-events', visitorRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to the LEVO API',
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server is running on 127.0.0.1:${PORT}`);
});

export default app;


