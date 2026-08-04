from django.db import migrations


def dedupe_strain_names(apps, schema_editor):
    """Merge duplicate Strain rows so 0032 can apply a unique constraint.

    The lowest id in each name group survives; samples pointing at the others
    are repointed to it.

    Order matters: Sample.strain is on_delete=CASCADE, so deleting a duplicate
    before repointing would take its samples and measurements with it.
    """
    Strain = apps.get_model('registry', 'Strain')
    Sample = apps.get_model('registry', 'Sample')

    survivors = {}
    # Materialized with list() because rows are deleted while iterating.
    for strain in list(Strain.objects.order_by('id')):
        survivor = survivors.get(strain.name)
        if survivor is None:
            survivors[strain.name] = strain
            continue
        Sample.objects.filter(strain=strain).update(strain=survivor)
        strain.delete()


def reverse_dedupe(apps, schema_editor):
    """Deliberately a no-op.

    Merging is not reversible: the duplicate rows and the knowledge of which
    sample pointed at which duplicate are both gone. Defined so the migration
    can still be unapplied, which is what allows 0032 to be rolled back.
    """


class Migration(migrations.Migration):

    dependencies = [
        ('registry', '0030_auto_20221118_1227'),
    ]

    operations = [
        migrations.RunPython(dedupe_strain_names, reverse_dedupe),
    ]
