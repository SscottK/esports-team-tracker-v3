import Badge from 'react-bootstrap/Badge';

function compareClass(timeMs, compareMs) {
  if (!timeMs || !compareMs) return '';
  if (timeMs < compareMs) return 'compare-better';
  const diff = ((timeMs - compareMs) / compareMs) * 100;
  if (diff > 10) return 'compare-slow';
  if (diff > 5) return 'compare-medium';
  return 'compare-close';
}

export default function MobileCompareCards({
  levels,
  selectedMembers,
  memberLabel,
  getTime,
  timeToMs,
  diffPercent,
  spreadFromBest,
}) {
  return (
    <div className="mobile-compare-list">
      {levels.map((level) => {
        const memberTimes = selectedMembers.map((memberId) => ({
          memberId,
          display: getTime(level.id, memberId),
          ms: timeToMs(getTime(level.id, memberId)),
        }));
        const bestMs = memberTimes
          .map((entry) => entry.ms)
          .filter(Boolean)
          .sort((a, b) => a - b)[0] || null;
        const spreadLabel = selectedMembers.length === 2
          ? diffPercent(memberTimes[0].ms, memberTimes[1].ms)
          : spreadFromBest(memberTimes.map((entry) => entry.ms));

        return (
          <article key={level.id} className="mobile-compare-card">
            <div className="mobile-compare-card-head">
              <div className="mobile-compare-track-name">{level.name}</div>
              {(level.level_group || level.is_dlc) && (
                <div className="mobile-compare-track-meta">
                  {level.level_group && <span>{level.level_group}</span>}
                  {level.is_dlc && <Badge bg="secondary" className="grid-dlc-badge">DLC</Badge>}
                </div>
              )}
            </div>
            <div className="mobile-compare-member-rows">
              {memberTimes.map(({ memberId, display, ms }) => (
                <div key={memberId} className="mobile-compare-member-row">
                  <span className="mobile-compare-member-label">{memberLabel(memberId)}</span>
                  <span className={`mobile-compare-member-time ${compareClass(ms, bestMs)}`}>
                    {display}
                  </span>
                </div>
              ))}
            </div>
            <div className="mobile-compare-spread">
              {selectedMembers.length === 2 ? 'Difference' : 'Spread'}: {spreadLabel}
            </div>
          </article>
        );
      })}
    </div>
  );
}
