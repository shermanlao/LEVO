import Button from '@/components/ui/Button';
import type { AdminNavSection } from '@/lib/admin-nav';

const LINK_CLASS = 'text-blue-600 hover:underline';

export default function AdminNavSectionBody({
  section,
  description,
}: {
  section: AdminNavSection;
  description?: string;
}) {
  const desc = description !== undefined ? description : section.description;
  return (
    <>
      <h2 className={`text-xl font-bold ${desc ? 'mb-2' : 'mb-4'}`}>{section.label}</h2>
      {desc ? <p className="text-sm text-gray-500 mb-4">{desc}</p> : null}
      <ul className="space-y-2">
        {section.links.map((link) => (
          <li key={link.href}>
            <Button helpKey={link.helpKey} variant="ghost" href={link.href} className={LINK_CLASS}>
              {link.label}
            </Button>
          </li>
        ))}
      </ul>
      {section.secondaryLinks?.length ? (
        <div className="mt-5 pt-4 border-t border-gray-100">
          <ul className="space-y-2">
            {section.secondaryLinks.map((link) => (
              <li key={link.href}>
                <Button helpKey={link.helpKey} variant="ghost" href={link.href} className={LINK_CLASS}>
                  {link.label}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
