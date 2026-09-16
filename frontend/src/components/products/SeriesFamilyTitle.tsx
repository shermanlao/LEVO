'use client';

import { HelpLink } from '@/components/admin/HelpButton';
import { FileDownloadIcon, InstallationIcon } from './ProductFileIcons';
import { getSeriesFamilyDatasheetUrl, getSeriesInstallationUrl } from '@/lib/sqlite-api';

const FILE_BTN =
  'btn-primary inline-flex items-center gap-1.5 text-xs py-1.5 px-2.5 whitespace-nowrap shrink-0';
const FILE_ICON = 'h-3.5 w-3.5';
const SECONDARY_BTN =
  'btn-secondary inline-flex items-center text-xs py-1.5 px-2.5 whitespace-nowrap shrink-0';

type SeriesFamilyTitleProps = {
  seriesName: string;
  seriesSlug: string;
};

export default function SeriesFamilyTitle({ seriesName, seriesSlug }: SeriesFamilyTitleProps) {
  const inquireHref = `/contact?series=${encodeURIComponent(seriesSlug)}`;

  return (
    <div className="min-w-0">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 leading-tight">
        {seriesName}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <HelpLink
          href={getSeriesFamilyDatasheetUrl(seriesSlug)}
          helpKey="catalog.family_datasheet.download"
          target="_blank"
          rel="noopener noreferrer"
          className={FILE_BTN}
        >
          <FileDownloadIcon className={FILE_ICON} />
          Family Datasheet
        </HelpLink>
        <HelpLink
          href={getSeriesInstallationUrl(seriesSlug)}
          helpKey="catalog.installation.download"
          target="_blank"
          rel="noopener noreferrer"
          className={FILE_BTN}
        >
          <InstallationIcon className={FILE_ICON} />
          Installation
        </HelpLink>
        <HelpLink href={inquireHref} helpKey="catalog.series.inquire" className={SECONDARY_BTN}>
          Inquire
        </HelpLink>
      </div>
    </div>
  );
}
