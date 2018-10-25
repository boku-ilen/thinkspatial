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

def get_statistics(attribute, group_by):
    with connection.cursor() as cursor:
        cursor.execute('''select attr2.value as "key", attr1.value as value from 
(select a.attribute_id, case when a.string_value is not NULL then a.string_value::varchar when a.integer_value is not NULL then a.integer_value::varchar when a.float_value is not NULL then a.float_value::varchar when a.date_value is not NULL then a.date_value::varchar end as value
from thinkspatial_web_attributevalue a where a.attribute_id = %s order by a.id) as attr1,
(select b.attribute_id, case when b.string_value is not NULL then b.string_value::varchar when b.integer_value is not NULL then b.integer_value::varchar when b.float_value is not NULL then b.float_value::varchar when b.date_value is not NULL then b.date_value::varchar end as value
from thinkspatial_web_attributevalue b where b.attribute_id = %s order by b.id) as attr2''', [attribute, group_by])
        rs = cursor.fetchall()
        
    return rs