import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';
import { useTheme } from '../context/ThemeContext';

function FlyoutTrigger({ label, isOpen, onOpen }) {
  return (
    <button
      type="button"
      className={`nav-flyout-trigger${isOpen ? ' is-open' : ''}`}
      onClick={onOpen}
      aria-expanded={isOpen}
    >
      <span>{label}</span>
      <span className="nav-flyout-arrow" aria-hidden="true">›</span>
    </button>
  );
}

function ThemeToggleButton() {
  const { colorMode, toggleColorMode } = useTheme();
  const isDark = colorMode === 'dark';

  return (
    <button
      type="button"
      className="nav-theme-btn"
      onClick={toggleColorMode}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <svg className="nav-theme-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.25" />
          <path d="M12 2.5v2.2M12 19.3v2.2M4.7 12H2.5M21.5 12h-2.2M6.4 6.4l-1.55-1.55M19.15 19.15l-1.55-1.55M17.6 6.4l1.55-1.55M4.85 19.15l1.55-1.55" />
        </svg>
      ) : (
        <svg className="nav-theme-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 14.8A7.5 7.5 0 0 1 9.2 3a6.2 6.2 0 1 0 12.8 11.8Z" />
        </svg>
      )}
    </button>
  );
}

export default function AppNavBar() {
  const { user, logout } = useAuth();
  const { organizations, teams, notificationCount } = useNav();
  const [showMenu, setShowMenu] = useState(false);
  const [openFlyout, setOpenFlyout] = useState(null);

  const closeMenu = () => {
    setShowMenu(false);
    setOpenFlyout(null);
  };

  const handleFlyoutOpen = (flyout) => {
    setOpenFlyout((current) => (current === flyout ? null : flyout));
  };

  return (
    <>
      <Navbar expand={false} className="app-navbar esports-navbar">
        <Container fluid className="px-3 px-md-4 app-navbar-inner">
          {user && (
            <Button
              variant="outline-light"
              size="sm"
              className="nav-hamburger-btn me-2"
              onClick={() => setShowMenu(true)}
              aria-label="Open menu"
            >
              ☰
            </Button>
          )}

          <Navbar.Brand as={Link} to={user ? '/dashboard' : '/'} className="app-navbar-brand">
            Esports Team Tracker
          </Navbar.Brand>

          {user && (
            <div className="nav-utility-actions">
              <ThemeToggleButton />
              <NavLink
                to="/requests"
                className="nav-requests-btn position-relative"
                aria-label={`Requests${notificationCount ? `, ${notificationCount} pending` : ''}`}
              >
                <span className="nav-requests-icon" aria-hidden="true">🔔</span>
                {notificationCount > 0 && (
                  <Badge
                    bg="danger"
                    pill
                    className="nav-requests-badge"
                  >
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Badge>
                )}
              </NavLink>
            </div>
          )}

          {!user && (
            <div className="nav-auth-actions d-flex flex-row flex-nowrap align-items-center ms-auto">
              <NavLink to="/signin" className="nav-link nav-auth-link">Sign in</NavLink>
              <NavLink to="/signup" className="nav-link nav-auth-link">Sign up</NavLink>
            </div>
          )}
        </Container>
      </Navbar>

      {user && (
        <Offcanvas
          show={showMenu}
          onHide={closeMenu}
          placement="start"
          className={`app-nav-offcanvas esports-offcanvas${openFlyout ? ' nav-flyout-open' : ''}`}
        >
          <Offcanvas.Header closeButton>
            <Offcanvas.Title>Menu</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="app-nav-offcanvas-body">
            <div className="nav-offcanvas-layout">
              <div className="nav-offcanvas-main d-flex flex-column gap-3">
                <div className="text-muted small">{user.username}</div>

                <Nav className="flex-column nav-menu-links">
                  <Nav.Link as={NavLink} to="/dashboard" onClick={closeMenu}>
                    Dashboard
                  </Nav.Link>
                </Nav>

                <div className="nav-flyout-list">
                  <FlyoutTrigger
                    label="Organizations"
                    isOpen={openFlyout === 'organizations'}
                    onOpen={() => handleFlyoutOpen('organizations')}
                  />
                  <FlyoutTrigger
                    label="Teams"
                    isOpen={openFlyout === 'teams'}
                    onOpen={() => handleFlyoutOpen('teams')}
                  />
                </div>

                <Nav className="flex-column nav-menu-links">
                  <Nav.Link as={NavLink} to="/add-time" onClick={closeMenu}>
                    Add time
                  </Nav.Link>
                  <Nav.Link as={NavLink} to="/suggest-game" onClick={closeMenu}>
                    Suggest a game
                  </Nav.Link>
                  {user.is_staff && (
                    <>
                      <Nav.Link as={NavLink} to="/admin/game-suggestions" onClick={closeMenu}>
                        Game suggestions
                      </Nav.Link>
                      <Nav.Link as={NavLink} to="/admin/password-reset-requests" onClick={closeMenu}>
                        Password reset requests
                      </Nav.Link>
                      <Nav.Link as={NavLink} to="/admin/beta-feedback" onClick={closeMenu}>
                        Beta feedback
                      </Nav.Link>
                    </>
                  )}
                </Nav>

                <div className="mt-auto pt-3 border-top">
                  <Button variant="outline-secondary" className="w-100" onClick={() => { closeMenu(); logout(); }}>
                    Sign out
                  </Button>
                </div>
              </div>

              {openFlyout === 'organizations' && (
                <div className="nav-flyout-panel" role="region" aria-label="Organizations submenu">
                  <div className="nav-flyout-panel-header">Organizations</div>
                  <div className="nav-flyout-panel-body">
                    {organizations.length === 0 ? (
                      <>
                        <Nav.Link
                          as={NavLink}
                          to="/join-organization"
                          onClick={closeMenu}
                          className="nav-submenu-link nav-submenu-link-action"
                        >
                          Create or join organization
                        </Nav.Link>
                        <p className="text-muted small mb-0 px-3 py-2">No organizations yet.</p>
                      </>
                    ) : (
                      organizations.map((org) => (
                        <Nav.Link
                          key={org.id}
                          as={NavLink}
                          to={`/organizations/${org.id}`}
                          onClick={closeMenu}
                          className="nav-submenu-link"
                        >
                          {org.name}
                          {org.is_org_leader && (
                            <Badge bg="primary" className="ms-2">Leader</Badge>
                          )}
                        </Nav.Link>
                      ))
                    )}
                  </div>
                </div>
              )}

              {openFlyout === 'teams' && (
                <div className="nav-flyout-panel" role="region" aria-label="Teams submenu">
                  <div className="nav-flyout-panel-header">Teams</div>
                  <div className="nav-flyout-panel-body">
                    {teams.length === 0 ? (
                      <p className="text-muted small mb-0 px-3 py-2">No teams yet.</p>
                    ) : (
                      teams.map((team) => (
                        <Nav.Link
                          key={team.id}
                          as={NavLink}
                          to={`/teams/${team.id}`}
                          onClick={closeMenu}
                          className="nav-submenu-link"
                        >
                          {team.name}
                        </Nav.Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </Offcanvas.Body>
        </Offcanvas>
      )}
    </>
  );
}
