import re


TIME_PATTERN = re.compile(r'^(\d+):(\d{2})\.(\d{3})$')


def parse_time_to_ms(value: str) -> int:
    match = TIME_PATTERN.match(value.strip())
    if not match:
        raise ValueError('Time must be formatted as M:SS.mmm (example: 1:43.411).')
    minutes, seconds, milliseconds = (int(part) for part in match.groups())
    if seconds >= 60:
        raise ValueError('Seconds must be less than 60.')
    return (minutes * 60_000) + (seconds * 1_000) + milliseconds


def format_ms_to_time(value_ms: int) -> str:
    minutes, remainder = divmod(int(value_ms), 60_000)
    seconds, milliseconds = divmod(remainder, 1_000)
    return f'{minutes}:{seconds:02d}.{milliseconds:03d}'


def classify_time(value_ms: int | None, target_fast: int | None, target_slow: int | None) -> str | None:
    if value_ms is None or target_fast is None or target_slow is None:
        return None
    if value_ms <= target_fast:
        return 'fast'
    if value_ms <= target_slow:
        return 'medium'
    return 'slow'
