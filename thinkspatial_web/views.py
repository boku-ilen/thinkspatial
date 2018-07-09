from django.conf import settings
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from PIL import Image
from .models import Symbol
import os
import logging
import datetime

logger = logging.getLogger(__name__)


# the main controller for the map display
def index(request, template=None):

    # get the default project if there is no project defined in the session yet
    project = request.session.get("project")
    if project is None:
        project = None  # FIXME: load project from database

    # set the template style if it is given as parameter
    #TODO: set template also based on project settings or user preferences
    if template is not None:
        request.session["template"] = template
    else:
        if "template" not in request.session:
            request.session["template"] = "old"  # set default template

    context = {
        'user': request.user,
        'project_name': 'youth.places',  # TODO: change default based on project
        'project_info': 'this is a placeholder test description',
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


# returns a list of POIs
def poigetjson(request):

    # check for a valid session and the current project
    project = request.session.get("project")
    response = {}
    if project is not None:
        print()
        # TODO: business logic

    return JsonResponse(response)


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