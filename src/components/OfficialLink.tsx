import type { ReactNode } from 'react';
import { officialUrl, openOfficialUrl } from '../lib/links';

/** 公式告知へのリンク。公式サイト以外のURLはリンクにせず、何も表示しない */
export function OfficialLink({ href, children }: { href?: string; children: ReactNode }) {
  const url = officialUrl(href);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        e.preventDefault();
        openOfficialUrl(url);
      }}
    >
      {children}
    </a>
  );
}
