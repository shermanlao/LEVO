import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Project, ProjectSection, ProjectSectionImage, ProjectProduct, ProjectParagraph } from '../models';
import { asyncHandler } from '../lib/asyncHandler';
import { clientError } from '../lib/errors';
import { setPublicListCache } from '../lib/publicCache';

const PROJECT_INCLUDE = [
  {
    model: ProjectSection,
    as: 'sections',
    include: [
      {
        model: ProjectSectionImage,
        as: 'images',
        order: [['order', 'ASC']],
      },
    ],
    order: [['order', 'ASC']],
  },
  {
    model: ProjectProduct,
    as: 'products',
    order: [['order', 'ASC']],
  },
  {
    model: ProjectParagraph,
    as: 'paragraphs',
    order: [['order', 'ASC']],
  },
] as any;

function fail(res: Response, status: number, error: string) {
  return res.status(status).json({ success: false, error });
}

async function replaceProjectRelations(
  projectId: number,
  nested: {
    sections?: Array<{ images?: unknown[]; [key: string]: unknown }>;
    products?: Array<Record<string, unknown>>;
    paragraphs?: Array<Record<string, unknown>>;
  },
  opts?: { replaceExisting?: boolean }
) {
  const replaceExisting = opts?.replaceExisting === true;

  if (nested.sections && Array.isArray(nested.sections)) {
    if (replaceExisting) {
      await ProjectSection.destroy({ where: { project_id: projectId } });
    }
    for (let i = 0; i < nested.sections.length; i++) {
      const { images, ...sectionDetails } = nested.sections[i];
      sectionDetails.project_id = projectId;
      sectionDetails.order = i + 1;
      const section = await ProjectSection.create(sectionDetails as any);
      if (images && Array.isArray(images)) {
        for (let j = 0; j < images.length; j++) {
          await ProjectSectionImage.create({
            section_id: section.id,
            image_path: String(images[j] ?? ''),
            order: j + 1,
          });
        }
      }
    }
  }

  if (nested.products && Array.isArray(nested.products)) {
    if (replaceExisting) {
      await ProjectProduct.destroy({ where: { project_id: projectId } });
    }
    for (let i = 0; i < nested.products.length; i++) {
      const productDetails = nested.products[i];
      productDetails.project_id = projectId;
      productDetails.order = i + 1;
      await ProjectProduct.create(productDetails as any);
    }
  }

  if (nested.paragraphs && Array.isArray(nested.paragraphs)) {
    if (replaceExisting) {
      await ProjectParagraph.destroy({ where: { project_id: projectId } });
    }
    for (let i = 0; i < nested.paragraphs.length; i++) {
      const paragraphDetails = nested.paragraphs[i];
      paragraphDetails.project_id = projectId;
      paragraphDetails.order = i + 1;
      await ProjectParagraph.create(paragraphDetails as any);
    }
  }
}

export const getFeaturedProjects = asyncHandler(async (_req: Request, res: Response) => {
  try {
    const projects = await Project.findAll({
      where: { is_featured: true },
      order: [['created_at', 'DESC']],
    });
    setPublicListCache(res);
    return res.status(200).json({ success: true, data: projects });
  } catch (error) {
    console.error('Error fetching featured projects:', error);
    return fail(res, 500, 'Server error');
  }
});

export const getAllProjects = asyncHandler(async (req: Request, res: Response) => {
  try {
    const exclude = String(req.query.exclude || '').trim();
    const limit = Math.min(Number(req.query.limit) || 0, 24);
    const where = exclude ? { slug: { [Op.ne]: exclude } } : undefined;
    const projects = await Project.findAll({
      where,
      order: [['created_at', 'DESC']],
      ...(limit > 0 ? { limit } : {}),
    });
    setPublicListCache(res);
    return res.status(200).json({ success: true, data: projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return fail(res, 500, 'Server error');
  }
});

export const getProjectBySlug = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const project = await Project.findOne({ where: { slug }, include: PROJECT_INCLUDE });
    if (!project) {
      return fail(res, 404, `Project not found with slug "${slug}"`);
    }
    return res.status(200).json({ success: true, data: project });
  } catch (error) {
    console.error('Error fetching project by slug:', error);
    return fail(res, 500, clientError(error));
  }
});

export const getProjectById = asyncHandler(async (req: Request, res: Response) => {
  try {
    const project = await Project.findByPk(req.params.id, { include: PROJECT_INCLUDE });
    if (!project) return fail(res, 404, 'Project not found');
    return res.status(200).json({ success: true, data: project });
  } catch (error) {
    console.error('Error fetching project by id:', error);
    return fail(res, 500, 'Server error');
  }
});

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { sections, products, paragraphs, ...projectDetails } = req.body || {};
    const project = await Project.create(projectDetails);
    await replaceProjectRelations(Number(project.id), { sections, products, paragraphs });
    const createdProject = await Project.findByPk(project.id, { include: PROJECT_INCLUDE });
    return res.status(201).json({ success: true, data: createdProject });
  } catch (error) {
    console.error('Error creating project:', error);
    return fail(res, 500, 'Server error');
  }
});

export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existingProject = await Project.findByPk(id);
    if (!existingProject) return fail(res, 404, 'Project not found');
    const { sections, products, paragraphs, ...projectDetails } = req.body || {};
    await existingProject.update(projectDetails);
    await replaceProjectRelations(Number(id), { sections, products, paragraphs }, { replaceExisting: true });
    const updatedProject = await Project.findByPk(id, { include: PROJECT_INCLUDE });
    return res.status(200).json({ success: true, data: updatedProject });
  } catch (error) {
    console.error('Error updating project:', error);
    return fail(res, 500, 'Server error');
  }
});

export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return fail(res, 404, 'Project not found');
    await project.destroy();
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error('Error deleting project:', error);
    return fail(res, 500, 'Server error');
  }
});
