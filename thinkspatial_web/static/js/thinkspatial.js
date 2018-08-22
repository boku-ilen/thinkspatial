/**
 *  THINKSPATIAL!
 *
 *
 */

// inverts the visibility of the given div
function DivShowHide(divName){
    if(document.getElementById(divName)){
        document.getElementById(divName).style.display = (document.getElementById(divName).style.display == 'none') ? 'inline' : 'none';
    }
}

//TODO: what is this doing?
$("#cluster").click(function () {
    var cb=document.getElementById('cluster');
    if (cb.checked) {
        var post_val = 1;
    } else {
        var post_val = 0;
    }

    $.ajax({
        type: "POST",
        url: "ajax_cluster.php",
        async: true,
        data: {
            cluster: post_val // as you are getting in php $_POST['action1']
        },

    });
    location.reload();
});


$( function() {
    $( "#slider" ).slider({
        value: 0,
        min: -3,
        max: 4,
        slide: function(event, ui) {
            $('#scrollbar').slider('value', ui.value);
            $.ajax({
                type: 'post',
                url: '#',
                datatype: 'json',
                data: {'slider': ui.value},
                success: function(fromphp) {
                    $('#iconsize').html(fromphp.data);
                    $("#form_resize").submit();
                }
            });
        }
    });
} );


$(document).ready(function(){
    $('#slide').click(function(){
        var hidden = $('.hidden');
        if (hidden.hasClass('visible')){
            hidden.animate({"left":"-1000px"}, "slow").removeClass('visible');
        } else {
            hidden.animate({"left":"0px"}, "slow").addClass('visible');
        }
    });
});


// initialize fancybox plugin
$(document).ready(function() {
    $(".fancybox").fancybox();
});


$(document).ready(function() {
    $(".various").fancybox({
        maxWidth	: 800,
        maxHeight	: 600,
        fitToView	: false,
        width		: '70%',
        height		: '70%',
        autoSize	: false,
        closeClick	: false,
        openEffect	: 'none',
        closeEffect	: 'none',
        afterClose: function () {
            parent.location.reload(true);
        }
    });
});


// make hyperlinks in a text clickable by adding the html-tag <a ..>
function urlify(text) {
    if (text != null && text != undefined) {
        var urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, function (url) {
            return '<a href="' + url + '">' + url + '</a>';
        })
    } else {
        return "";
    }
}


// initialize leaflet
$(document).ready(function() {

    var map = L.map('map', {
        center: map_center,
        zoom: zoom_default,
        minZoom: zoom_min,
        maxZoom: zoom_max
    });

    // add default basemap to map and add all defined basemaps to the layer control widget
    if (Object.keys(basemaps).length > 0) {
        basemaps[Object.keys(basemaps)[0]].addTo(map);
        if (Object.keys(basemaps).length > 1) {  // only add the control widget if there is more then 1 basemap
            L.control.layers(basemaps).addTo(map);  // TODO: maybe use own control for better graphical representation
        }
    }

    // get the layer data and add it to the overlays
    var markers = L.markerClusterGroup(); // TODO: do we really always want clusters or make it configurable
    var points = new L.LayerGroup(); //TODO: clear old stuff
    var overlays = {}
    layers.forEach(function(layer) {
        layergroup = new L.LayerGroup();
        //TODO: maybe load only active overlay?
        $.getJSON("ajax/" + layer.id + "/layer.geojson", function(data) { addDataToMap(data, layergroup); });
        overlays.append()
    });

    // MAP CONTROLS
    var layer_control = L.control.layers(overlays);
    layer_control.addTo(map);

    var map_scale = L.control.scale();
    map_scale.addTo(map);

    // READ ACTIVE LAYER
    //TODO: is this now even necessairy and if so why not use $(ajax)
    map.on('baselayerchange', function (e) {

//  	document.getElementById("current_layer").value = e.name;
        var active_layer = e.name;
        if (active_layer == "") {
            document.getElementById("txtHint").innerHTML="";
            return;
        }
        if (window.XMLHttpRequest) {  // code for IE7+, Firefox, Chrome, Opera, Safari
            xmlhttp=new XMLHttpRequest();
        } else {  // code for IE6, IE5
            xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
        }
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState==4 && xmlhttp.status==200) {
                document.getElementById("txtHint").innerHTML=xmlhttp.responseText;
            }
        }
        xmlhttp.open("GET","ajax_layer.php?current_layer=" + active_layer,true);
        xmlhttp.send();
    });

    // READ CURRENT CENTER AND ZOOM LEVEL
    //TODO: same here: is this even necessairy
    map.on('moveend', function() {

        var latlngzoom = map.getCenter().lat + " " + map.getCenter().lng +  " "  + map.getZoom();
        var xmlhttp;
        if (latlngzoom=="") {
            document.getElementById("txtHint").innerHTML="";
            return;
        }
        if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
            xmlhttp=new XMLHttpRequest();
        } else {// code for IE6, IE5
            xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
        }
        xmlhttp.onreadystatechange=function() {
            if (xmlhttp.readyState==4 && xmlhttp.status==200) {
                document.getElementById("txtHint").innerHTML=xmlhttp.responseText;
            }
        }
        xmlhttp.open("GET","ajax_view.php?current_view=" + latlngzoom, true);
        xmlhttp.send();
    });

    // ADD CLICK FUNCTION
    //TODO: add it only if edit permissions are granted
    newMarkerGroup = new L.LayerGroup();
    map.on('click', function(e){

        var newMarker = new L.marker(e.latlng).addTo(map);  //TODO: add to new Group or existing Group
        //TODO: make pois only for now but we have to consider polygons, lines and selections of lines and polygons
        window.open("poi_add.php?lat_lon="+ e.latlng.lat + " " + e.latlng.lng  , "_top");
    });

});

//
function addDataToMap(data, layergroup) {
    var dataLayer = L.geoJson(data, {
        style: function(feature) {
            return {
                color: "#"+ feature.properties.color
            };
        },

        pointToLayer: function(feature, latlng) {
            var iconSize = Math.round (feature.properties.size/1);
            var smallIcon = L.icon({
                iconUrl: "images_dyn/symbol_svg_ID.php?ID="+ feature.properties.symbol + "&C=" + feature.properties.color + "&shadow=0.5",
                iconSize:     [iconSize, iconSize], // size of the icon
                iconAnchor:   [iconSize/2, iconSize/2], // point of the icon which will correspond to marker's location
                popupAnchor:  [0, -1 * (iconSize/2)] // point from which the popup should open relative to the iconAnchor
            });
            return new L.Marker(latlng, {icon: smallIcon, opacity: 0.85});
        },

        onEachFeature: function(feature, layer) {
            var popupText = "<a href='poi_add.php?ID=" + feature.properties.id + "'><img src='images/app_symbols_svg/favorite.svg' style='width:15px;height:15px;' /></a>"
                + "<br><h2><a href='poi_info.php?ID=" + feature.properties.id + "'>" + feature.properties.name + "</a></h2>"
                +  urlify(feature.properties.popupContent);
            layer.bindPopup(popupText);
        }
    });
    dataLayer.addTo(layergroup);
}


function geoJson2heat(geojson, intensity) {
    return geojson.features.map(function(feature) {
        return [
            feature.geometry.coordinates[0][1],
            feature.geometry.coordinates[0][0],
            feature.properties[intensity]
        ];
    });
}