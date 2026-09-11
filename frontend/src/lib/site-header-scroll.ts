export const SITE_HEADER_TOP_THRESHOLD = 16;
export const SITE_HEADER_DIRECTION_DELTA = 8;

export type SiteHeaderScrollState = {
  compact: boolean;
  hidden: boolean;
};

export function nextSiteHeaderScrollState(
  y: number,
  lastY: number,
  current: SiteHeaderScrollState,
  options: { pinned?: boolean; overlayOpen?: boolean; leaveTopAfter?: number } = {},
): SiteHeaderScrollState {
  const leaveTopAfter = Math.max(SITE_HEADER_TOP_THRESHOLD, options.leaveTopAfter ?? SITE_HEADER_TOP_THRESHOLD);
  const compact = y > leaveTopAfter;
  if (y <= SITE_HEADER_TOP_THRESHOLD || options.pinned || options.overlayOpen) {
    return { compact, hidden: false };
  }
  if (y > lastY + SITE_HEADER_DIRECTION_DELTA) {
    return { compact, hidden: true };
  }
  if (y < lastY - SITE_HEADER_DIRECTION_DELTA) {
    return { compact, hidden: false };
  }
  return { compact, hidden: current.hidden };
}
