import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import BackButton from '../components/BackButton';
import Page from '../components/Page';
import TeamColorEditor from '../components/TeamColorEditor';
import { useNav } from '../context/NavContext';
import * as teamApi from '../api/teams';

export default function TeamCoachColors() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { refreshNav } = useNav();
  const [team, setTeam] = useState(null);
  const [myMembership, setMyMembership] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [teamData, memberData] = await Promise.all([
          teamApi.getTeam(teamId),
          teamApi.getTeamMembers(teamId),
        ]);
        setTeam(teamData);
        setMyMembership(memberData.my_membership);
      } catch (err) {
        setError(err.response?.data?.detail || 'Unable to load team.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [teamId]);

  useEffect(() => {
    if (!loading && myMembership && !myMembership.is_head_coach) {
      navigate(`/teams/${teamId}/coach`, { replace: true });
    }
  }, [loading, myMembership, navigate, teamId]);

  const handleSaveTeamColors = async (payload) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const updated = await teamApi.updateTeamColors(teamId, payload);
      setTeam(updated);
      await refreshNav();
      setSuccess('Team colors updated.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to update team colors.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <Page title="Team colors"><p className="dashboard-loading">Loading...</p></Page>;
  }

  if (!myMembership?.is_head_coach) {
    return null;
  }

  return (
    <Page
      title="Team colors"
      actions={<BackButton fallback={`/teams/${teamId}/coach`} label="Coach tools" />}
    >
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <TeamColorEditor team={team} busy={busy} onSave={handleSaveTeamColors} />
    </Page>
  );
}
