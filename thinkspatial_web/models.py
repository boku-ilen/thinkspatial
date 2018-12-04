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


# the settings of the different basemaps which can possibly used to display a project
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

    # the optional disclaimer text displayed the first time loading the map
    disclaimer = models.TextField(default=None, null=True)

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
        (7, 'MULTIPOLYGON')
    )

    # a project can have multiple layers
    project = models.ForeignKey(Project, on_delete=models.PROTECT)

    # a name representing the layer
    name = models.TextField(default=None)

    # type of geometry
    geometry_type = models.PositiveIntegerField(choices=GEOMETRY_TYPE_CHOICES)

    # enabled
    enabled = models.BooleanField(default=True)
    
    # attribute to display in info box during mouseover (optional)
    info_attribute = models.ForeignKey("Attribute", on_delete=models.PROTECT, null=True, blank=True, related_name="info_attribute")

    @staticmethod
    def to_geometry_type(type):
        for geom_type in Layer.GEOMETRY_TYPE_CHOICES:
            if type.upper() == geom_type[1]:
                return geom_type[0]

    @property
    def has_statistics(self):
        return len(Statistic.objects.all().filter(selection_attribute__layer_id=self.id) 
    | Statistic.objects.all().filter(selection_attribute=None, view__view_layer__layer=self)) > 0


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

    # the used value column in AttributeValue
    def type_to_column(self):
        if self.type == 1:
            return "string_value"
        elif self.type == 2:
            return "integer_value"
        elif self.type == 3:
            return "float_value"
        elif self.type == 4:
            return "date_value"


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
        (7, "STROKE_WEIGTH_DASH"),
        (8, "FILL"),
        (9, "FILL_STROKE"),
        (10, "FILL_WEIGHT"),
        (11, "FILL_DASH"),
        (12, "FILL_STROKE_WEIGHT"),
        (13, "FILL_STROKE_DASH"),
        (14, "FILL_WEIGHT_DASH"),
        (15, "ALL"),
        (16, "POINTS")
    )
    
    VISIBILITY_CHOICES = (
        (0, "INVISIBLE"),
        (1, "TAB"), # selectable in view tabs
        (2, "TAB NO DESELECT"),
        (3, "RADIO"), # (layers) selectable only in radio button group
        (4, "INVISIBLE_STATIC_LAYER"),
        (5, "VISIBLE_STATIC_LAYER")
    )

    # the name of the predefined view
    name = models.TextField()
    
    # the layers associated with this view    
    layers = models.ManyToManyField(Layer, through="View_Layer")

    enabled = models.BooleanField(default=True)
    
    default = models.BooleanField(default=False)
    
    signature_type = models.PositiveIntegerField(choices=SIGNATURE_TYPE_CHOICES, default=1)
    # TODO: Constraints? Possible signature_type combinations:
    # 1+2+3, 1+6, 2+5, 3+4, 7 
    
    concurrent_views = models.ManyToManyField("self", blank=True)
    
    visibility = models.PositiveIntegerField(choices=VISIBILITY_CHOICES, default=1)
    
    legend_tab_order = models.PositiveIntegerField(default=0)
    
    legend_order = models.PositiveIntegerField(default=0)
    
    def concurrents_as_json(self):
        js = list(self.concurrent_views.all().values_list("id", flat=True))
        return js

class View_Layer(Base):
    view = models.ForeignKey(View, on_delete=models.PROTECT)
    layer = models.ForeignKey(Layer, on_delete=models.PROTECT)
    attribute = models.ForeignKey(Attribute, on_delete=models.PROTECT)
    order = models.PositiveIntegerField(default=0)

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
    # the name of the symbol
    name = models.TextField(default=None)

    # the svg code representation of the symbol
    code = models.TextField(null=True)

    # used character (optional)
    character = models.CharField(max_length=1, null=True)

    # link to the used font (optional)
    font = models.ForeignKey(Font, on_delete=models.PROTECT, related_name='+', null=True)

    # the license of the symbol (optional)
    license = models.TextField(null=True)

    # the creator of the symbol (optional)
    author = models.TextField(null=True)

    # the alternative complex symbol as a file (svg) (optional)
    file = models.FilePathField(null=True)


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
    min_value = models.TextField(default=0)
    max_value = models.TextField(null=True, default=0)
    
    # label to display -- translation?
    label = models.TextField(default="<empty>", null=True, blank=True)
    
    # line weight ("WEIGHT")
    stroke = models.IntegerField(null=True)
    
    # line dash array ("DASH")
    dash_array = models.TextField(null=True)

    # hex RRGGBB ("Stroke")
    stroke_color = models.CharField(max_length=7, null=True)
    
    fill_color = models.CharField(max_length=7, null=True)

    # order
    order = models.IntegerField(default=0)
    
    type = models.PositiveIntegerField(choices=SIGNATURE_TYPE, default=1)

    # flags if multiple values are stored in the (min_)value field and have to be extracted first
    array = models.BooleanField(default=False)
    
    fill_opacity = models.FloatField(null=True)
    
    stroke_opacity = models.FloatField(null=True)
    
    hover = models.BooleanField(default=False)
    
    @property
    def key(self):
        for layer in self.view.view_layer_set.all():
            name = layer.attribute.name
            break
            
        if name == "symbol":
            return "<div class='key symbol' style='background-image: url(/images_dyn/" + self.min_value + "/ffffff/symbol_svg_id.svg?shadow=0.5)'></div>"
        elif name == "symbol-color":
            return "<div class='key color'><div style='background-color: #" + self.min_value + "'></div></div>"
        elif name == "symbol-size":
            return "<div class='key size'><div></div></div>"
        else:
            return self.to_svg()
    
    def to_svg(self):
        svg = "<svg width='32px' height='32px' viewBox='0 0 24 12'><line x1='0' x2='32' y1='6' y2='6' style='"
        
        if self.stroke_color is not None:
            svg += "stroke: " + self.stroke_color + ";"
            
        if self.stroke is not None:
            svg += "stroke-width: " + str(self.stroke) + ";"
            
        if self.dash_array is not None:
            svg += "stroke-dasharray: " + self.dash_array + ";"
            
        svg += "'/></svg>"
        
        return svg
    
    def values_as_json(self):
        values = [self.min_value]
        if self.max_value:
            values.append(self.max_value)
        if self.type == 1:
            if self.array:
                return json.dumps(self.min_value.split(","))
            else:
                return json.dumps(values)
        elif self.type == 2:
            if self.array:
                return json.dumps([int(i) for i in self.min_value.split(",")])
            else:
                return json.dumps([int(i) for i in values])
        elif self.type == 3:
            if self.array:
                return json.dumps([float(i) for i in self.min_value.split(",")])
            else:
                return json.dumps([float(i) for i in values])


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

#
class Statistic(Base):
    DIAGRAM_TYPE = (
        (0, "Invisible"),
        (1, "Bar Chart"),
        (2, "Inline") # inline w/ legend key
    )
    
    # diagram type
    type = models.PositiveIntegerField(choices=DIAGRAM_TYPE)
    
    # display absolute or relative values - default relative
    absolute = models.BooleanField(default=False)
    
    # attribute to analyse
    attribute = models.ForeignKey(Attribute, on_delete=models.PROTECT, related_name="attribute")

    # group by an attribute
    group_by_attribute = models.ForeignKey(Attribute, on_delete=models.PROTECT, related_name="group_by", default=None, null=True)
    
    # attribute of (another) layer to select group_by areas –
    # must have the same values as group_by_attribute
    selection_attribute = models.ForeignKey(Attribute, on_delete=models.PROTECT, related_name="selection", default=None, null=True)
    
    selection_view = models.ForeignKey(View, on_delete=models.PROTECT, related_name="selection_view", default=None, null=True)
    
    # view
    view = models.ForeignKey(View, on_delete=models.PROTECT)
    
    # view to filter by
    filter_views = models.ManyToManyField(View, related_name="filter_view")
    
    def get_json(self):
        attribute_values = AttributeValue.objects.filter(attribute=self.attribute.id).order_by("id").values_list(self.attribute.type_to_column(), flat=True)[0:500]
        
        if self.group_by_attribute is not None:
            group_by_values = AttributeValue.objects.filter(attribute=self.group_by_attribute.id).order_by("id").values_list(self.group_by_attribute.type_to_column(), flat=True)[0:500]
        else:
            group_by_values = [0 for i in range(0,len(attribute_values))]
        
        if self.filter_views is not None:
            filter_attributes = Attribute.objects.filter(id__in=View_Layer.objects.filter(view__in=self.filter_views.all()).values_list("attribute", flat=True))
            filter_values = []
            for filter_attribute in filter_attributes:
                filter_values.append(AttributeValue.objects.filter(attribute=filter_attribute).order_by("id").values_list(filter_attribute.type_to_column(), flat=True)[0:500])
        
        output = {"options": {"type": self.type, "absolute": self.absolute, "view": self.view.id, "filterViews": list(self.filter_views.all().values_list("id", flat=True))}}
        
        if self.selection_attribute is not None:
            output["options"]["selection"] = self.selection_attribute.name
            output["options"]["selectionView"] = self.selection_view.id
        
        output["values"] = list(zip(group_by_values, attribute_values, *filter_values))
        
        return output

class Question(Base):
    QUESTION_TYPE = (
        (1, "text"),
        (2, "textfield"),
        (3, "date"),
        
        (11, "radio"),
        (12, "radio-color"), #implemented
        (13, "radio-symbol"), #implemented
        (14, "radio-symbol-size"), #implemented
        
        (21, "checkbox"),
        (31, "select"),
        (41, "matrix")
    )
    
    type = models.PositiveIntegerField(choices=QUESTION_TYPE)
    
    question = models.TextField()
    
    explanation = models.TextField(null=True)
    
    attribute = models.ForeignKey(Attribute, on_delete=models.PROTECT)
    
    order = models.PositiveIntegerField(default=0)
    
class QuestionValue(Base):
    question = models.ForeignKey(Question, on_delete=models.PROTECT)
    
    #left for matrix, only label for all other types
    label_left = models.TextField(null=True)
    
    label_right = models.TextField(null=True)
    
    symbol = models.ForeignKey(Symbol, on_delete=models.PROTECT, null=True)
    
    order = models.PositiveIntegerField(default=0)
    
class QuestionMatrixColumn(Base):
    question = models.ForeignKey(Question, on_delete=models.PROTECT)
    
    label = models.TextField()
    
    order = models.PositiveIntegerField(default=0)