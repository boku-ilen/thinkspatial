var map, layerControl, legend, rawStatistics, statistics = {};

$(document).ready(function () {
    initLeaflet();

    $(document).on("click", "#map .legend-tabs span", updateLegend);
});

function countUnique(data) {
    var counts = {};

    $.each(data, function (i, values) {
        if (counts[values[0]]) {
            if (counts[values[0]][values[1]]) {
                counts[values[0]][values[1]]++;
            } else {
                counts[values[0]][values[1]] = 1;
            }
        } else {
            counts[values[0]] = {};
            counts[values[0]][values[1]] = 1;
        }
    });

    return counts;
}

function getLayerbyID(id) {
    var layerName = layers[id].name;
    try {
        var layer = layerControl._layers.filter(function (layer) {
            return layer.name === layerName && layer.overlay;
        })[0].layer;
        return layer;
    } catch (e) {
        return L.layerGroup();
    }
}

function getLayers() {
    var i = 1;
    $.each(layers, function (id, layer) {
        $.ajax(root_url + "ajax/" + id + "/layer.json", {
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
                if (layer.hasStatistics) {
                    $.each(data.stats, function (i, stat) {
                        if (i === 0) {
                            statistics[layer.name] = [];
                        }
                        statistics[layer.name].push({"options": stat.options, "values": countUnique(stat.values)});
                    });
                }
                initGeoJSON(layer, data.geometry);
                if (i === Object.keys(layers).length) {
                    initLegend();
                    $(".disclaimer-modal").hide();
                } else {
                    i++;
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                if (i === Object.keys(layers).length) {
                    initLegend();
                    $(".disclaimer-modal").hide();
                } else {
                    i++;
                }
            }
        });
    });
}

function getStyle(layer) {
    var style = $.extend(true, {}, layer.options);
    delete style.attribution;
    delete style.bubblingMouseEvents;
    delete style.interactive;
    delete style.onEachFeature;
    delete style.pane;
    delete style.pointToLayer;

    return style;
}

function initLeaflet() {
    map = L.map('map', {
        center: map_center,
        zoom: zoom_default,
        minZoom: zoom_min,
        maxZoom: zoom_max,
        renderer: L.canvas(),
        attributionControl: false
    });

    initLayerControl();

    getLayers();
}

function initGeoJSON(layer, data) {
    var geojson = L.geoJson(data, {
        pointToLayer: function (feature, latlng) {
            var iconSize = Math.round(feature.properties.size / 1);
            var smallIcon = L.icon({
                iconUrl: root_url + "images_dyn/symbol_svg_ID.php?ID=" + feature.properties.symbol + "&C=" + feature.properties.color + "&shadow=0.5",
                iconSize: [iconSize, iconSize], // size of the icon
                iconAnchor: [iconSize / 2, iconSize / 2], // point of the icon which will correspond to marker's location
                popupAnchor: [0, -1 * (iconSize / 2)] // point from which the popup should open relative to the iconAnchor
            });
            return new L.Marker(latlng, {icon: smallIcon, opacity: 0.85});
        },

        onEachFeature: function (f, l) {
            //var popupText = "" + f.properties.crit_oek;
            //l.bindPopup(popupText);

            if (layer.hasStatistics) {
                var stats = statistics[layer.name];
                l.on("mouseover", function () {
                    console.log(stats);
                    console.log(stats[0].values[f.properties[stats[0].options.selection]]);
                });
            }
        }
    }).addTo(map);

    layerControl.addOverlay(geojson, layer.name);

    //map.fitBounds(geojson.getBounds());
}

function initLayerControl() {
    layerControl = L.control.layers(basemaps, null, {
        hideSingleBase: true,
        collapsed: false
    }).addTo(map);

    // add default basemap to map and add all defined basemaps to the layer control widget
    if (Object.keys(basemaps).length > 0) {
        basemaps[Object.keys(basemaps)[0]].addTo(map);
    }
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

    initDefaultViews();
}

function initDefaultViews() {
    $.each(views, function (i, view) {
        if (view.defaultView && view.visible) {
            $(".legend-tabs span[data-id=" + i + "]").click();
        } else if (view.defaultView && !view.visible) {
            updateStyles(getLayerbyID(view.layer), view.type, view.attribute, view.signatures, 0);
        }
    });
}

function rem2px(rem) {
    return parseInt(window.getComputedStyle(document.documentElement)["font-size"]) * rem;
}

function resetStroke() {
    stroke = Array.apply(null, Array(Object.keys(layer._layers).length)).map(function () {
        return true;
    });
}

function updateLegend() {
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
            var svg = d3.select(".legend-container:last-child div.signature:last-child").insert("svg", ":first-child").attr("width", rem2px(4)).attr("height", rem2px(2)).attr("viewBox", "0 0 32 16");
            svg.append("line").attr("x1", 0).attr("x2", 32).attr("y1", 8).attr("y2", 8).attr("stroke-width", signature.weight).attr("stroke", signature.color);
        });

        updateStyles(getLayerbyID(view.layer), view.type, view.attribute, view.signatures, i);
    });
}

function updateStyles(layer, type, attribute, signatures, i) {
    layer.eachLayer(function (l) {
        var props = l.feature.properties, style = {};
        var layerSignatures = signatures.filter(function (sig) {
            if (typeof sig.values[0] === "string") {
                return sig.values.indexOf(props[attribute]) > -1;
            } else if (typeof sig.values[0] === "number") {
                if (sig.values.length === 1) {
                    return sig.values[0] === Number(props[attribute]);
                } else {
                    return sig.values[0] <= Number(props[attribute]) && Number(props[attribute]) <= sig.values[1];
                }
            }
        });

        if (layerSignatures.length > 0) {
            $.each(layerSignatures, function (j, signature) {
                if ([1, 4, 5, 7, 9, 12, 13, 15].indexOf(type) >= 0) {
                    style.color = signature.color;
                    if (typeof signature.opacity !== "undefined") {
                        style.opacity = signature.opacity;
                    }
                }

                if ([2, 4, 6, 7, 10, 12, 14, 15].indexOf(type) >= 0) {
                    style.weight = signature.weight;
                }

                if ([3, 5, 6, 7, 11, 13, 14, 15].indexOf(type) >= 0) {
                    style["dash-array"] = signature.dashArray;
                }

                if ([8, 9, 10, 11, 12, 13, 14, 15].indexOf(type) >= 0) {
                    style.fillColor = signature.fillColor;
                    if (typeof signature.fillOpacity !== "undefined") {
                        style.fillOpacity = signature.fillOpacity;
                    }
                }

                if (i === 0) {
                    style.stroke = true;
                } else {
                    style.stroke = l.options.stroke && true;
                }

                if (j === 0) {
                    l.setStyle(style);
                } else if (signature.hover) {
                    l.on("mouseover", function () {
                        var originalStyle = getStyle(l);
                        l.setStyle(style);

                        l.on("mouseout", function () {
                            l.setStyle(originalStyle);
                        });
                    });
                }
            });
        } else {
            l.setStyle({stroke: false});
        }
    });
}