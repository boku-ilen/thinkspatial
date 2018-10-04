from django.contrib.auth.models import User
from django.contrib.gis.db import models
import json


# common base class to include create, update and deletestamps
class Base(models.Model):

    create_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+', default=1)
    create_timestamp = models.DateTimeField(auto_now_add=True)
    update_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+', default=None, blank=True, null=True)
    update_timestamp = models.DateTimeField(null=True, default=None, blank=True)
    delete_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='+', default=None, blank=True, null=True)
    delete_timestamp = models.DateTimeField(default=None, blank=True, null=True)

    class Meta:
        abstract = True


#
class Basemap(Base):

    # the name of the basemap
    name = models.TextField(default=None)

    # the http string of the basemap in the format [http[s]]//{s}.domain/...
    url_string = models.TextField(default=None)

    # html string of the basemap copyright
    attribution = models.TextField(default=None)

    type = models.TextField(default=None)

    zoom_min = models.IntegerField()

    zoom_max = models.IntegerField()

    # imploded array of subdomain names
    subdomains = models.TextField(default=None)


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

    # the associated basemaps
    basemaps = models.ManyToManyField(Basemap)

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

    # enabled
    enabled = models.BooleanField(default=True)


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
        if self.attribute.type == 1:
            return self.string_value
        elif self.attribute.type == 2:
            return self.integer_value
        elif self.attribute.type == 3:
            return self.float_value
        elif self.attribute.type == 4:
            return self.date_value

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


class View(Base):
    
    SIGNATURE_TYPE_CHOICES = (
        (1, "STROKE"),
        (2, "WEIGHT"),
        (3, "DASH_ARRAY"),
        (4, "STROKE_WEIGHT"),
        (5, "STROKE_DASH"),
        (6, "WEIGHT_DASH"),
        (7, "ALL")
    )

    # the name of the predefined view
    name = models.TextField()

    # the layer associated with this view
    layer = models.ForeignKey(Layer, on_delete=models.PROTECT)

    # the associated attribute
    attribute = models.ForeignKey(Attribute, on_delete=models.PROTECT)

    enabled = models.BooleanField(default=True)
    
    signature_type = models.PositiveIntegerField(choices=SIGNATURE_TYPE_CHOICES, default=1)
    # TODO: Constraints? Possible signature_type combinations:
    # 1+2+3, 1+6, 2+5, 3+4, 7 
    
    concurrent_views = models.ManyToManyField("self", blank=True)
    
    visible = models.BooleanField(default=True)
    
    def concurrents_as_json(self):
        js = json.dumps(list(self.concurrent_views.all().values_list("id")))
        if len(js) > 2:
            return js[1:-1]
        else:
            return js


# represents an optional group of categories
class Category_group(Base):

    name = models.TextField(default=None)


# represents a type of categories
# TODO: is this really an own class or just a choice for Category_group
class Category_type(Base):

    name = models.TextField(default=None)


# a 'klecks'
class Style(Base):

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


# ..
class Signature(Base):
    
    SIGNATURE_TYPE = (
        (1, 'STRING'),
        (2, 'INTEGER'),
        (3, 'FLOAT'),
    )

    # the associated predefined view
    view = models.ForeignKey(View, on_delete=models.PROTECT, related_name='+')

    # experimental: enumeration of associated values as string-encoded array
    values = models.TextField()
    
    # label to display -- translation?
    label = models.TextField(default="<empty>")
    
    # line weight ("WEIGHT")
    stroke = models.IntegerField(null=True)
    
    # line dash array ("DASH")
    dash_array = models.TextField(null=True)

    # hex RRGGBB ("Stroke")
    rgb_color = models.CharField(max_length=7, null=True)

    # order
    order = models.IntegerField(default=0)
    
    type = models.PositiveIntegerField(choices=SIGNATURE_TYPE, default=1)
    
    def values_as_json(self):
        if self.type == 1:
            return json.dumps(self.values.split(","))
        elif self.type == 2:
            return json.dumps([int(i) for i in self.values.split(",")])
        elif self.type == 3:
            return json.dumps([float(i) for i in self.values.split(",")])


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
