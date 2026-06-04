import { useEffect, useMemo, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Form from 'react-bootstrap/Form';
import { activityLabel } from '../utils/gameLabels';

const statusClass = {
  fast: 'grid-cell-fast',
  medium: 'grid-cell-medium',
  slow: 'grid-cell-slow',
};

function TrackLabel({ level }) {
  return (
    <div className="track-label text-center">
      <div className="fw-semibold">{level.name}</div>
      {(level.level_group || level.is_dlc) && (
        <div className="small text-muted d-flex align-items-center justify-content-center gap-2 flex-wrap mt-1">
          {level.level_group && <span>{level.level_group}</span>}
          {level.is_dlc && (
            <Badge bg="secondary" className="grid-dlc-badge">DLC</Badge>
          )}
        </div>
      )}
    </div>
  );
}

export default function TimesGridTable({ grid }) {
  const trackLabel = activityLabel(grid?.game, true);

  if (!grid?.levels?.length) {
    return <p className="dashboard-empty-copy mb-0">No {trackLabel.toLowerCase()} yet for this game.</p>;
  }

  return (
    <div className="grid-scroll-wrapper">
      <table className="table table-sm table-bordered times-grid mb-0">
        <thead>
          <tr>
            <th className="sticky-col">{trackLabel}</th>
            {grid.members.map((member) => (
              <th key={member.id} className="member-col">{member.username}</th>
            ))}
            <th>Par 1</th>
            <th>Par 2</th>
            <th>Elite</th>
          </tr>
        </thead>
        <tbody>
          {grid.levels.map((level) => (
            <tr key={level.id}>
              <td className="sticky-col">
                <TrackLabel level={level} />
              </td>
              {grid.members.map((member) => {
                const cell = level.results[String(member.id)] || {};
                return (
                  <td
                    key={member.id}
                    className={`member-col text-center ${statusClass[cell.status] || ''}`}
                  >
                    {cell.display || '—'}
                  </td>
                );
              })}
              <td>{level.benchmark.target_fast || '—'}</td>
              <td>{level.benchmark.target_slow || '—'}</td>
              <td>{level.benchmark.elite || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function trackOptionLabel(level) {
  const parts = [level.name];
  if (level.level_group) {
    parts.push(level.level_group);
  }
  if (level.is_dlc) {
    parts.push('DLC');
  }
  return parts.join(' · ');
}

function MobileTrackTimesCard({ level, members }) {
  return (
    <div className="esports-panel mobile-grid-card mobile-grid-track-panel">
      <h2 className="mobile-grid-card-title">{level.name}</h2>
      {(level.level_group || level.is_dlc) && (
        <p className="mobile-grid-card-meta d-flex align-items-center gap-2 flex-wrap">
          {level.level_group && <span>{level.level_group}</span>}
          {level.is_dlc && (
            <Badge bg="secondary" className="grid-dlc-badge">DLC</Badge>
          )}
        </p>
      )}
      <div className="mobile-grid-card-benchmarks">
        <span>Par 1: {level.benchmark.target_fast || '—'}</span>
        <span>Par 2: {level.benchmark.target_slow || '—'}</span>
        <span>Elite: {level.benchmark.elite || '—'}</span>
      </div>
      {members.map((member) => {
        const cell = level.results[String(member.id)] || {};
        return (
          <div
            key={member.id}
            className={`mobile-grid-member-row ${statusClass[cell.status] || ''}`}
          >
            <span>{member.username}</span>
            <span>{cell.display || '—'}</span>
          </div>
        );
      })}
    </div>
  );
}

export function MobileGridCards({ grid }) {
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [trackSearch, setTrackSearch] = useState('');

  useEffect(() => {
    setSelectedLevelId('');
    setTrackSearch('');
  }, [grid?.game?.id, grid?.levels]);

  const filteredLevels = useMemo(() => {
    if (!grid?.levels?.length) {
      return [];
    }
    const query = trackSearch.trim().toLowerCase();
    if (!query) {
      return grid.levels;
    }
    return grid.levels.filter((level) => {
      const haystack = [
        level.name,
        level.level_group,
        level.is_dlc ? 'dlc' : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [grid?.levels, trackSearch]);

  const selectedLevel = useMemo(() => {
    if (!selectedLevelId || !grid?.levels?.length) {
      return null;
    }
    return grid.levels.find((level) => String(level.id) === String(selectedLevelId)) || null;
  }, [grid?.levels, selectedLevelId]);

  if (!grid?.levels?.length) {
    return null;
  }

  return (
    <div className="d-md-none mobile-grid-cards">
      <div className="mobile-grid-picker esports-panel">
        <Form.Group className="mb-3">
          <Form.Label className="mobile-grid-picker-label">Search tracks</Form.Label>
          <Form.Control
            type="search"
            value={trackSearch}
            onChange={(event) => setTrackSearch(event.target.value)}
            placeholder="Type to filter tracks..."
            className="mobile-grid-track-search"
            aria-label="Search tracks"
          />
        </Form.Group>
        <Form.Group className="mb-0">
          <Form.Label className="mobile-grid-picker-label">Select a track to see team times</Form.Label>
          <Form.Select
            value={selectedLevelId}
            onChange={(event) => setSelectedLevelId(event.target.value)}
            className="dashboard-select mobile-grid-track-select"
          >
            <option value="" disabled>
              Select a track to see team times
            </option>
            {filteredLevels.map((level) => (
              <option key={level.id} value={level.id}>
                {trackOptionLabel(level)}
              </option>
            ))}
          </Form.Select>
          {trackSearch.trim() && filteredLevels.length === 0 && (
            <p className="mobile-grid-picker-empty mb-0 mt-2">No tracks match your search.</p>
          )}
        </Form.Group>
      </div>

      {selectedLevel ? (
        <MobileTrackTimesCard level={selectedLevel} members={grid.members} />
      ) : (
        <p className="mobile-grid-picker-hint mb-0">Select a track to see team times.</p>
      )}
    </div>
  );
}

function MobileLeaderboardCards({ leaderboard, game }) {
  const trackLabel = activityLabel(game, true);

  return (
    <div className="d-md-none mobile-leaderboard-list">
      {leaderboard.map((row) => (
        <article key={row.member_id} className="mobile-leaderboard-card">
          <div className="mobile-leaderboard-head">
            <span className="mobile-leaderboard-rank">#{row.position}</span>
            <span className="mobile-leaderboard-name">{row.username}</span>
          </div>
          <dl className="mobile-leaderboard-stats">
            <div className="mobile-leaderboard-stat">
              <dt>{trackLabel}</dt>
              <dd>{row.completed}/{row.total_tracks}</dd>
            </div>
            <div className="mobile-leaderboard-stat">
              <dt>Par 1</dt>
              <dd>{row.par1_pct}%</dd>
            </div>
            <div className="mobile-leaderboard-stat">
              <dt>Par 2</dt>
              <dd>{row.par2_pct}%</dd>
            </div>
            <div className="mobile-leaderboard-stat">
              <dt>Done</dt>
              <dd>{row.completion_pct}%</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

export function LeaderboardTable({ leaderboard, game }) {
  if (!leaderboard?.length) {
    return <p className="dashboard-empty-copy mb-0">No times recorded yet.</p>;
  }

  const trackLabel = activityLabel(game, true);

  return (
    <>
      <div className="d-none d-md-block grid-scroll-wrapper">
        <table className="table table-sm times-grid leaderboard-table mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>Team member</th>
              <th>{trackLabel}</th>
              <th>Par 1 %</th>
              <th>Par 2 %</th>
              <th>Done %</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row) => (
              <tr key={row.member_id}>
                <td>{row.position}</td>
                <td>{row.username}</td>
                <td>{row.completed}/{row.total_tracks}</td>
                <td>{row.par1_pct}%</td>
                <td>{row.par2_pct}%</td>
                <td>{row.completion_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MobileLeaderboardCards leaderboard={leaderboard} game={game} />
    </>
  );
}
