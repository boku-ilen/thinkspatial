from django.db import connection

def get_attributes(layer):
    with connection.cursor() as cursor:
        cursor.execute("""SELECT DISTINCT a."attribute" FROM
                            (SELECT v.attribute_id AS "attribute" FROM thinkspatial_web_view v
                            WHERE v.layer_id = %s

                            UNION ALL

                            SELECT a.id AS "attribute" FROM thinkspatial_web_attribute a
                            JOIN thinkspatial_web_statistic s ON a.id = s.selection_attribute_id
                            WHERE a.layer_id = %s) a""", [layer, layer])
        
        attributes = [t[0] for t in cursor.fetchall()]
        
        cursor.execute("""SELECT a.name, CASE WHEN a."type"=1 THEN av.string_value::varchar 
                            WHEN a."type"=2 then av.integer_value::varchar 
                            WHEN a."type"=3 THEN av.float_value::varchar 
                            WHEN a."type"=4 THEN av.date_value::varchar 
                            END AS value FROM thinkspatial_web_attribute AS a
                            JOIN thinkspatial_web_attributevalue AS av ON a.id = av.attribute_id
                            WHERE a.id IN (""" + ",".join(["%s" for x in attributes]) + """) ORDER BY av.id""", attributes)
        rs = cursor.fetchall()
             
    return [rs, len(attributes)]