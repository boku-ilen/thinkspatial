from django.contrib.gis.db import models
from .core import Base

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
    TEMPLATE_CHOICES = (
        (1, 'old'),
        (2, 'plain'),
        (3, 'windy'),
    )
    color = models.CharField(max_length=6, default="FFCCAA")
    texture = models.FileField(default=None)
    template = models.PositiveSmallIntegerField(choices=TEMPLATE_CHOICES)


# represents an optional group of categories
class Category_group(Base):

    name = models.TextField(default=None)


# represents a type of categories
# TODO: is this really an own class or just a choice for Category_group
class Category_type(Base):

    name = models.TextField(default=None)


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
