import Badge from 'react-bootstrap/Badge';
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

export function MobileGridCards({ grid }) {
  const trackLabel = activityLabel(grid?.game, false);

  if (!grid?.levels?.length) return null;

  return (
    <div className="d-md-none mobile-grid-cards">
      {grid.levels.map((level) => (
        <div key={level.id} className="esports-panel mobile-grid-card">
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
          {grid.members.map((member) => {
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
    <div className="grid-scroll-wrapper">
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
  );
}
