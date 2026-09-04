export type ProductLdtFamily = 'circular' | 'linear';

export async function saveProductLdtOptions(
  productId: number | string,
  family: ProductLdtFamily,
  beamDegrees: number
): Promise<{ photometricImage: string }> {
  const res = await fetch(`/api/admin/backend/products/${productId}/ldt-options`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ family, beamDegrees }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to save polar options');
  }
  const photometricImage = String(data?.data?.attributes?.photometric_image || '').trim();
  if (!photometricImage) {
    throw new Error('Saved options but photometric image path was empty');
  }
  return { photometricImage };
}
