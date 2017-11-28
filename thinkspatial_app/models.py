from django.db import models
from django.contrib.auth.models import User
# from django.contrib.gis.db import models


# common base class to include create, update and deletestamps
class Base(models.Model):

    create_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+')
    create_timestamp = models.DateTimeField
    update_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+')
    update_timestamp = models.DateTimeField
    delete_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+')
    delete_timestamp = models.DateTimeField

    class Meta:
        abstract = True


# represents a Project
class Project(Base):

    # a name representing the project
    name = models.CharField

    # a description for the project
    desc = models.TextField

    # the content of the info page
    info = models.TextField

    # the homepage of the project
    homepage = models.CharField

    #TODO: header?

    # the project icon
    icon = models.FileField

    # verbal representation of the project location
    location = models.CharField

    # wkt representation of the default center of the project map
    center_wkt = models.TextField

    # wkt representation of the maximum bounding box of the project map
    bounding_wkt = models.TextField

    # the zoom settings of the project
    zoom_default = models.PositiveIntegerField
    zoom_min = models.PositiveIntegerField
    zoom_max = models.PositiveIntegerField

    #TODO: basemaps n:m
    #TODO: proj_symbol_view

    # settings
    color = models.CharField
    texture = models.FileField


# a 'klecks'
def Style(Base):

    name = models.CharField

    # the file which represents the alpha mask of a style
    alpha_mask = models.FileField


# represents a Layer
class Layer(Base):

    # a project can have multiple layers
    project = models.ForeignKey(Project, on_delete=models.PROTECT)

    # a name representing the layer
    name = models.CharField


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
    gender = models.PositiveIntegerField(max_length=1, choices=GENDER_CHOICES)

    # age of the participant
    age = models.PositiveIntegerField(max_length=3)


# represents a single point on a map
class Geometry(Base):

    # a layer can have multiple point of interests
    layer = models.ForeignKey(Layer, on_delete=models.PROTECT)

    # coordinate representation in well known text (WKT)
    wkt = models.TextField


# represents an optional group of categories
class Category_group(Base):

    name = models.CharField


# represents a type of categories
class Category_type(Base):

    name = models.CharField


# represents an renderable symbol
class Symbol(Base):

    #TODO: scale? hier oder im konkreten anwendungfall?
    scale = models.PositiveIntegerField

    # the name of the symbol
    name = models.CharField

    #the svg code representation of the symbol
    code = models.TextField


# represents a category
class Category(Base):

    category_type = models.ForeignKey(Category_type, on_delete=models.PROTECT)
    category_group = models.ForeignKey(Category_group, on_delete=models.PROTECT)

    # the name of the category
    name = models.CharField

    # the name of the opposite (optional)
    opposite = models.CharField

    # the order of the category  represented in a numerical values (asc?)
    order = models.PositiveIntegerField

    # the graphical representation of the category (optional?)
    symbol = models.ForeignKey(Symbol, on_delete=models.PROTECT, related_name='+')


# represents a font, which is available to the system (eg used to create a new symbol
class Font(Base):

    file = models.FilePathField
    license = models.TextField


# representation of a single question
class Question(Base):

    QUESTION_TYPE_CHOICES = (
        ('ST', 'SHORT_TEXT'),
        ('LT', 'LONG_TEXT'),
        ('SC', 'SINGLE_CHOICE'),
    )
    question_type = models.PositiveIntegerField(max_length=3, choices=QUESTION_TYPE_CHOICES)