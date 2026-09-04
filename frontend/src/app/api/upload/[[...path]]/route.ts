import { methodNotAllowed } from '@/lib/admin-backend';

export const dynamic = 'force-dynamic';

/** Public upload path is closed. Admin uploads go through /api/admin/backend/upload. */
export async function GET() {
  return methodNotAllowed('');
}

export const HEAD = GET;
export const POST = GET;
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
