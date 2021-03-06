var map, layerControl, leafletLayers = {}, legend, info, rawStatistics, statistics = {}, clickedLayer = null;

$(document).ready(function () {
    initLeaflet();

    $(window).on("resize", function () {
        if (legend)
            updateStatistics(legend.$legend.find("input:checked").val(), null);
    });
});

var StackedBarChart = {
    create: function (statistic) {
        var self = this, sum = 0;

        statistic.filter();

        $.each(Object.values(statistic.filteredValues), function (i, x) {
            sum += x;
        });

        var dataArray = $.map(statistic.filteredValues, function (val, i) {
            var object = {};
            object[i] = val;
            return [[i, val]];
        });

        var width = $(".signatures").width();
        var xScale = d3.scaleLinear().range([0, width]).domain([0, sum]);

        var div = d3.select("div.legend div.legend-container[data-view='" + statistic.view + "']").insert("div", "div.signatures").attr("class", "stackedChart")
                .style("width", width + "px").style("height", rem2px(1) + "px");

        var xPos = 0;
        var layer = div.selectAll("div").data(dataArray).enter().append("div")
                .style("width", function (d) {
                    return xScale(d[1]) + "px";
                }).style("height", rem2px(1) + "px")
                .style("background-color", function (d) {
                    var signature = statistic.getSignatureForValue(d[0]);
                    return signature.color;
                }).text(function (d) {
            if (statistic.absolute) {
                return d[1];
            } else {
                return Math.round(d[1] / sum * 100 * 100) / 100 + "%";
            }
        });
    },
    removeCharts: function () {
        $("div.legend div.stackedChart").remove();
    }
};

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
                        statistics[layer.name].push(new Statistic(stat.options, stat.values));
                    });
                }
                leafletLayers[id] = initGeoJSON(data.geometry);

                var _views = getViewsByLayerId(id), len = _views.length, j = 0;

                if (len === 0) {
                    leafletLayers[id].addTo(map);
                }

                for (j; j < len; j++) {
                    if (_views[j].visibility !== 3) {
                        leafletLayers[id].addTo(map);
                        break;
                    }
                }

                if (i === Object.keys(layers).length) {
                    legend = new Legend();
                    legend.init();
                    if ($("button#closeDisclaimer").length >= 0) {
                        $("button#closeDisclaimer").prop("disabled", false);
                        $("button#closeDisclaimer").on("click", function () {
                            $(".disclaimer-modal").hide();
                        });
                    } else {
                        $(".disclaimer-modal").hide();
                    }
                } else {
                    i++;
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                if (i === Object.keys(layers).length) {
                    legend = new Legend();
                    legend.init();
                    if ($("button#closeDisclaimer").length >= 0) {
                        $("button#closeDisclaimer").prop("disabled", false);
                        $("button#closeDisclaimer").on("click", function () {
                            $(".disclaimer-modal").hide();
                        });
                    } else {
                        $(".disclaimer-modal").hide();
                    }
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

function getLayersByViewId(view) {
    var layers = [];

    $.each(layer_views, function (layer, views) {
        if (Object.keys(views).indexOf(view.toString()) >= 0) {
            layers.push(parseInt(layer));
        }
    });

    return layers;
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

    var fullScreenControl = L.control({position: "topright"});
    fullScreenControl.onAdd = function () {
        var div = L.DomUtil.create("div", "leaflet-bar fullScreenControl");
        var a = L.DomUtil.create("a", null, div);

        return div;
    };
    fullScreenControl.addTo(map);

    $("div.fullScreenControl a").on("click", function () {
        if ($(this).hasClass("off")) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            $(this).removeClass("off");
        } else {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            } else if (document.documentElement.mozRequestFullScreen) {
                document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.webkitRequestFullscreen) {
                document.documentElement.webkitRequestFullscreen();
            } else if (document.documentElement.msRequestFullscreen) {
                document.documentElement.msRequestFullscreen();
            }
            $(this).addClass("off");
        }
    });

    getLayers();
}

function initGeoJSON(data) {
    return L.geoJson(data, {
        pointToLayer: function (feature, latlng) {
            var iconSize = Math.round(feature.properties.size / 1);
            var smallIcon = L.icon({
                iconUrl: root_url + "images_dyn/" + feature.properties.symbol + "/" + feature.properties.color + "/symbol_svg_id.svg?shadow=0.5",
                iconSize: [iconSize, iconSize], // size of the icon
                iconAnchor: [iconSize / 2, iconSize / 2], // point of the icon which will correspond to marker's location
                popupAnchor: [0, -1 * (iconSize / 2)] // point from which the popup should open relative to the iconAnchor
            });
            return L.marker(latlng, {icon: smallIcon, opacity: 0.85});
        }
    });

    //map.fitBounds(geojson.getBounds());
}

function initLayerControl() {
    if (Object.keys(basemaps).length > 1) {
        layerControl = L.control.layers(basemaps, null, {
            hideSingleBase: true,
            collapsed: false
        }).addTo(map);
    }

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

function updateStatistics(layerId, layer) {
    var stats = statistics[layers[layerId].name];

    $.each(stats, function (i, statistic) {
        if (i === 0) {
            if (statistic.type === 1) {
                StackedBarChart.removeCharts();
            }
        }

        if (statistic.view === legend.selectedView ||
                views[legend.selectedView].concurrents.indexOf(statistic.view) >= 0 ||
                views[statistic.view].visibility === 5) {

            if (statistic.type === 1) {
                if (layer !== null && layer !== false) {
                    statistic.filterFeature = layer.feature;
                } else if (layer === false) {
                    statistic.filterFeature = null;
                }
                StackedBarChart.create(statistic);
            } else if (statistic.type === 2) {
                statistic.filter();
                
                $("div[data-view=" + statistic.view + "] div.key").each(function() {
                    if (Object.keys(statistic.filteredValues).indexOf($(this).data("value").toString()) >= 0) {
                        $(this).attr("data-count", statistic.filteredValues[$(this).data("value")]);
                    } else {
                        $(this).attr("data-count", 0);
                    }
                });
            }
        }
    });
}

function updateStyles(view, type, signatures, i) {
    if (views[view].type === 16)
        return;

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

                            var mouseover = function () {
                                l.setStyle(style);
                            };

                            var mouseout = function () {
                                if (clickedLayer !== l)
                                    l.setStyle(originalStyle);
                            };

                            l.off("mouseover", mouseover);
                            l.off("mouseout", mouseout);
                            l.off("click");

                            l.on("mouseover", mouseover);

                            l.on("click", function () {
                                if (clickedLayer === l) {
                                    clickedLayer = null;
                                    l.setStyle(originalStyle);
                                } else {
                                    if (clickedLayer) {
                                        clickedLayer.setStyle(originalStyle);
                                    }
                                    clickedLayer = l;
                                }

                                updateStatistics(layerId, clickedLayer ? l : false);
                            });

                            l.on("mouseout", mouseout);
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

    clickedLayer = null;
    leafletLayers[layerId].addTo(map);

    leafletLayers[Object.keys(layers)[0]].bringToFront();

    updateStatistics(layerId, null);

    if (info)
        info.update();
}

/*
 * Legend-Class (ES5)
 */

var Legend = function () {
    var control = L.control({position: "bottomright"});
    control.onAdd = function () {
        var div = L.DomUtil.create("div", "legend");
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);
        return div;
    };
    control.addTo(map);

    this.$legend = $("div.legend");
    this.$inputs;
    this.selectedView;
    this.views;
};

Legend.prototype.constructor = Legend;

Legend.prototype.init = function () {
    //add tab for every view of type 1

    this.$legend.append($("<div>").addClass("legend-tabs"));
    var _this = this;

    var tabViews = [];

    $.each(views, function (i, view) {
        if ([1, 2].indexOf(view.visibility) >= 0) {
            tabViews.push(view);
        }
    });

    tabViews.sort(function (a, b) {
        return a.legendTabSort - b.legendTabSort;
    });

    $.each(tabViews, function (i, view) {
        _this.$legend.children("div.legend-tabs").append($("<span>").text(view.name).attr("data-view", view.id));
    });

    this.$legend.on("click", "div.legend-tabs span", function () {
        _this.$legend.find("span.active").removeClass("active");
        $(this).addClass("active");

        _this.selectedView = $(this).data("view");
        _this.update();
    });

    this.$legend.find("div.legend-tabs span").first().click();

    info = new Info();
    info.update();
};

Legend.prototype.addViewSignatures = function (view) {
    var $container = $("<div>").addClass("legend-container").attr("data-view", view.id);
    $container.append($("<span>").text(view.name));
    $container.append($("<div>").addClass("signatures"));

    var filterStatistics = [], _this = this;

    $.each(statistics, function (layer, statistics) {
        $.each(statistics, function (i, statistic) {
            if (_this.views.indexOf(views[statistic.view]) >= 0 &&
                    statistic.filterViews.indexOf(view.id) >= 0) {
                filterStatistics.push(statistic);
            }
        });
    });

    $.each(view.signatures, function (i, signature) {
        var $signature = $("<div>").addClass("signature");
        $signature.append(signature.key);
        
        $signature.children().attr("data-value", signature.values[0]);

        var span = $("<span>").text(signature.label);

        if (filterStatistics.length > 0) {
            span.css("cursor", "pointer");

            span.on("click", function () {
                var $this = $(this);

                if ($this.hasClass("active")) {
                    $this.removeClass("active");
                } else {
                    var views = view.concurrents.concat([view.id]);
                    $.each(views, function (i, viewId) {
                        $("[data-view=" + viewId + "] span.active").click();
                    });
                    $this.addClass("active");
                }
            });

            $.each(filterStatistics, function (i, statistic) {
                span.on("click", function () {
                    if (statistic.filterViews[statistic.filterViewIndex] === view.id && statistic.filterValue === signature.values[0]) {
                        statistic.unsetFilterValue();
                    } else {
                        statistic.setFilterValue(signature.values[0], view.id);
                    }

                    if (statistic.selection) {
                        updateStatistics(_this.$legend.find("[name=" + statistic.selectionView + "]:checked").val(), null);
                    } else {
                        updateStatistics(getLayersByViewId(view.id)[0], null);
                    }
                });
            });
        }

        $signature.append(span);
        $signature.appendTo($container.find(".signatures"));
    });

    if ($container.find("div.key.size").length > 0) {
        var sizes = [], factor = 0;
        $container.find("div.key.size").each(function () {
            sizes.push($(this).data("value"));
        });

        sizes.sort(function (a, b) {
            return b - a;
        });
        factor = 24 / sizes[0];

        $container.find("div.key.size").each(function () {
            $(this).children("div").width($(this).data("value") * factor).height($(this).data("value") * factor);
        });
    }

    this.$legend.append($container);
    
    if ($container.find("div.key").length > 0) {
        $container.find(".signature span").first().click().click();
    }
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
        $container.find("[name=" + view.id + "]").first().prop("checked", true);
    }

    this.$legend.append($container);
};

Legend.prototype.clear = function () {
    this.$legend.children("div.legend-tabs").nextAll().remove();
};

Legend.prototype.update = function () {
    this.updateViews();
    var _this = this;

    this.$inputs = this.$legend.find("input").clone();
    this.clear();

    $.each(this.views, function (i, view) {
        switch (view.visibility) {
            case 0:
            case 1:
            case 2:
            case 5:
                _this.addViewSignatures(view);
                break;
            case 3:
                _this.addViewRadioButtons(view);
                break;
        }
    });

    this.$legend.find("input:checked").change();
};

Legend.prototype.updateViews = function () {
    var viewId = this.selectedView;
    this.views = [views[this.selectedView]];
    var _this = this, j = 0;

    $.each(views, function (i, view) {
        if (view.id === _this.selectedView ||
                _this.views[0].concurrents.indexOf(view.id) >= 0 ||
                [3, 4, 5].indexOf(view.visibility) >= 0) {
            updateStyles(view.id, view.type, view.signatures, j);
            if (view.id !== _this.selectedView)
                _this.views.push(view);
            j++;
        }
    });

    this.views.sort(function (a, b) {
        return a.legendOrder - b.legendOrder;
    });
};

/*
 * Statistic-Class (ES5)
 */

var Statistic = function (options, values) {
    this.absolute = options.absolute;
    this.filterViews = options.filterViews;
    this.selection = options.selection;
    this.selectionView = options.selectionView;
    this.type = options.type;
    this.view = options.view;
    this.values = values;

    this.signatures = views[this.view].signatures;

    this.filteredValues = {};
    this.filterValue = null;
    this.filterFeature = null;
    this.filterViewIndex = 0;
};

Statistic.prototype.constructor = Statistic;

Statistic.prototype.filter = function () {
    var counts = {}, _this = this, key = null;
    if (this.filterFeature !== null) {
        key = this.filterFeature.properties[this.selection];
    }

    $.each(_this.values, function (i, values) {
        if (key !== null && values[0] != key) {
            return true;
        }

        if (_this.filterValue !== null && values[2 + _this.filterViewIndex] !== _this.filterValue) {
            return true;
        }

        var signature = _this.getSignatureForValue(values[1]);

        if (signature) {
            if (counts[signature.values[0]]) {
                counts[signature.values[0]]++;
            } else {
                counts[signature.values[0]] = 1;
            }
        }
    });

    this.filteredValues = counts;
};

Statistic.prototype.setFilterValue = function(value, view) {
    this.filterValue = value;
    this.filterViewIndex = this.filterViews.indexOf(view);
};

Statistic.prototype.unsetFilterValue = function () {
    this.filterValue = null;
    this.filterViewIndex = 0;
};

Statistic.prototype.getSignatureForValue = function (value) {
    var signature = this.signatures.filter(function (sig) {
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

    return typeof signature === "undefined" ? false : signature;
};

/*
 * Info-Class (ES5)
 */

var Info = function () {
    var control = L.control({position: "bottomleft"});
    control.onAdd = function () {
        var div = L.DomUtil.create("div", "info");
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);
        return div;
    };
    control.addTo(map);

    var _this = this;

    this.$info = $("div.info");
    this.views = {};
    this.layerViews = {};
    this.mouseout = function () {
        if (clickedLayer === null)
            _this.$info.empty();
    };

    this.updateViews();
};

Info.prototype.constructor = Info;

Info.prototype.update = function () {
    this.updateViews();
    this.updateLayers();
};

Info.prototype.updateLayers = function () {
    var _this = this;

    $.each(this.layerViews, function (layerId, _views) {
        leafletLayers[layerId].eachLayer(function (layer) {

            if (layer.listens("click") && layer._events.mouseover.length === 2) {
                layer._events.mouseover.splice(-1, 1);
            } else if (!layer.listens("click")) {
                layer.off("mouseover");
            }

            layer.off("mouseout", _this.mouseout);

            var mouseover = function () {
                if (clickedLayer !== null) {
                    return true;
                }

                if (layer.feature.properties[layers[layerId].infoAttribute])
                    _this.$info.append($("<strong>").text(layer.feature.properties[layers[layerId].infoAttribute]));

                $.each(_views, function (viewId, view) {
                    var signature = _this.getSignatureForValue(layer.feature.properties[view.attribute], views[viewId].signatures);
                    if (signature) {
                        _this.$info.append($("<p>").text(views[viewId].name + ": "
                                + layer.feature.properties[view.attribute] + "; ")
                                .append($("<span>").text(signature.label).css("color", signature.color)));
                    }
                });
            };

            layer.on("mouseover", mouseover);
            layer.on("mouseout", _this.mouseout);
        });
    });
};

Info.prototype.updateViews = function () {
    this.views = {};
    this.views[legend.selectedView] = views[legend.selectedView];
    var _this = this;

    $.each(views, function (i, view) {
        if (_this.views[legend.selectedView].concurrents.indexOf(view.id) >= 0 ||
                view.visibility === 3) {
            _this.views[view.id] = view;
        }
    });

    this.layerViews = {};

    $.each(layer_views, function (i, layerView) {
        $.each(_this.views, function (j, view) {
            if (Object.keys(layerView).indexOf(view.id.toString()) >= 0) {
                if (!_this.layerViews[i]) {
                    _this.layerViews[i] = {};
                }

                _this.layerViews[i] = layerView;
            }
        });
    });
};

Info.prototype.getSignatureForValue = function (value, signatures) {
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
};