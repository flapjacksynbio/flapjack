from django.db import migrations, models


def copy_fk_to_m2m(apps, schema_editor):
    """Carry each sample's existing strain into the new M2M set.

    Without this step the conversion silently discards every existing
    sample-to-strain association.
    """
    Sample = apps.get_model('registry', 'Sample')
    for sample in Sample.objects.exclude(strain__isnull=True).iterator():
        sample.strain_m2m.add(sample.strain)


def copy_m2m_to_fk(apps, schema_editor):
    """Reverse: collapse the set back to a single strain.

    Lossy by nature. A sample holding a consortium keeps only its
    lowest-id strain, because the ForeignKey cannot represent more than one.
    """
    Sample = apps.get_model('registry', 'Sample')
    for sample in Sample.objects.iterator():
        first = sample.strain_m2m.order_by('id').first()
        if first is not None:
            sample.strain = first
            sample.save(update_fields=['strain'])


class Migration(migrations.Migration):
    """Convert Sample.strain from ForeignKey to ManyToManyField.

    Lets a sample hold a consortium of strains.

    The relation is added under a temporary name, existing values are copied
    across, then the old column is dropped and the field renamed into place,
    so no association is lost.
    """

    dependencies = [
        ('registry', '0032_strain_name_unique'),
    ]

    operations = [
        migrations.AddField(
            model_name='sample',
            name='strain_m2m',
            field=models.ManyToManyField(related_name='samples', to='registry.Strain'),
        ),
        migrations.RunPython(copy_fk_to_m2m, copy_m2m_to_fk),
        migrations.RemoveField(
            model_name='sample',
            name='strain',
        ),
        migrations.RenameField(
            model_name='sample',
            old_name='strain_m2m',
            new_name='strain',
        ),
    ]
