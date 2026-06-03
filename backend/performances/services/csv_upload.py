import csv
import io
import re

from django.contrib.auth import get_user_model

from games.models import Game, Level
from performances.services.submissions import record_member_time
from performances.services.time_utils import parse_time_to_ms
from teams.models import Team, TeamGame, TeamMembership

User = get_user_model()

TIME_PATTERN = re.compile(r'^(\d+):(\d{2})\.(\d{3})$')


class TimesCsvImportError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def normalize_time_input(value: str) -> str:
    time_str = value.strip()
    if ':' not in time_str:
        raise ValueError(f'Invalid time format: {value}')
    minutes, rest = time_str.split(':', 1)
    if len(minutes) == 1:
        time_str = f'0{minutes}:{rest}'
    if not TIME_PATTERN.match(time_str):
        raise ValueError(f'Invalid time format: {value}')
    return time_str


def parse_mk8_times_csv(csv_content: str):
    """
    Parse Mario Kart-style team times CSV.
    Header row contains usernames starting at column C (index 2).
    Cup rows have a value in column A only; track rows have the track name in column B.
    """
    times_data = {}
    empty_lines = []
    parse_errors = []
    current_cup = None

    reader = csv.reader(io.StringIO(csv_content))
    try:
        header = next(reader)
    except StopIteration as exc:
        raise TimesCsvImportError('CSV file is empty.') from exc

    if len(header) < 3:
        raise TimesCsvImportError('CSV file has invalid format: missing username columns.')

    usernames = []
    for name in header[2:12]:
        if name:
            sanitized_name = name.strip()
            if sanitized_name:
                usernames.append(sanitized_name)

    if not usernames:
        raise TimesCsvImportError('No valid usernames found in CSV header.')

    for row_num, row in enumerate(reader, start=2):
        if not row or all(not cell.strip() for cell in row):
            empty_lines.append(row_num)
            continue

        if row[0].strip() and (len(row) < 2 or not row[1].strip()):
            current_cup = row[0].strip()
            continue

        if len(row) < 2 or not row[1].strip():
            continue

        level_name = row[1].strip()
        times_data[level_name] = {}

        for index, time_str in enumerate(row[2:12]):
            if index >= len(usernames):
                break
            if not time_str or not time_str.strip():
                continue
            username = usernames[index]
            try:
                normalized = normalize_time_input(time_str)
            except ValueError as exc:
                parse_errors.append({'line': row_num, 'error': str(exc)})
                continue
            times_data[level_name][username] = normalized

    if not times_data:
        raise TimesCsvImportError('No valid times found in CSV file.')

    return times_data, empty_lines, parse_errors, current_cup


def import_team_times_csv(*, team: Team, game: Game, csv_content: str, entered_by):
    if not TeamGame.objects.filter(team=team, game=game).exists():
        raise TimesCsvImportError('Game is not assigned to this team.')

    times_data, empty_lines, parse_errors, _cup = parse_mk8_times_csv(csv_content)

    levels_by_name = {
        level.name.lower(): level
        for level in Level.objects.filter(game=game, is_active=True)
    }
    team_memberships = {
        membership.user.username.lower(): membership.user
        for membership in TeamMembership.objects.filter(
            team=team,
            is_competing_member=True,
        ).select_related('user')
    }

    skipped_levels = []
    skipped_users = {
        'not_found': [],
        'not_in_team': [],
    }
    imported = 0

    for level_name, user_times in times_data.items():
        level = levels_by_name.get(level_name.lower())
        if not level:
            skipped_levels.append(level_name)
            continue

        for username, time_input in user_times.items():
            user = team_memberships.get(username.lower())
            if not user:
                try:
                    User.objects.get(username__iexact=username)
                    skipped_users['not_in_team'].append(username)
                except User.DoesNotExist:
                    skipped_users['not_found'].append(username)
                continue

            value_ms = parse_time_to_ms(time_input)
            record_member_time(
                user=user,
                team=team,
                level=level,
                value_ms=value_ms,
                entered_by=entered_by,
            )
            imported += 1

    return {
        'imported': imported,
        'empty_lines': empty_lines,
        'parse_errors': parse_errors,
        'skipped_levels': skipped_levels,
        'skipped_users': skipped_users,
    }
