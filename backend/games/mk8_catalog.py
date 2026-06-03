MK8_ORIGINAL_SLUG = 'mario-kart-8-deluxe-original'
MK8_GAME_NAME = 'Mario Kart 8 Deluxe'

MK8_ORIGINAL_CUPS = [
    ('Mushroom Cup', [
        'Mario Kart Stadium',
        'Water Park',
        'Sweet Sweet Canyon',
        'Thwomp Ruins',
    ]),
    ('Flower Cup', [
        'Mario Circuit',
        'Toad Harbor',
        'Twisted Mansion',
        'Shy Guy Falls',
    ]),
    ('Star Cup', [
        'Sunshine Airport',
        'Dolphin Shoals',
        'Electrodrome',
        'Mount Wario',
    ]),
    ('Special Cup', [
        'Cloudtop Cruise',
        'Bone-Dry Dunes',
        "Wii U Bowser's Castle",
        'Wii U Rainbow Road',
    ]),
    ('Egg Cup', [
        'Yoshi Circuit',
        'Excitebike Arena',
        'Dragon Driftway',
        'Mute City',
    ]),
    ('Crossing Cup', [
        'Baby Park',
        'Cheese Land',
        'Wild Woods',
        'Animal Crossing',
    ]),
    ('Shell Cup', [
        'Moo Moo Meadows',
        'GBA Mario Circuit',
        'Cheep Cheep Beach',
        "Toad's Turnpike",
    ]),
    ('Banana Cup', [
        'Dry Dry Desert',
        'Donut Plains 3',
        'Royal Raceway',
        'DK Jungle',
    ]),
    ('Leaf Cup', [
        'DS Wario Stadium',
        'GCN Sherbert Land',
        'Music Park',
        'Yoshi Valley',
    ]),
    ('Lightning Cup', [
        'Tick-Tock Clock',
        'Piranha Plant Slide',
        'Grumble Volcano',
        'N64 Rainbow Road',
    ]),
    ('Triforce Cup', [
        "Wario's Gold Mine",
        'SNES Rainbow Road',
        'Ice Ice Outpost',
        'Hyrule Circuit',
    ]),
    ('Bell Cup', [
        'Neo Bowser City',
        'Ribbon Road',
        'Super Bell Subway',
        'Big Blue',
    ]),
]

MK8_DLC_CUPS = [
    ('Golden Dash Cup', [
        'Tour Paris Promenade',
        '3DS Toad Circuit',
        'N64 Choco Mountain',
        'Wii Coconut Mall',
    ]),
    ('Lucky Cat Cup', [
        'Tour Tokyo Blur',
        'DS Shroom Ridge',
        'GBA Sky Garden',
        'Ninja Hideaway',
    ]),
    ('Turnip Cup', [
        'Tour New York Minute',
        'SNES Mario Circuit 3',
        'N64 Kalimari Desert',
        'DS Waluigi Pinball',
    ]),
    ('Propeller Cup', [
        'Tour Sydney Sprint',
        'GBA Snow Land',
        'Wii Mushroom Gorge',
        'Sky-High Sundae',
    ]),
    ('Rock Cup', [
        'Tour London Loop',
        'GBA Boo Lake',
        '3DS Rock Rock Mountain',
        'Wii Maple Treeway',
    ]),
    ('Moon Cup', [
        'Tour Berlin Byways',
        'DS Peach Gardens',
        'Merry Mountain',
        '3DS Rainbow Road',
    ]),
    ('Fruit Cup', [
        'Tour Amsterdam Drift',
        'GBA Riverside Park',
        'Wii DK Summit',
        "Yoshi's Island",
    ]),
    ('Boomerang Cup', [
        'Tour Bangkok Rush',
        'DS Mario Circuit',
        'GCN Waluigi Stadium',
        'Tour Singapore Speedway',
    ]),
    ('Feather Cup', [
        'Tour Athens Dash',
        'GCN Daisy Cruiser',
        'Wii Moonview Highway',
        'Squeaky Clean Sprint',
    ]),
    ('Cherry Cup', [
        'Tour Los Angeles Laps',
        'GBA Sunset Wilds',
        'Wii Koopa Cape',
        'Tour Vancouver Velocity',
    ]),
    ('Acorn Cup', [
        'Tour Rome Avanti',
        'GCN DK Mountain',
        'Wii Daisy Circuit',
        'Piranha Plant Cove',
    ]),
    ('Spiny Cup', [
        'Tour Madrid Drive',
        "3DS Rosalina's Ice World",
        'SNES Bowser Castle 3',
        'Wii Rainbow Road',
    ]),
]


def seed_mk8_game(*, include_dlc=True):
    from games.models import Game, GameCategory, Level, LevelGroup, MetricType

    game, _created = Game.objects.update_or_create(
        slug=MK8_ORIGINAL_SLUG,
        defaults={
            'name': MK8_GAME_NAME,
            'metric_type': MetricType.TIME,
            'category': GameCategory.RACING,
            'is_active': True,
        },
    )

    sort_group = 0
    for group_name, tracks in MK8_ORIGINAL_CUPS:
        level_group, _ = LevelGroup.objects.update_or_create(
            game=game,
            name=group_name,
            defaults={'sort_order': sort_group},
        )
        for index, track_name in enumerate(tracks):
            Level.objects.update_or_create(
                game=game,
                name=track_name,
                defaults={
                    'level_group': level_group,
                    'sort_order': index,
                    'is_active': True,
                    'is_dlc': False,
                },
            )
        sort_group += 1

    if include_dlc:
        for group_name, tracks in MK8_DLC_CUPS:
            level_group, _ = LevelGroup.objects.update_or_create(
                game=game,
                name=group_name,
                defaults={'sort_order': sort_group},
            )
            for index, track_name in enumerate(tracks):
                Level.objects.update_or_create(
                    game=game,
                    name=track_name,
                    defaults={
                        'level_group': level_group,
                        'sort_order': index,
                        'is_active': True,
                        'is_dlc': True,
                    },
                )
            sort_group += 1

    legacy_dlc = Game.objects.filter(slug='mario-kart-8-deluxe-booster-course-pass').first()
    if legacy_dlc:
        legacy_dlc.is_active = False
        legacy_dlc.save(update_fields=['is_active'])

    return game
