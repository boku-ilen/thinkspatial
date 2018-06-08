from django.db import models
from django.contrib.auth.models import User
# from django.contrib.gis.db import models


# common base class to include create, update and deletestamps
class Base(models.Model):

    create_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+')
    create_timestamp = models.DateTimeField(default=None)
    update_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+', default=None, blank=True, null=True)
    update_timestamp = models.DateTimeField(default=None, blank=True, null=True)
    delete_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+', default=None, blank=True, null=True)
    delete_timestamp = models.DateTimeField(default=None, blank=True, null=True)

    class Meta:
        abstract = True


# represents a Project
class Project(Base):

    # a name representing the project
    name = models.TextField(default=None)

    # a description for the project
    desc = models.TextField(default=None)

    # the content of the info page
    info = models.TextField(default=None)

    # the homepage of the project
    homepage = models.TextField(default=None)

    #TODO: header?

    # the project icon
    icon = models.FileField(default=None)

    # verbal representation of the project location
    location = models.TextField(default=None)

    # wkt representation of the default center of the project map
    center_wkt = models.TextField(default=None)

    # wkt representation of the maximum bounding box of the project map
    bounding_wkt = models.TextField(default=None)

    # the zoom settings of the project
    zoom_default = models.PositiveIntegerField(default=5)
    zoom_min = models.PositiveIntegerField(default=3)
    zoom_max = models.PositiveIntegerField(default=11)

    #TODO: basemaps n:m
    #TODO: proj_symbol_view

    # settings
    color = models.CharField(max_length=6, default="FFCCAA")
    texture = models.FileField(default=None)


# a 'klecks'
def Style(Base):

    name = models.TextField(default=None)

    # the file which represents the alpha mask of a style
    alpha_mask = models.FileField(default=None)


# represents a Layer
class Layer(Base):

    GEOMETRY_TYPE_CHOICES = (
        (1, 'POINT'),
        (2, 'LINESTRING'),
        (3, 'POLYGON'),
        (4, 'POINT3D'),
        (5, 'LINESTRING3D'),
        (6, 'POLYGON3D'),
    )

    # a project can have multiple layers
    project = models.ForeignKey(Project, on_delete=models.PROTECT)

    # a name representing the layer
    name = models.TextField(default=None)

    # type of geometry
    geometry_type = models.PositiveIntegerField(choices=GEOMETRY_TYPE_CHOICES)


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


# represents a single geometry on a map
class Geometry(Base):

    # a layer can have multiple geometries
    layer = models.ForeignKey(Layer, on_delete=models.PROTECT)

    # coordinate representation in well known text (WKT)
    wkt = models.TextField(default=None)


# represents an optional group of categories
class Category_group(Base):

    name = models.TextField(default=None)


# represents a type of categories
# TODO: is this really an own class or just a choice for Category_group
class Category_type(Base):

    name = models.TextField(default=None)


# represents a font, which is available to the system (eg used to create a new symbol
class Font(Base):

    # the font as a file (ttf, svg, otd)
    file = models.FilePathField(default=None)

    # the license of the font
    license = models.TextField(default=None)

    # the creator of the font
    author = models.TextField(default=None)


# represents an renderable symbol
class Symbol(Base):

    #TODO: scale? hier oder im konkreten anwendungfall?
    scale = models.PositiveIntegerField(default=1)

    # the name of the symbol
    name = models.TextField(default=None)

    # the svg code representation of the symbol
    code = models.TextField(default=None)

    # used character (optional)
    character = models.CharField(default=None, max_length=1)

    # link to the used font (optional)
    font = models.ForeignKey(Font, on_delete=models.PROTECT, related_name='+')

    # the license of the symbol (optional)
    license = models.TextField(default=None)

    # the creator of the symbol (optional)
    author = models.TextField(default=None)

    # the alternative complex symbol as a file (svg) (optional)
    file = models.FilePathField(default=None)


# represents a category
class Category(Base):

    category_type = models.ForeignKey(Category_type, on_delete=models.PROTECT)
    category_group = models.ForeignKey(Category_group, on_delete=models.PROTECT)

    # the name of the category
    name = models.TextField(default=None)

    # the name of the opposite (optional)
    opposite = models.TextField(default=None)

    # the order of the category  represented in a numerical values (asc?)
    order = models.PositiveIntegerField(default=0)

    # the graphical representation of the category (optional)
    symbol = models.ForeignKey(Symbol, on_delete=models.PROTECT, related_name='+')


# representation of a single question in a form
class Question(Base):

    QUESTION_TYPE_CHOICES = (
        ('ST', 'SHORT_TEXT'),
        ('LT', 'LONG_TEXT'),
        ('SC', 'SINGLE_CHOICE'),
    )
    question_type = models.PositiveIntegerField(choices=QUESTION_TYPE_CHOICES)