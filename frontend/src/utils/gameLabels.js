const DEFAULT_LABELS = {
  activity_singular: 'Activity',
  activity_plural: 'Activities',
  level_group_label: 'Group',
};

export function getGameLabels(game) {
  return game?.labels || DEFAULT_LABELS;
}

export function activityLabel(game, plural = false) {
  const labels = getGameLabels(game);
  return plural ? labels.activity_plural : labels.activity_singular;
}

export default getGameLabels;
