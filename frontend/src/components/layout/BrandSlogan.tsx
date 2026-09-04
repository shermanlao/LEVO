export default function BrandSlogan({
  slogan,
  className = '',
}: {
  slogan?: string | null;
  className?: string;
}) {
  const text = String(slogan || '').trim();
  if (!text) return null;
  return <span className={`brand-slogan ${className}`.trim()}>{text}</span>;
}
