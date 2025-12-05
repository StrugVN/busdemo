from django.db import models

class TuyenBus(models.Model):
    MaTuyen = models.CharField(primary_key=True, max_length=10)
    TenTuyen = models.CharField(max_length=60, null=True, blank=True)

    class Meta:
        db_table = "tuyen_bus"
        managed = False


class TramDung(models.Model):
    MaTram = models.CharField(primary_key=True, max_length=10)
    MaLoai = models.CharField(max_length=10, null=True, blank=True)
    MaXa = models.CharField(max_length=10, null=True, blank=True)
    TenTram = models.CharField(max_length=50, null=True, blank=True)
    KinhDo = models.FloatField(null=True, blank=True)
    ViDo = models.FloatField(null=True, blank=True)
    DiaChi = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = "tram_dung"
        managed = False
