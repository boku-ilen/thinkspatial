from django.conf import settings
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from PIL import Image
from . import models
import os


# a simple controller for the default start page.
def index(request):

    context = {'user': request.user}
    return render(request, "index.html", context)


# render the dynamic style sheet
def stylecss(request):

    # check for a valid session and the current project
    project = request.session.get("project")
    if project is None:
        return 404

    #TODO: render acutal project related css values
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
    if project is None:
        return 404

    #TODO: business logic

    response = {}
    return JsonResponse(response)



def symbolsvg(request, id, color, shadow=None):

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
    context = { 'shadow': shadow, 'shadow_code': shadow_code, 'color': color, 'symbolcode': symbol.code }
    return render(request, "symbol.svg", context, content_type="image/svg+xml")
