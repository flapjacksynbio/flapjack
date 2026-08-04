from django.db import migrations, models


class Migration(migrations.Migration):
    """Make Strain.name unique.

    Global rather than per owner, matching how uploads already reuse strains by
    name with no owner filter.

    Depends on 0031 to merge pre-existing duplicates; without it this fails on
    any database that has them.
    """

    dependencies = [
        ('registry', '0031_dedupe_strain_names'),
    ]

    operations = [
        migrations.AlterField(
            model_name='strain',
            name='name',
            field=models.CharField(max_length=100, unique=True),
        ),
    ]
