from django.db import models

# Create your models here.
class TuyenBus(models.Model):
    MaTuyen = models.CharField(primary_key=True, max_length=10)
    TenTuyen = models.CharField(max_length=60, null=True, blank=True)
    # We won't map the geometry field here – we'll fetch it via raw SQL.

    class Meta:
        db_table = 'tuyen_bus'
        managed = False  # table already exists in MySQL