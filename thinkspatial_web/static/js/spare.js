var map, layerControl, leafletLayers = {}, legend, rawStatistics, statistics = {}, layerClicked = false;

$(document).ready(function () {
    initLeaflet();
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

        var width = $(".legend-container").innerWidth();
        var xScale = d3.scaleLinear().range([0, width]).domain([0, sum]);

        var div = d3.select("div.legend div.legend-container[data-view='" + statistic.options.view + "']").insert("div", "div.signatures").attr("class", "stackedChart")
                .style("width", width + "px").style("height", rem2px(1) + "px");

        var xPos = 0;
        var layer = div.selectAll("div").data(dataArray).enter().append("div")
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
        $("div.legend div.stackedChart").remove();
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
                    legend = new Legend();
                    $(".disclaimer-modal").hide();
                } else {
                    i++;
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                if (i === Object.keys(layers).length) {
                    legend = new Legend();
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
                    if (!layerClicked) {
                        $.each(stats, function (i, statistic) {
                            if (statistic.options.view === legend.selectedView) {
                                initStackedBarChart.create(statistic, f.properties[statistic.options.selection]);

                                l.on("mouseout", function () {
                                    if (!layerClicked)
                                        initStackedBarChart.removeCharts();
                                });
                            }
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

function rem2px(rem) {
    return parseInt(window.getComputedStyle(document.documentElement)["font-size"]) * rem;
}

function resetStroke() {
    stroke = Array.apply(null, Array(Object.keys(layer._layers).length)).map(function () {
        return true;
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

/*
 * Legend-Class (ES5)
 */

function Legend() {
    //add overlay to map

    var control = L.control({position: "bottomright"});
    control.onAdd = function () {
        return L.DomUtil.create("div", "legend");
    };
    control.addTo(map);

    this.$legend = $("div.legend");
    this.$inputs;
    this.selectedView;
    this.views;

    this.init();
}
;

Legend.prototype.constructor = Legend;

Legend.prototype.init = function () {
    //add tab for every view of type 1

    this.$legend.append($("<div>").addClass("legend-tabs"));
    var _self = this;

    $.each(views, function (i, view) {
        if ([1, 2].indexOf(view.visibility) >= 0) {
            _self.$legend.children("div.legend-tabs").append($("<span>").text(view.name).attr("data-view", i));
        }
    });

    this.$legend.on("click", "div.legend-tabs span", function () {
        _self.$legend.find("span.active").removeClass("active");
        $(this).addClass("active");

        _self.selectedView = $(this).data("view");
        _self.update();
    });

    this.$legend.find("div.legend-tabs span").first().click();
};

Legend.prototype.addViewSignatures = function (view) {
    var $container = $("<div>").addClass("legend-container").attr("data-view", view.id);
    $container.append($("<span>").text(view.name));
    $container.append($("<div>").addClass("signatures"));

    $.each(view.signatures, function (i, signature) {
        var $signature = $("<div>").addClass("signature");
        $signature.append(signature.svg, $("<span>").text(signature.label));
        $signature.appendTo($container.find(".signatures"));
    });

    this.$legend.append($container);
};

Legend.prototype.addViewRadioButtons = function (view) {
    var $container = $("<div>").addClass("legend-container");
    $container.append($("<span>").text(view.name));

    $.each(layer_views, function (i, layer_view) {
        if (Object.keys(layer_view).indexOf(view.id.toString()) >= 0) {
            $div = $("<div>");
            $div.append($("<input>").attr("type", "radio").attr("name", view.id).val(i));
            $div.append($("<span>").text(layers[i].name));
            $div.appendTo($container);
        }
    });

    $(".legend").append($container);
    $container.on("change", "input", updateVisibleLayers);

    var $selected = this.$inputs.find("[name=" + view.id + "]:checked");
    if ($selected.length === 1) {
        $container.find("[name=" + view.id + "][value= " + $selected.val() + "]").prop("checked", true);
    } else {
        $container.find("[name=" + view.id + "]").first().prop("checked", true).change();//
    }

    this.$legend.append($container);
};

Legend.prototype.clear = function () {
    this.$legend.children("div.legend-tabs").nextAll().remove();
};

Legend.prototype.update = function () {
    this.updateViews();
    var _self = this;

    this.$inputs = this.$legend.find("input").clone();
    this.clear();

    $.each(this.views, function (i, view) {
        switch (view.visibility) {
            case 0:
            case 1:
            case 2:
                _self.addViewSignatures(view);
                break;
            case 3:
                _self.addViewRadioButtons(view);
                break;
        }
    });
};

Legend.prototype.updateViews = function () {
    this.views = [];
    var viewId = this.selectedView;
    var _self = this, j = 0;

    $.each(views, function (i, view) {
        if (view.id === viewId ||
                (_self.views[0] && _self.views[0].concurrents.indexOf(view.id) >= 0) ||
                [3, 4].indexOf(view.visibility) >= 0) {
            updateStyles(view.id, view.type, view.signatures, j);
            _self.views.push(view);
            j++;
        }
    });
};

/*
 * Statistic-Class (ES5)
 */

var Statistic = function () {

};

Statistic.prototype.init = function () {

};

Statistic.prototype.filter = function () {

};