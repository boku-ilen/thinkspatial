from django.contrib.auth.models import User
from django.contrib.gis.db import models


# common base class to include create, update and deletestamps
class Base(models.Model):

    create_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+', default=1)
    create_timestamp = models.DateTimeField(auto_now_add=True)
    update_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+', default=None, blank=True, null=True)
    update_timestamp = models.DateTimeField(auto_now=True)
    delete_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+', default=None, blank=True, null=True)
    delete_timestamp = models.DateTimeField(default=None, blank=True, null=True)

    class Meta:
        abstract = True