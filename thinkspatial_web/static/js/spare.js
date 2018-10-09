var map, overlays = {}, layer_control, legend, geojson;

$(document).ready(function () {
    initLeaflet();

    $(document).on("click", "#map .legend-tabs span", updateLegend);
});

function initLeaflet() {
    map = L.map('map', {
        center: map_center,
        zoom: zoom_default,
        minZoom: zoom_min,
        maxZoom: zoom_max,
        renderer: L.canvas()
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
    getLayers();

    // MAP CONTROLS
    if (layers.length > 1) {
        layer_control = L.control.layers(overlays);
        layer_control.addTo(map);
    }

    /*
     // ADD CLICK FUNCTION
     //TODO: add it only if edit permissions are granted
     newMarkerGroup = new L.LayerGroup();
     map.on('click', function(e){
     
     var newMarker = new L.marker(e.latlng).addTo(map);  //TODO: add to new Group or existing Group
     //TODO: make pois only for now but we have to consider polygons, lines and selections of lines and polygons
     window.open("poi_add.php?lat_lon="+ e.latlng.lat + " " + e.latlng.lng  , "_top");
     });*/
}

function initGeoJSON(data) {
    geojson = L.geoJson(data, {
        pointToLayer: function (feature, latlng) {
            var iconSize = Math.round(feature.properties.size / 1);
            var smallIcon = L.icon({
                iconUrl: "images_dyn/symbol_svg_ID.php?ID=" + feature.properties.symbol + "&C=" + feature.properties.color + "&shadow=0.5",
                iconSize: [iconSize, iconSize], // size of the icon
                iconAnchor: [iconSize / 2, iconSize / 2], // point of the icon which will correspond to marker's location
                popupAnchor: [0, -1 * (iconSize / 2)] // point from which the popup should open relative to the iconAnchor
            });
            return new L.Marker(latlng, {icon: smallIcon, opacity: 0.85});
        },

        onEachFeature: function (feature, layer) {
            var popupText = "" + feature.properties.crit_oek;
            layer.bindPopup(popupText);
        }
    }).addTo(map);

    map.fitBounds(geojson.getBounds());
    initLegend();
}

function initLegend() {
    legend = L.control({position: "bottomright"});

    legend.onAdd = function (map) {
        this._div = L.DomUtil.create("div", "legend");
        this._div.innerHTML = "<div class='legend-tabs'></div><div class='legend-container'></div>";
        var $div = $(this._div);

        $.each(views, function (i, view) {
            if (view.visible)
                $div.find(".legend-tabs").append($("<span>").text(view.name).attr("data-id", i));
        });

        return this._div;
    };

    legend.addTo(map);
    
    $("div.legend div.legend-tabs span").first().click();
}

function updateLegend(e) {
    var _views = [views[$(this).data("id")]];

    $.each(_views[0].concurrents, function (i, id) {
        _views.push(views[id]);
    });

    $("div.legend-tabs .active").removeClass("active");
    $(this).addClass("active");

    $("div.legend-tabs").nextAll().remove();

    $.each(_views, function (i, view) {

        $legendContainer = $("<div>").addClass("legend-container");
        if (i > 0) {
            $legendContainer.append($("<span>").text(view.name));
        }

        $.each(view.signatures, function (i, signature) {
            $key = $("<div>").addClass("signature").append($("<span>").html(signature.label));
            $legendContainer.append($key);
            $(".legend").append($legendContainer);
            var svg = d3.select(".legend-container:last-child div.signature:last-child").insert("svg", ":first-child").attr("width", "4rem").attr("height", "2rem").attr("viewBox", "0 0 32 16");
            svg.append("line").attr("x1", 0).attr("x2", 32).attr("y1", 8).attr("y2", 8).attr("stroke-width", signature.weight).attr("stroke", signature.color);
        });

        updateStyles(view.type, view.attribute, view.signatures);
    });
}

function updateStyles(type, attribute, signatures) {
    geojson.eachLayer(function (l) {
        var props = l.feature.properties, style = {};
        var signature = signatures.filter(function (sig) {
            if (typeof sig.values[0] === "string") {
                return sig.values.indexOf(props[attribute]) > -1;
            } else if (typeof sig.values[0] === "number") {
                if (sig.values.length === 1) {
                    //console.log(sig.values);
                    return sig.values.indexOf(Number(props[attribute])) > -1;
                } else {
                    return sig.values[0] <= Number(props[attribute]) && Number(props[attribute]) <= sig.values[1];
                }
            }
        })[0];

        if (signature) {
            switch (type) {
                case 1:
                    style.color = signature.color;
                    break;
                case 2:
                    style.weight = signature.weight;
                    break;
                case 3:
                    style["dash-array"] = signature.dashArray;
                    break;
                case 4:
                    style.color = signature.color;
                    style.weight = signature.weight;
                    break;
                case 5:
                    style.color = signature.color;
                    style["dash-array"] = signature.dashArray;
                    break;
                case 6:
                    style.weight = signature.weight;
                    style["dash-array"] = signature.dashArray;
                    break;
                case 7:
                    style.color = signature.color;
                    style.weight = signature.weight;
                    style["dash-array"] = signature.dashArray;
                    break;
            }
            l.setStyle(style);
        } else {
            l.setStyle({stroke: false});
        }

    });
}

function getLayers() {
    layers.forEach(function (layer) {
        $.ajax("/ajax/" + layer.id + "/layer.geojson", {
            xhr: function () {
                var xhr = new XMLHttpRequest();
                var progress = setInterval(function () {
                    if ($("progress").val() <= 50) {
                        $("progress").val($("progress").val() + 0.5);
                    }
                }, 500);

                xhr.addEventListener("progress", function (e) {
                    clearInterval(progress);
                    $("progress").val(50 + e.loaded / e.total / 2 * 100);
                }, false);

                return xhr;
            },
            method: "get",
            dataType: "json",
            success: function (data) {
                initGeoJSON(data);
                $(".disclaimer-modal").hide();
            }
        });
    });
}

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