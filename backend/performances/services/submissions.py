from performances.models import MemberResult, MemberResultHistory


def record_member_time(*, user, team, level, value_ms, entered_by):
    MemberResultHistory.objects.create(
        user=user,
        team=team,
        level=level,
        value=value_ms,
        entered_by=entered_by,
    )

    result, created = MemberResult.objects.get_or_create(
        user=user,
        team=team,
        level=level,
        defaults={'value': value_ms},
    )
    if not created and value_ms < result.value:
        result.value = value_ms
        result.save(update_fields=['value', 'submitted_at'])

    return result
