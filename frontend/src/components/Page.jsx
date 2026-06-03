import Container from 'react-bootstrap/Container';
import usePageTitle from '../hooks/usePageTitle';

export default function Page({ title, children, actions = null, className = '' }) {
  usePageTitle(title);
  const classes = ['px-3', 'px-md-4', 'pb-5', 'page-shell', 'esports-page', className]
    .filter(Boolean)
    .join(' ');

  return (
    <Container fluid className={classes}>
      <div className="page-header mb-3">
        <h1 className="h3 mb-0 page-title">{title}</h1>
        {actions}
      </div>
      {children}
    </Container>
  );
}
