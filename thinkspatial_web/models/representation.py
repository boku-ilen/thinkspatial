from django.contrib.gis.db import models
from .core import Base

# a 'klecks'
def Style(Base):

    name = models.TextField(default=None)

    # the file which represents the alpha mask of a style
    alpha_mask = models.FileField(default=None)


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
