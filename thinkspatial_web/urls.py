from django.conf.urls import url, include
from django.contrib.auth.models import User
from django.contrib.staticfiles.storage import staticfiles_storage
from django.views.generic.base import RedirectView
from thinkspatial_web.models import Project
from rest_framework import routers, serializers, viewsets, generics
from rest_framework_gis.serializers import GeoFeatureModelSerializer, GeometrySerializerMethodField

from . import views

class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ("url", "username", "email", "is_staff")
        
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

'''
class ProjectSerializer(GeoFeatureModelSerializer):    
    class Meta:
        model = Project
        geo_field = "center_wkt"
        bbox_geo_field = "bounding_wkt"
        fields = ("id", "name", "desc", "location", "color")
        
    def unformat_geojson(self, feature):
        attrs = {
            self.Meta.geo_field: feature["geometry"]["coordinates"],
            "metadata": feature["properties"]
        }

        if self.Meta.bbox_geo_field and "bbox" in feature:
            attrs[self.Meta.bbox_geo_field] = Polygon.from_bbox(feature["bbox"])

        return attrs
        
'''
class ProjectSerializer(serializers.ModelSerializer):
    center = GeometrySerializerMethodField()
    bbox = GeometrySerializerMethodField()
    
    def get_center(self, obj):
        return obj.center_wkt
    
    def get_bbox(self, obj):
        return obj.bounding_wkt
    
    class Meta:
        model = Project
        fields = ("id", "name", "desc", "location", "color", "center", "bbox")

class ProjectViewSet(viewsets.ModelViewSet):    
    serializer_class = ProjectSerializer
    
    def get_queryset(self):
        queryset = Project.objects.all()
        user = self.request.query_params.get("user", None)
        if user is not None:
            queryset = queryset.filter(create_user_id=user)
        return queryset
    
class ProjectList(generics.ListAPIView):
    serializer_class = ProjectSerializer
    
    def get_queryset(self):
        queryset = Project.objects.all()
        user = self.request.query_params.get("user", None)
        if user is not None:
            queryset = queryset.filter(create_user_id=user)
        return queryset

router = routers.DefaultRouter()
router.register(r"users", UserViewSet)
router.register(r"projects", ProjectViewSet, base_name="projects")

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
    url(r'^ajax/(?P<layer>[a-zA-Z0-9]+)/layer.geojson', views.poigetgeojson, name="poigetgeojson"),
    # post the cluster data
    url(r'^ajax/cluster', views.cluster, name="ajax_cluster"),
    # insert a new poi
    url(r'^(?P<lat>[0-9]+\.[0-9]*)/(?P<long>[0-9]+\.[0-9]*)/newPOI', views.newPOI, name="newPOI"),
    
    #getString
    url(r'^app/languages/(?P<key>[a-z_]+)', views.getString, name="getString"),
    
    url(r"^rest/", include(router.urls)),
    url(r"^rest/api-auth/", include("rest_framework.urls", namespace="rest_framework"))
]