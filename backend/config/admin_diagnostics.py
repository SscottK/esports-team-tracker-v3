from django.contrib import admin
from django.contrib.admin.views.main import ChangeList
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import RequestFactory


def _unapplied_migrations():
    executor = MigrationExecutor(connection)
    plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
    return [f'{migration.app_label}.{migration.name}' for migration, _ in plan]


def run_admin_diagnostics(user):
    factory = RequestFactory()
    unapplied = _unapplied_migrations()
    results = {
        'unapplied_migrations': unapplied,
        'changelists': {'ok': [], 'errors': []},
        'changelist_views': {'ok': [], 'errors': []},
    }

    if unapplied:
        results['changelists']['errors'].append({
            'model': '*',
            'path': '*',
            'error': 'Unapplied migrations detected; run migrate before admin changelists.',
        })
        return results

    for model, model_admin in admin.site._registry.items():
        path = f'/admin/{model._meta.app_label}/{model._meta.model_name}/'
        request = factory.get(path)
        request.user = user
        try:
            model_admin.get_queryset(request).count()
            changelist = ChangeList(
                request,
                model,
                model_admin.list_display,
                model_admin.list_display_links,
                model_admin.list_filter,
                model_admin.date_hierarchy,
                model_admin.search_fields,
                model_admin.list_select_related,
                model_admin.list_per_page,
                model_admin.list_max_show_all,
                model_admin.list_editable,
                model_admin,
                sortable_by=model_admin.sortable_by,
                search_help_text=model_admin.search_help_text,
            )
            changelist.get_results(request)
            results['changelists']['ok'].append(path)
        except Exception as exc:
            results['changelists']['errors'].append({
                'model': f'{model._meta.app_label}.{model._meta.model_name}',
                'path': path,
                'error': str(exc),
            })

        try:
            response = model_admin.changelist_view(request)
            if response.status_code != 200:
                results['changelist_views']['errors'].append({
                    'model': f'{model._meta.app_label}.{model._meta.model_name}',
                    'path': path,
                    'status_code': response.status_code,
                })
            else:
                results['changelist_views']['ok'].append(path)
        except Exception as exc:
            results['changelist_views']['errors'].append({
                'model': f'{model._meta.app_label}.{model._meta.model_name}',
                'path': path,
                'error': str(exc),
            })

    return results
