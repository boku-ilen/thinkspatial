from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry
from django.shortcuts import render
from django.http import HttpResponse
from django.conf import settings
from django.utils.translation import ugettext as _

from thinkspatial_web.models import Project, Geometry, AttributeValue, Layer, Symbol, View, Attribute, Signature
from thinkspatial_web.custom_sqls import get_attributes

from PIL import Image
import os
import logging
import datetime
import json
import time

logger = logging.getLogger(__name__)


# the main controller for the map display
def index(request, template=None):

    # get the default project if there is no project defined in the session yet
    project = request.session.get("project")
    if project is None:
        project = Project.objects.first()  # TODO: configure which project to show by default

    # get the associated basemaps
    basemaps = project.basemaps.all()

    # get the associated layers & predefined views
    layers = Layer.objects.filter(project=project, enabled=True)
    views = {}
    for layer in layers:
        views[layer] = View.objects.filter(layer=layer, enabled=True)
        
    signatures = {}
    for layer, views1 in views.items():
        for view in views1:
            signatures[view] = Signature.objects.filter(view=view).order_by("order")

    # read center of the current project
    center = GEOSGeometry(project.center_wkt)

    # set the template style if it is given as parameter
    # TODO: set template also based on project settings or user preferences
    if template is not None:
        request.session["template"] = template
    else:
        if "template" not in request.session:
            request.session["template"] = settings.DEFAULT_TEMPLATE  # set default template

    context = {
        'user': request.user,
        'project_id': project.id,
        'layers': layers,
        'views': views,
        'signatures': signatures,
        'basemaps': basemaps,
        'zoom_min': project.zoom_min,
        'zoom_max': project.zoom_max,
        'zoom_default': project.zoom_default,
        'center_long': center.x,
        'center_lat': center.y,
        'project_name': project.name,
        'project_info': project.info,
        'timestamp': datetime.datetime.now(),
        'template': request.session["template"],
    }

    return render(request, "index.html", context)


# render the dynamic style sheet
def stylecss(request):
    logger.debug("rendering dynamic style.css")

    # check for a valid session and the current project
    project = request.session.get("project")
    if project is None:
        # or set default values
        context = { 'colorLight': '#648127', 'colorDark': '#DBEFB3'}
        logger.warning("Could not find project in session - rendering style.css with default values")

    # TODO: render acutal project related css values
    context = { 'colorLight': '#648127', 'colorDark': '#DBEFB3'}

    return render(request, "style.css", context, content_type="text/css; charset: UTF-8")


# render a dynamic png image as response
def imgcolor(request):
    base_image = os.path.join(settings.BASE_DIR, 'static/app_name/images/base_image.png')
    img = Image.open(base_image)

    #TODO: implement business logic

    # IDEA: generate a new image with bg color as required by color parameter
    # apply alpha mask which is previously stored in the database and configured by the parameters
    # no base image is required. during uploading the new style simply the alpha mask is stored

    response = HttpResponse(content_type="image/png")
    img.save(response, "PNG")
    return response


# returns a list of POIs as geoJSON
def poigetgeojson(request, layer):

    # check for a valid session and the current project
    # project = request.session.get("project")

    start = time.time()
    lyr = Layer.objects.get(pk=layer)

    response = {"type": "FeatureCollection", "features": []}
    if lyr is not None:

        # TODO: add crs?

        logger.debug("startup time: {}ms".format(time.time() - start))
        geometries = Geometry.objects.filter(layer=lyr).order_by("id")  # , geom__within=boundingbox
        logger.debug("geometries load time: {}ms (suspected to be lazy loaded)".format(time.time() - start))
        attributes = get_attributes(lyr.id)
        views = attributes[1]
        attributes = attributes[0]

        # get geometry and properties from all attributes which are referenced in prepared views
        for index, geometry in enumerate(geometries):
            feature = {"geometry": json.loads(geometry.geom.json),
                       "properties": {attribute[0]: attribute[1] for attribute in
                                      attributes[index * views:index * views + views]}, "type": "Feature"}
            response["features"].append(feature)

    logger.debug("complete load time: {}ms".format(time.time() - start))
    return HttpResponse(json.dumps(response).replace('\\"', '\"'), content_type="application/geo+json")


def symbolsvg(request, id, color, shadow=None):

    logger.info("create symbol with id: {} in color #{} and shadow: {}".format(id, color, shadow))

    # get the requested symbol by id
    symbol = Symbol.objects.get(pk=int(id))

    #TODO: calculate transformation and scale

    # generate the shadow?
    if shadow is not None:
        shadow = True
        shadow_code = float(shadow)
    else:
        shadow = False
        shadow_code = None

    # render the svg file
    context = { 'shadow': shadow,
                'shadow_code': shadow_code,
                'color': color,
                'symbol_code': symbol.code,
                'scale': 0.15,
                'translate_x': 0,
                'translate_y': 700,
                }
    return render(request, "symbol.svg", context, content_type="image/svg+xml")


# this renders an input form for a new POI at the given location
def newPOI(request, lat, long):
    logger.debug("render dialog for new poi at lat: {} long: {}".format(lat, long))

    context = {}

    return render(request, "formbuilder.html", context)


# TODO: implement
def cluster(request):
    return None


# returns the translation of a given key via json (for the mobile app)
def getString(request, key):
    return HttpResponse(json.dumps({key: _(key)}), content_type="application/json")
