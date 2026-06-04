import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import BackButton from '../components/BackButton';
import MobileCompareCards from '../components/MobileCompareCards';
import Page from '../components/Page';
import { activityLabel } from '../utils/gameLabels';
import * as performancesApi from '../api/performances';
import * as teamApi from '../api/teams';

function timeToMs(display) {
  if (!display || display === '—') return null;
  const [mins, rest] = display.split(':');
  const [secs, ms] = rest.split('.');
  return Number(mins) * 60000 + Number(secs) * 1000 + Number(ms);
}

function compareClass(timeMs, compareMs) {
  if (!timeMs || !compareMs) return '';
  if (timeMs < compareMs) return 'compare-better';
  const diff = ((timeMs - compareMs) / compareMs) * 100;
  if (diff > 10) return 'compare-slow';
  if (diff > 5) return 'compare-medium';
  return 'compare-close';
}

function diffPercent(timeMs, compareMs) {
  if (!timeMs || !compareMs) return '—';
  return `${Math.abs(((timeMs - compareMs) / compareMs) * 100).toFixed(1)}%`;
}

function spreadFromBest(selectedTimes) {
  const values = selectedTimes.filter(Boolean);
  if (values.length < 2) return '—';
  const best = Math.min(...values);
  const worst = Math.max(...values);
  if (best === worst) return '0.0%';
  return `${(((worst - best) / best) * 100).toFixed(1)}%`;
}

export default function CompareTimes() {
  const { teamId, gameId } = useParams();
  const [data, setData] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [member1, setMember1] = useState('');
  const [member2, setMember2] = useState('');
  const [member3, setMember3] = useState('');
  const [includeCoachCompetitors, setIncludeCoachCompetitors] = useState(false);
  const [includeDlc, setIncludeDlc] = useState(true);
  const [viewer, setViewer] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [compareData, team] = await Promise.all([
          performancesApi.getTeamCompare(teamId, gameId, { includeCoachCompetitors, includeDlc }),
          teamApi.getTeam(teamId),
        ]);
        setData(compareData);
        setViewer(compareData.viewer);
        setTeamName(team.name);
        const humanMembers = compareData.members.filter(
          (member) => !String(member.id).startsWith('target'),
        );
        const memberIds = new Set(humanMembers.map((member) => String(member.id)));
        setMember1((prev) => (memberIds.has(prev) ? prev : String(humanMembers[0]?.id || '')));
        setMember2((prev) => (memberIds.has(prev) ? prev : String(humanMembers[1]?.id || '')));
        setMember3((prev) => (!prev || memberIds.has(prev) ? prev : ''));
      } catch (err) {
        setError(err.response?.data?.detail || 'Unable to load comparison data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [teamId, gameId, includeCoachCompetitors, includeDlc]);

  const humanMembers = useMemo(
    () => data?.members.filter((member) => !String(member.id).startsWith('target')) || [],
    [data],
  );

  const selectedMembers = useMemo(() => {
    const ids = [member1, member2, member3].filter(Boolean);
    return [...new Set(ids)];
  }, [member1, member2, member3]);

  const trackLabel = activityLabel(data?.game, true);
  const showGridToggles = viewer?.can_toggle_dlc || viewer?.can_toggle_coach_competitors;
  const getTime = (levelId, memberId) => data?.times?.[`${levelId}-${memberId}`] || '—';
  const memberLabel = (memberId) => humanMembers.find((member) => String(member.id) === memberId)?.username || 'Member';

  return (
    <Page
      title={data ? `Compare — ${teamName}` : 'Compare times'}
      actions={(
        <div className="page-header-actions page-header-actions--compact">
          <Button
            as={Link}
            to={`/teams/${teamId}/games/${gameId}`}
            variant="outline-primary"
            size="sm"
          >
            Times grid
          </Button>
          <BackButton fallback={`/teams/${teamId}/games/${gameId}`} label="Back" />
        </div>
      )}
    >
      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <p className="dashboard-loading">Loading comparison…</p>
      ) : data ? (
        <>
          <section className="esports-panel form-page-panel compare-filters-panel mb-4">
            <div className="compare-section-head">
              <div className="compare-section-head-row">
                <h3 className="coach-tools-section-title mb-0">{data.game.name}</h3>
                {showGridToggles && (
                  <div className="compare-section-toggles">
                    {viewer?.can_toggle_dlc && (
                      <Form.Check
                        type="switch"
                        id="compare-include-dlc-tracks"
                        className="times-grid-toggle mb-0"
                        label="Show DLC tracks (Booster Course Pass)"
                        checked={includeDlc}
                        onChange={(e) => setIncludeDlc(e.target.checked)}
                      />
                    )}
                    {viewer?.can_toggle_coach_competitors && (
                      <Form.Check
                        type="switch"
                        id="compare-include-coach-competitors"
                        className="times-grid-toggle mb-0"
                        label="Show coach times (coaches who also compete)"
                        checked={includeCoachCompetitors}
                        onChange={(e) => setIncludeCoachCompetitors(e.target.checked)}
                      />
                    )}
                  </div>
                )}
              </div>
              <p className="form-page-intro mb-0">
                Compare up to three team members side by side. Colors are relative to the fastest selected time on each row.
              </p>
            </div>

            <Row className="g-3 compare-member-filters">
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>First team member</Form.Label>
                  <Form.Select value={member1} onChange={(e) => setMember1(e.target.value)}>
                    <option value="">Select team member</option>
                    {humanMembers.map((member) => (
                      <option key={member.id} value={member.id}>{member.username}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Second team member</Form.Label>
                  <Form.Select value={member2} onChange={(e) => setMember2(e.target.value)}>
                    <option value="">Select team member</option>
                    {humanMembers.map((member) => (
                      <option key={member.id} value={member.id}>{member.username}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Third team member (optional)</Form.Label>
                  <Form.Select value={member3} onChange={(e) => setMember3(e.target.value)}>
                    <option value="">None</option>
                    {humanMembers.map((member) => (
                      <option key={member.id} value={member.id}>{member.username}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </section>

          {selectedMembers.length < 2 ? (
            <Alert variant="info">Select at least two different team members to compare.</Alert>
          ) : (
            <>
              <div className="compare-legend mb-3">
                <span className="compare-pill compare-better">Better time</span>
                <span className="compare-pill compare-close">Within 5%</span>
                <span className="compare-pill compare-medium">5–10% slower</span>
                <span className="compare-pill compare-slow">&gt;10% slower</span>
              </div>

              <div className="d-md-none">
                <MobileCompareCards
                  levels={data.levels}
                  selectedMembers={selectedMembers}
                  memberLabel={memberLabel}
                  getTime={getTime}
                  timeToMs={timeToMs}
                  diffPercent={diffPercent}
                  spreadFromBest={spreadFromBest}
                />
              </div>

              <div className="d-none d-md-block grid-scroll-wrapper">
                <table className="table table-sm table-bordered compare-table mb-0">
                  <thead>
                    <tr>
                      <th className="sticky-col">{trackLabel}</th>
                      {selectedMembers.map((memberId) => (
                        <th key={memberId}>{memberLabel(memberId)}</th>
                      ))}
                      <th>{selectedMembers.length === 2 ? 'Difference' : 'Spread'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.levels.map((level) => {
                      const memberTimes = selectedMembers.map((memberId) => ({
                        memberId,
                        display: getTime(level.id, memberId),
                        ms: timeToMs(getTime(level.id, memberId)),
                      }));
                      const bestMs = memberTimes
                        .map((entry) => entry.ms)
                        .filter(Boolean)
                        .sort((a, b) => a - b)[0] || null;

                      return (
                        <tr key={level.id}>
                          <td className="sticky-col text-center">
                            <div className="track-label">
                              <div>{level.name}</div>
                              {(level.level_group || level.is_dlc) && (
                                <div className="small text-muted d-flex align-items-center justify-content-center gap-2 flex-wrap mt-1">
                                  {level.level_group && <span>{level.level_group}</span>}
                                  {level.is_dlc && (
                                    <Badge bg="secondary" className="grid-dlc-badge">DLC</Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          {memberTimes.map(({ memberId, display, ms }) => (
                            <td
                              key={memberId}
                              className={`text-center ${compareClass(ms, bestMs)}`}
                            >
                              {display}
                            </td>
                          ))}
                          <td className="text-center">
                            {selectedMembers.length === 2
                              ? diffPercent(memberTimes[0].ms, memberTimes[1].ms)
                              : spreadFromBest(memberTimes.map((entry) => entry.ms))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      ) : null}
    </Page>
  );
}
