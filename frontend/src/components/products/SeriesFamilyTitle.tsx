'use client';

import { HelpLink } from '@/components/admin/HelpButton';
import { FileDownloadIcon, InstallationIcon } from './ProductFileIcons';
import { getSeriesFamilyDatasheetUrl, getSeriesInstallationUrl } from '@/lib/sqlite-api';

const FILE_BTN = 'btn-primary inline-flex items-center text-sm py-2 px-3 whitespace-nowrap shrink-0';
const FILE_ICON = 'mr-1 h-4 w-4';

type SeriesFamilyTitleProps = {
  seriesName: string;
  seriesSlug: string;
};

export default function SeriesFamilyTitle({ seriesName, seriesSlug }: SeriesFamilyTitleProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-2">
      <h1 className="text-4xl font-bold">{seriesName}</h1>
      <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
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
      </div>
    </div>
  );
}
