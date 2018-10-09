from django.db import connection

def get_attributes(layer):
    with connection.cursor() as cursor:
        cursor.execute("""select a.name, case when a."type"=1 then av.string_value::varchar when a."type"=2 then av.integer_value::varchar when a."type"=3 then av.float_value::varchar when a."type"=4 then av.date_value::varchar end  as value from thinkspatial_web_attribute as a
join thinkspatial_web_view as v on a.id = v.attribute_id
join thinkspatial_web_attributevalue as av on a.id = av.attribute_id
where v.enabled = true and v.layer_id = %s order by av.id""", [layer])
        rs = cursor.fetchall()
        
        cursor.execute("select count(id) from thinkspatial_web_view where layer_id = %s", [layer])
        count = cursor.fetchone()
        
        
    return [rs, count[0]]