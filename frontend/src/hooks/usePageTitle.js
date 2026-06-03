import { useEffect } from 'react';
import { formatDocumentTitle } from '../config/appMeta';

export default function usePageTitle(pageTitle) {
  useEffect(() => {
    if (pageTitle) {
      document.title = formatDocumentTitle(pageTitle);
    }
  }, [pageTitle]);
}
