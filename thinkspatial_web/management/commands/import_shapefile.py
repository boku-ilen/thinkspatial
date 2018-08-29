import json
import fiona

from django.contrib.gis.geos import GEOSGeometry
from django.core.management.base import BaseCommand, CommandError

from thinkspatial_web.models import *

DEBUG = True


class Command(BaseCommand):
    help = 'Imports a given ESRI-Shapefile into the internal database format'

    def add_arguments(self, parser):
        parser.add_argument('shapefile', type=str)
        parser.add_argument('project', type=str)
        parser.add_argument('layer', type=str)

    def handle(self, *args, **options):

        project = Project.objects.filter(name=options['project'])
        if project:
            project = project[0]
        else:
            raise CommandError("project with name {} does not exist".format(options['project']))

        layer = Layer.objects.filter(project=project, name=options['layer'])
        if layer:
            raise CommandError("layer {} does already exist in project {}".format(options['layer'], project))

        shapefile = options['shapefile']
        try:
            with fiona.open(shapefile, 'r') as source:

                layer = Layer()
                layer.name = options['layer']
                layer.project = project
                if source:
                    layer.geometry_type = Layer.to_geometry_type(source[0]['geometry']['type'])
                else:
                    raise CommandError("shapefile {} seems empty".format(shapefile))
                layer.save()

                # create attributes
                attributes = {}
                for property, type in source.schema['properties'].items():
                    attribute = Attribute()
                    attribute.layer = layer
                    attribute.name = property
                    attribute.type = Attribute.to_attribute_type(type)
                    attribute.save()
                    attributes[property] = attribute

                for entry in source:

                    # create geometry
                    geometry = Geometry()
                    geometry.layer = layer
                    geometry.geom = GEOSGeometry(json.dumps(entry['geometry']))
                    geometry.wkt = geometry.geom.wkt
                    geometry.save()

                    # create properties
                    for key, value in entry['properties'].items():
                        attribute = attributes.get(key)
                        property = AttributeValue()
                        property.attribute = attribute
                        property.value = value
                        property.save()

        except:
            if DEBUG:
                import traceback, sys
                traceback.print_exc(file=sys.stdout)
            raise CommandError("shapefile {} could not be opened".format(shapefile))

        self.stdout.write(self.style.SUCCESS("Sucessfully iumported layer {} in project {}".format(layer, project)))