var map, layerControl, leafletLayers = {}, legend, rawStatistics, statistics = {}, layerClicked = false;

$(document).ready(function () {
    initLeaflet();

    $(document).on("click", "#map .legend-tabs span", updateLegend);

    $(document).on("change", "#map .legend input", updateVisibleLayers);
});

var initStackedBarChart = {
    create: function (statistic, key) {
        var self = this, data = statistic.values[key], sum = 0,
                signatures = views[statistic.options.view].signatures;
        $.each(Object.values(data), function (i, x) {
            sum += x;
        });

        var dataArray = $.map(data, function (val, i) {
            var object = {};
            object[i] = val;
            return [[i, val]];
        });

        var width = $(".legend-container .signature").width();
        /*var svg = d3.select(".legend-container").append("svg")
         .attr("width", width).attr("height", rem2px(2)).append("g");*/
        var xScale = d3.scaleLinear().range([0, width]).domain([0, sum]);

        var div = d3.select(".legend").insert("div", ".legend-container").attr("class", "stackedChart")
                .style("width", width + "px").style("height", rem2px(1) + "px");

        var xPos = 0;
        var layer = div.selectAll("div").data(dataArray).enter().append("div")
                /*.attr("x", function (d) {
                 var x = xScale(xPos);
                 xPos += d[1];
                 return x;
                 }).attr("y", 0)*/
                .style("width", function (d) {
                    return xScale(d[1]) + "px";
                }).style("height", rem2px(1) + "px")
                .style("background-color", function (d) {
                    var signature = self.getSignature(d[0], signatures);
                    return signature.color;
                }).text(function (d) {
            if (statistic.options.absolute) {
                return d[1];
            } else {
                return Math.round(d[1] / sum * 100 * 100) / 100 + "%";
            }
        });
    },
    getSignature: function (value, signatures) {
        return signatures.filter(function (sig) {
            if (typeof sig.values[0] === "string") {
                return sig.values.indexOf(value) > -1;
            } else if (typeof sig.values[0] === "number") {
                if (sig.values.length === 1) {
                    return sig.values[0] === Number(value);
                } else {
                    return sig.values[0] <= Number(value) && Number(value) <= sig.values[1];
                }
            }
        })[0];
    },
    removeCharts: function () {
        $(".legend > div.stackedChart").remove();
    }
};

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
                leafletLayers[id] = initGeoJSON(layer, data.geometry);

                var _views = getViewsByLayerId(id), len = _views.length, j = 0;

                for (j; j < len; j++) {
                    if (_views[j].visibility !== 3) {
                        leafletLayers[id].addTo(map);
                        //layerControl.addOverlay(leafletLayers[id], layer.name);
                        break;
                    }
                }

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

function getViewsByLayerId(layer) {
    var layerViews = [];

    $.each(Object.keys(layer_views[layer]), function (i, viewId) {
        layerViews.push(views[viewId]);
    });

    return layerViews;
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
    return L.geoJson(data, {
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
            if (layer.hasStatistics) {
                var stats = statistics[layer.name];
                l.on("mouseover", function () {
                    if (!layerClicked && $("div.legend-tabs [data-id=" + stats[0].options.view + "]").hasClass("active")) {
                        initStackedBarChart.create(stats[0], f.properties[stats[0].options.selection]);

                        l.on("mouseout", function () {
                            if (!layerClicked)
                                initStackedBarChart.removeCharts();
                        });
                    }
                });
            }
        }
    });

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
            if ([1, 2].indexOf(view.visibility) >= 0)
                $div.find(".legend-tabs").append($("<span>").text(view.name).attr("data-id", i));
        });

        return this._div;
    };

    legend.addTo(map);

    initDefaultViews();
}

function initDefaultViews() {
    $.each(views, function (i, view) {
        if (view.defaultView && [1, 2].indexOf(view.visibility) >= 0) {
            $(".legend-tabs span[data-id=" + i + "]").click();
        } else if (view.defaultView && [0, 3].indexOf(view.visibility) >= 0) {
            updateStyles(i, view.type, view.signatures, 0);
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

    $.each(views, function (i, view) {
        if (view.visibility === 3)
            _views.push(view);
    });

    $("div.legend-tabs .active").removeClass("active");
    $(this).addClass("active");

    var $inputs = $("div.legend-container input").clone();

    $("div.legend-tabs").nextAll().remove();

    $.each(_views, function (i, view) {
        $legendContainer = $("<div>").addClass("legend-container");
        if (i > 0) {
            $legendContainer.append($("<span>").text(view.name));
        }

        if (view.visibility !== 3) {
            $.each(view.signatures, function (i, signature) {
                $key = $("<div>").addClass("signature").append($("<span>").html(signature.label));
                $legendContainer.append($key);
                $(".legend").append($legendContainer);
                var svg = d3.select(".legend-container:last-child div.signature:last-child").insert("svg", ":first-child").attr("width", rem2px(4)).attr("height", rem2px(2)).attr("viewBox", "0 0 32 16");
                svg.append("line").attr("x1", 0).attr("x2", 32).attr("y1", 8).attr("y2", 8).attr("stroke-width", signature.weight).attr("stroke", signature.color);
            });

            updateStyles(view.id, view.type, view.signatures, i);
        } else {
            $.each(layer_views, function (i, layer_view) {
                if (Object.keys(layer_view).indexOf(view.id.toString()) >= 0) {
                    $div = $("<div>");
                    $div.append($("<input>").attr("type", "radio").attr("name", view.id).val(i));
                    $div.append($("<span>").text(layers[i].name));
                    $div.appendTo($legendContainer);
                }
            });
            
            $(".legend").append($legendContainer);
            
            $selected = $inputs.find("[name=" + view.id + "]:checked");
            if ($selected.length === 1) {
                $legendContainer.find("[name=" + view.id + "][value= " + $selected.val() + "]").prop("checked", true);
            } else {
                $legendContainer.find("[name=" + view.id + "]").first().prop("checked", true).change();//
            }
        }
    });
}

function updateStyles(view, type, signatures, i) {
    $.each(layer_views, function (layerId, layer_view) {
        if (typeof layer_view[view] !== "undefined") {
            var layer = leafletLayers[layerId];
            var attribute = layer_view[view].attribute;

            layer.eachLayer(function (l) {
                var props = l.feature.properties, style = {};
                var layerSignatures = signatures.filter(function (sig) {
                    if (sig.values[0] === "*")
                        return true;
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
                            var originalStyle = getStyle(l);
                            l.on("mouseover", function () {
                                if (!layerClicked)
                                    l.setStyle(style);

                                l.on("click", function () {
                                    layerClicked = !layerClicked;
                                });

                                l.on("mouseout", function () {
                                    if (!layerClicked)
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
    });
}

function updateVisibleLayers() {
    var $this = $(this), viewId = parseInt($this.attr("name")), layerId = parseInt($this.val());

    $.each(leafletLayers, function (i, layer) {
        if (map.hasLayer(layer) && Object.keys(layer_views[i]).indexOf(viewId.toString()) >= 0) {
            layer.removeFrom(map);
        }
    });

    leafletLayers[layerId].addTo(map);
}