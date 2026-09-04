import { Router } from 'express';
import {
  getAllProjects,
  getFeaturedProjects,
  getProjectById,
  getProjectBySlug,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController';

const router = Router();

// Get all projects
router.get('/', getAllProjects);
router.get('/featured', getFeaturedProjects);

// Get a project by ID
router.get('/id/:id', getProjectById);

// Get a project by slug
router.get('/slug/:slug', getProjectBySlug);

// Create a new project
router.post('/', createProject);

// Update a project
router.put('/:id', updateProject);

// Delete a project
router.delete('/:id', deleteProject);

export default router; 