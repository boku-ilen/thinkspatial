
function MM_openBrWindow(theURL,winName,features) { //v2.0
    window.open(theURL,winName,features);
}


function DivShowHide(divName){
    //Gibt es das Objekt mit dem Namen der in divName übergeben wurde?
    /*"Sichtbarkeit" des Divs umschalten.
      Wenn es sichtbar war, unsichtbar machen und umgedreht.*/
    if(document.getElementById(divName)){ document.getElementById(divName).style.display = (document.getElementById(divName).style.display == 'none') ? 'inline' : 'none'; }
}


$("#cluster").click(function () {
    var cb=document.getElementById('cluster');
    if (cb.checked) {
        var post_val = 1;
    } else {
        var post_val = 0;
    }

//	alert(post_val);
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
        afterClose: function () { // USE THIS IT IS YOUR ANSWER THE KEY WORD IS "afterClose"
            parent.location.reload(true);
        }
    });
});


function urlify(text) {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
        return '<a href="' + url + '">' + url + '</a>';
    })
    // or alternatively
    // return text.replace(urlRegex, '<a href="$1">$1</a>')
}


$(document).ready(function() {
    var map = L.map('map', {
        center: [48.24309603325723, 16.379048824310306],
        zoom: 15,
        minZoom: 3,
        maxZoom: 21	//	layers: [grayscale, cities]
    });

    var points = new L.LayerGroup();
    var overlays = {
        "Punkte": points,
//		"WMS Beispiel": wms2
    };

// BASEMAPS
    var osm_mapnik = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png?{foo}', {foo: 'bar', maxZoom: 21, });

    var osm_tone = new L.StamenTileLayer("toner");
    var osm_water = new L.StamenTileLayer("watercolor");
    var osm_tonelabels = new L.StamenTileLayer("toner-labels");
    var osm_terrain = new L.StamenTileLayer("terrain");

    var mapLink = '<a href="http://www.esri.com/">Esri</a>';
    var wholink = 'i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
    var esriUrl = 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    var esri = L.tileLayer(esriUrl, {
        attribution: '&copy; '+mapLink+', '+wholink,
        maxZoom: 21,
    });

    var cartoLightAttr = 'Map tiles by <a href="https://carto.com">Carto</a>, under CC BY 3.0. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under ODbL.';
    var cartoLightUrl = 'http://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
    var osm_light = L.tileLayer(cartoLightUrl, {
        attribution: cartoLightAttr,
        maxZoom: 21,
    });

    var cartoDarkAttr = 'Map tiles by <a href="https://carto.com">Carto</a>, under CC BY 3.0. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under ODbL.';
    var cartoDarkUrl = 'http://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
    var osm_dark = L.tileLayer(cartoDarkUrl, {
        attribution: cartoDarkAttr,
        maxZoom: 21,
    });

    var google_map = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{
        maxZoom: 21,
        subdomains:['mt0','mt1','mt2','mt3']
    });

    var google_hyb = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',{
        maxZoom: 21,
        subdomains:['mt0','mt1','mt2','mt3']
    });

    var google_sat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
        maxZoom: 21,
        subdomains:['mt0','mt1','mt2','mt3']
    });

    var google_phy = L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',{
        maxZoom: 21,
        subdomains:['mt0','mt1','mt2','mt3']
    });

    var google_trans =  L.tileLayer('', {maxZoom: 21});

    osm_dark.addTo(map);
    var baseLayers = {
        "Open Street Map in dunkler Darstellung": osm_dark,
        "Open Street Map in heller Darstellung": osm_light,
        "Luftbild (ESRI)": esri,
        "Google Satellitenkarte": google_sat,
        "Google Hybridkarte": google_hyb,
        "Google Physische Karte": google_phy,
        "Google Strassenkarte": google_map,
        "Hintergrundkarte ausblenden": google_trans,
    };

    var wms = L.tileLayer.wms("http://sedac.ciesin.columbia.edu/geoserver/wms", {

        layers: 'ipcc-synthetic-vulnerability-climate-2005-2050-2100',
        format: 'image/png',
        version: '1.1.0',
        transparent: true,
        attribution: "",
        tiled:true
    })//.addTo(map);

    //uri = "http://maps.kartoza.com/cgi-bin/qgis_mapserv.fcgi?";
    //uri += "map=/web/Boosmansbos/Boosmansbos.qgs&";
    //uri += "&SERVICE=WMS&VERSION=1.3.0&SLD_VERSION=1.1.0&";
    //uri += "REQUEST=GetLegendGraphic&FORMAT=image/jpeg&LAYER=Boosmansbos&STYLE=";
    //uri = "http://data.wien.gv.at/daten/geo?REQUEST=GetLegendGraphic&VERSION=1.3.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=ogdwien:BAUBLOCKOGD";

    uri_legend = "http://sedac.ciesin.columbia.edu/geoserver/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=ipcc-synthetic-vulnerability-climate-2005-2050-2100";

    //L.wmsLegend(uri_legend);
    var markers = L.markerClusterGroup();

    // MAP CONTROLS
    var layer_control = L.control.layers(baseLayers, overlays);
    layer_control.addTo(map);

    var map_scale = L.control.scale();
    map_scale.addTo(map);

    // READ ACTIVE LAYER
    map.on('baselayerchange', function (e) {

//  	document.getElementById("current_layer").value = e.name;
//    console.log(e.name);
//    alert (e.name);
        var active_layer = e.name;
        if (active_layer=="")
        {
            document.getElementById("txtHint").innerHTML="";
            return;
        }
        if (window.XMLHttpRequest)
        {// code for IE7+, Firefox, Chrome, Opera, Safari
            xmlhttp=new XMLHttpRequest();
        }
        else
        {// code for IE6, IE5
            xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
        }
        xmlhttp.onreadystatechange=function()
        {
            if (xmlhttp.readyState==4 && xmlhttp.status==200)
            {
                document.getElementById("txtHint").innerHTML=xmlhttp.responseText;
            }
        }
        xmlhttp.open("GET","ajax_layer.php?current_layer=" + active_layer,true);
        xmlhttp.send();
    });

    // READ CURRENT CENTER AND ZOOM LEVEL
    map.on('moveend', function() {

        document.getElementById("current_view").value = map.getCenter().lat + " " + map.getCenter().lng +  " "  + map.getZoom();
        var latlngzoom = map.getCenter().lat + " " + map.getCenter().lng +  " "  + map.getZoom();

        //	document.getElementById("current_zoom").value = map.getZoom();
        var xmlhttp;
        if (latlngzoom=="")
        {
            document.getElementById("txtHint").innerHTML="";
            return;
        }
        if (window.XMLHttpRequest)
        {// code for IE7+, Firefox, Chrome, Opera, Safari
            xmlhttp=new XMLHttpRequest();
        }
        else
        {// code for IE6, IE5
            xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
        }
        xmlhttp.onreadystatechange=function()
        {
            if (xmlhttp.readyState==4 && xmlhttp.status==200)
            {
                document.getElementById("txtHint").innerHTML=xmlhttp.responseText;
            }
        }
        xmlhttp.open("GET","ajax_view.php?current_view=" + latlngzoom,true);
        xmlhttp.send();
    });

    // ADD CLICK FUNCTION
    newMarkerGroup = new L.LayerGroup();
    map.on('click', function(e){

        var newMarker = new L.marker(e.latlng).addTo(map);
        window.open("poi_add.php?lat_lon="+ e.latlng.lat + " " + e.latlng.lng  , "_top");
    });

    $.getJSON("leaflet_pois_get.php", function(data) { addDataToMap(data, map); });

});


function addDataToMap(data, map) {
    var dataLayer = L.geoJson(data, {
        style: function(feature) {
            return {color: "#"+ feature.properties.color
            };

        },
        pointToLayer: function(feature, latlng) {
            var rnd = Math.floor((Math.random() * 10) + 1);
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
            var popupText = "<a href='http://thinkspatial.boku.ac.at/app/poi_add.php?ID=" + feature.properties.id + "'><img src='images/app_symbols_svg/favorite.svg' style='width:15px;height:15px;' /></a>"
                + "<br><h2><a href='http://thinkspatial.boku.ac.at/app/poi_info.php?ID=" + feature.properties.id + "'>" + feature.properties.name + "</a></h2>"
                +  urlify(feature.properties.popupContent);
            layer.bindPopup(popupText); }
    });
    dataLayer.addTo(markers);
    markers.addTo(map);
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