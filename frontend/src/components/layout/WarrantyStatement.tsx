import { getSiteContact, type WarrantySchedule } from '@/lib/sqlite-api';
import PageRoute from '@/components/layout/PageRoute';
import { resourceRouteItems } from '@/components/layout/pageRouteItems';
import AlertBanner from '@/components/ui/AlertBanner';
import Button from '@/components/ui/Button';
import { FileDownloadIcon } from '@/components/products/ProductFileIcons';

function statementParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function CopyList({ items }: { items: string[] }) {
  return (
    <div className="space-y-3 text-gray-800">
      {items.map((item) => (
        <p key={item}>{item}</p>
      ))}
    </div>
  );
}

function ScheduleTables({ schedule }: { schedule: WarrantySchedule }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {schedule.periods.map((period) => (
          <div key={period.label} className="card-panel h-full">
            <p className="text-3xl font-bold">{period.value}</p>
            <p className="text-sm font-medium text-gray-800 mt-1">{period.label}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-2">Warranty periods</h2>
        <p className="text-sm text-gray-500 mb-4">{schedule.periodNote}</p>
        <div className="table-wrap">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['What', 'Period', 'Note'].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schedule.periodRows.map((row) => (
                <tr key={row.what}>
                  <td className="px-6 py-4 text-sm text-gray-900">{row.what}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{row.period}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">Covered</h2>
          <CopyList items={schedule.covered} />
        </section>
        <section>
          <h2 className="text-2xl font-bold mb-4">Not covered</h2>
          <CopyList items={schedule.excluded} />
        </section>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">Conditions</h2>
        <div className="table-wrap">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Condition', 'Detail'].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schedule.conditions.map((row) => (
                <tr key={row.condition}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{row.condition}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">Remedy</h2>
          <CopyList items={schedule.remedy} />
        </section>
        <section>
          <h2 className="text-2xl font-bold mb-4">Claim</h2>
          <CopyList items={schedule.claim} />
          {schedule.claimNote ? (
            <div className="alert-warning mt-4" role="note">
              <p className="font-medium mb-1">How to claim</p>
              <p>{schedule.claimNote}</p>
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}

export default async function WarrantyStatement() {
  let title = 'Warranty';
  let body = '';
  let schedule: WarrantySchedule | null = null;
  let loadError: string | null = null;

  try {
    const contact = await getSiteContact();
    title = contact.resource_warranty_title?.trim() || 'Warranty';
    body = contact.resource_warranty_body?.trim() || '';
    schedule = contact.warranty_schedule || null;
  } catch (error) {
    console.error('WarrantyStatement - Failed to load site settings:', error);
    loadError = 'Could not load this page. Check that the API and database are available.';
  }

  const paragraphs = statementParagraphs(body);

  return (
    <div className="max-w-5xl mx-auto">
      <PageRoute items={resourceRouteItems(title)} />
      <h1 className="text-4xl font-bold mb-4">{title}</h1>
      {loadError ? <AlertBanner>{loadError}</AlertBanner> : null}
      {schedule?.lead ? <p className="text-lg text-gray-600 mb-6">{schedule.lead}</p> : null}
      {schedule ? (
        <div className="space-y-10">
          <div className="flex flex-wrap gap-3">
            <Button helpKey="catalog.warranty.download" href="/api/contact/warranty.pdf" download="LEVO-Warranty.pdf">
              <FileDownloadIcon />
              Download PDF
            </Button>
            <Button helpKey="catalog.warranty.contact" href="/contact" variant="secondary">
              Contact Us
            </Button>
          </div>
          <ScheduleTables schedule={schedule} />
          {paragraphs.length ? (
            <section className="bg-gray-50 p-8 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Warranty statement</h2>
              <div className="space-y-4 text-gray-800">
                {paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ) : null}
          {schedule.statutory ? (
            <p className="text-sm text-gray-600 border-l-4 border-gray-900 pl-4">{schedule.statutory}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
