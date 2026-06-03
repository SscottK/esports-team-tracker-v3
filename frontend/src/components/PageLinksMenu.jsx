import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from 'react-bootstrap/Button';

export default function PageLinksMenu({ label = 'More pages', links = [] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (links.length === 0) {
    return null;
  }

  return (
    <div className={`page-links-menu${open ? ' is-open' : ''}`} ref={rootRef}>
      <Button
        type="button"
        variant="outline-primary"
        size="sm"
        className="page-links-menu-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        {label}
      </Button>
      {open && (
        <div className="page-links-menu-panel" role="menu" aria-label={label}>
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="page-links-menu-item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
