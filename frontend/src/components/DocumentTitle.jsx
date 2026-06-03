import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { formatDocumentTitle } from '../config/appMeta';
import { getPageTitleForPath } from '../utils/pageTitles';

export default function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = formatDocumentTitle(getPageTitleForPath(pathname));
  }, [pathname]);

  return null;
}
