import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import BackButton from '../components/BackButton';
import Page from '../components/Page';
import { useNav } from '../context/NavContext';
import * as teamApi from '../api/teams';

export default function AddTimeMenu() {
  const navigate = useNavigate();
  const { teams } = useNav();
  const [teamAccess, setTeamAccess] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAccess = async () => {
      setLoading(true);
      setError('');
      try {
        const results = await Promise.all(
          teams.map(async (team) => {
            try {
              const memberData = await teamApi.getTeamMembers(team.id);
              const membership = memberData.my_membership;
              if (!membership) {
                return null;
              }
              const canAddTime = membership.is_competing_member || membership.is_coach;
              if (!canAddTime) {
                return null;
              }
              return {
                ...team,
                role: membership.is_coach ? 'Coach' : 'Competing member',
              };
            } catch {
              return null;
            }
          }),
        );
        setTeamAccess(results.filter(Boolean));
      } catch {
        setError('Unable to load teams.');
      } finally {
        setLoading(false);
      }
    };

    if (teams.length === 0) {
      setTeamAccess([]);
      setLoading(false);
      return;
    }

    loadAccess();
  }, [teams]);

  useEffect(() => {
    if (!loading && teamAccess.length === 1) {
      navigate(`/teams/${teamAccess[0].id}/add-time`, { replace: true });
    }
  }, [loading, teamAccess, navigate]);

  if (loading) {
    return <Page title="Add time"><p className="dashboard-loading">Loading...</p></Page>;
  }

  return (
    <Page
      title="Add time"
      actions={<BackButton fallback="/dashboard" />}
    >
      {error && <Alert variant="danger">{error}</Alert>}

      {teamAccess.length === 0 ? (
        <Alert variant="info" className="mb-0">
          You are not on any teams where you can add times. Join a team and ask a coach to mark you as a competing member, or become a coach.
        </Alert>
      ) : (
        <section className="esports-panel form-page-panel">
          <h3 className="coach-tools-section-title">Select a team</h3>
          <p className="form-page-intro">Choose the team you want to record a time for.</p>
          <div className="form-page-picker-list">
            {teamAccess.map((team) => (
              <Link
                key={team.id}
                to={`/teams/${team.id}/add-time`}
                className="team-game-link d-flex justify-content-between align-items-center"
              >
                <span>{team.name}</span>
                <Badge bg="secondary">{team.role}</Badge>
              </Link>
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}
