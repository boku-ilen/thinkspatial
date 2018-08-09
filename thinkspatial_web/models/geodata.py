from django.contrib.gis.db import models
from thinkspatial_web.models.core import Base
from thinkspatial_web.models.structure import Project


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

    @staticmethod
    def to_geometry_type(type):
        for geom_type in Layer.GEOMETRY_TYPE_CHOICES:
            if type.upper() == geom_type[1]:
                return geom_type[0]


# represents a single geometry on a map
class Geometry(Base):

    # a layer can have multiple geometries
    layer = models.ForeignKey(Layer, on_delete=models.PROTECT)

    # coordinate representation in well known text (WKT)
    wkt = models.TextField(default=None)  # FIXME: is this a good fallback solution without a geodatabase?

    # geometry represented as spatial element
    geom = models.GeometryField()


class Attribute(Base):

    ATTRIBUTE_TYPE = (
        (1, 'STRING'),
        (2, 'INTEGER'),
        (3, 'FLOAT'),
        (4, 'DATETIME'),
    )

    # a layer can have multiple attribues
    layer = models.ForeignKey(Layer, on_delete=models.PROTECT)

    # the name of the attribute
    name = models.TextField(default=None)

    # the type of the attribute
    type = models.PositiveIntegerField(choices=ATTRIBUTE_TYPE)

    @staticmethod
    def to_attribute_type(type):
        for attribute in Attribute.ATTRIBUTE_TYPE:
            if type.upper()[:3] == attribute[1][:3]:
                return  attribute[0]


class AttributeValue(Base):

    # the associated attribute
    attribute = models.ForeignKey(Attribute, on_delete=models.PROTECT)

    string_value = models.TextField(default=None, null=True)
    integer_value = models.BigIntegerField(default=None, null=True)
    float_value = models.FloatField(default=None, null=True)
    date_value = models.DateTimeField(default=None, null=True)

    TYPE_TO_VALUE_ASSOCIATION = {
        1: string_value,
        2: integer_value,
        3: float_value,
        4: date_value,
    }

    # the value depending on the associated type
    @property
    def value(self):
        return self.TYPE_TO_VALUE_ASSOCIATION.get(self.attribute.type)

    @value.setter
    def value(self, value):
        if self.attribute.type == 1:
            self.string_value = value
        elif self.attribute.type == 2:
            self.integer_value = value
        elif self.attribute.type == 3:
            self.float_value = value
        elif self.attribute.type == 4:
            self.date_value = value

