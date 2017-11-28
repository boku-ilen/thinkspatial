from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^css_dyn/style.css', views.stylecss, name="stylecss"),
    url(r'^images_dyn/img_color.png', views.imgcolor, name="imgcolor"),
    url(r'^images_dyn/(?P<id>[0-9]+)/(?P<color>[0-9a-fA-F]{6})/symbol_svg_id.svg(?:shadow=(?P<shadow>\d+)/)?$', views.symbolsvg, name="symbolsvg"),
    url(r'^ajax/leaflet_poi_get.json', views.poigetjson, name="poigetjson"),
]