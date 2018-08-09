from django.contrib.gis.db import models
from thinkspatial_web.models.core import Base
from django.contrib.auth.models import User


# a representation of an actor (participant, etc.)
class Participant(Base):

    GENDER_CHOICES = (
        (1, 'MAN'),
        (2, 'WOMAN'),
        (3, 'OTHER'),
    )

    # a reference to the auth.user model
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    # gender of the particpant
    gender = models.PositiveIntegerField(choices=GENDER_CHOICES)

    # age of the participant
    age = models.PositiveIntegerField()


# representation of a single question in a form
class Question(Base):

    QUESTION_TYPE_CHOICES = (
        ('ST', 'SHORT_TEXT'),
        ('LT', 'LONG_TEXT'),
        ('SC', 'SINGLE_CHOICE'),
    )
    question_type = models.PositiveIntegerField(choices=QUESTION_TYPE_CHOICES)