from django.conf.urls import url
from django.contrib.staticfiles.storage import staticfiles_storage
from django.views.generic.base import RedirectView

from . import views

urlpatterns = [
    # the favicon
    url(r'^favicon.ico$', RedirectView.as_view(url=staticfiles_storage.url('favicon.ico'), permanent=False), name="favicon"),
    # the main map view
    url(r'^$', views.index, name='index'),
    url(r'^template/(?P<template>[a-zA-Z0-9]+)', views.index, name="index"),  # set template
    # the dynamic style sheet
    url(r'^css_dyn/style.css', views.stylecss, name="stylecss"),
    url(r'^images_dyn/img_color.png', views.imgcolor, name="imgcolor"),
    # dynamically scaled svg image
    url(r'^images_dyn/(?P<id>[0-9]+)/(?P<color>[0-9a-fA-F]{6})/symbol_svg_id.svg(?:shadow=(?P<shadow>\d+)/)?$', views.symbolsvg, name="symbolsvg"),
    # get the poi geometries
    url(r'^ajax/leaflet_get_pois.json', views.poigetjson, name="poigetjson"),
    # post the cluster data
    url(r'^ajax/cluster', views.cluster, name="ajax_cluster"),
    # insert a new poi
    url(r'^(?P<lat>[0-9]+\.[0-9]*)/(?P<long>[0-9]+\.[0-9]*)/newPOI', views.newPOI, name="newPOI")
]