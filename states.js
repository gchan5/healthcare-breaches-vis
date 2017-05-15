var width = 960;
var height = 600;

var mapWidth = 450;
var mapHeight = 300;

var max = 0;
var maxLocation = 0;

var locations = d3.map();

var stateJson = 0;

var filter = "";

d3.csv("breaches.csv", function(data) {

    d3.json("us-states.json", function(json) {

        for (var j = 0; j < json.features.length; j++) {
            json.features[j].properties.count = 0;
        }

        for (var i = 0; i < data.length; i++) {
            var dataState = data[i].State;

            for (var j = 0; j < json.features.length; j++) {
                var jsonState = json.features[j].properties.name;

                if (dataState == jsonState) {
                    json.features[j].properties.count = json.features[j].properties.count + 1;

                    if (json.features[j].properties.count > max) {
                        max = json.features[j].properties.count;
                    }
                }
            }
        }

        // Bind the data to the SVG and create one path per GeoJSON feature
        drawLocationsBar("vis2", data, filter, 600, 400);
        drawLineChart("vis3", data, filter, 600, 400);
        drawUSMap("vis", json, data, 600, 400);
        drawInfo("vis4", "", "", "", "", "", "", true);
    });

});

console.log(locations);
console.log(stateJson);


function getLineData(data, filter) {
    var newData = [];

    var parseTime = d3.timeParse("%Y-%m-%d");

    data.forEach(function(d) {
        if (filter != "" && filter == d.State) {
            newData.push({
                date: parseTime(d.breach_start),
                count: +d.Individuals_Affected,
                summary: d.Summary,
                name: d.Name_of_Covered_Entity,
                type: d.Type_of_Breach,
                location: d.Location_of_Breached_Information
            })
        } else if (filter == "") {
            newData.push({
                date: parseTime(d.breach_start),
                count: +d.Individuals_Affected,
                summary: d.Summary,
                name: d.Name_of_Covered_Entity,
                type: d.Type_of_Breach,
                location: d.Location_of_Breached_Information
            })
        }
    });

    return newData;
}

function getLocation(data, filter) {
    var returnedLocations = d3.map();

    var maxLocation = 0;

    returnedLocations.set("Paper", 0);
    returnedLocations.set("Laptop", 0);
    returnedLocations.set("Multiple", 0);
    returnedLocations.set("Other", 0);
    returnedLocations.set("Desktop Computer", 0);
    returnedLocations.set("Network Server", 0);
    returnedLocations.set("Other Portable Electronic Device", 0);
    returnedLocations.set("E-mail", 0);
    returnedLocations.set("Electronic Medical Record", 0);

    for (var i = 0; i < data.length; i++) {

        var dataState = data[i].State;

        var dataLocation = data[i].Location_of_Breached_Information;

        if (dataLocation.includes(",")) {
            dataLocation = "Multiple";
        }

        if (filter == "") {
            if (returnedLocations.has(dataLocation)) {
                var toSet = returnedLocations.get(dataLocation) + 1;

                if (toSet > maxLocation) {
                    maxLocation = toSet;
                }

                returnedLocations.set(dataLocation, toSet);
            } else {
                returnedLocations.set(dataLocation, 1);
            }
        } else {
            if (dataState == filter) {
                if (returnedLocations.has(dataLocation)) {
                    var toSet = returnedLocations.get(dataLocation) + 1;

                    if (toSet > maxLocation) {
                        maxLocation = toSet;
                    }

                    returnedLocations.set(dataLocation, toSet);
                } else {
                    returnedLocations.set(dataLocation, 1);

                    if (1 > maxLocation) {
                        maxLocation = 1;
                    }
                }
            }
        }

    }

    return {
        returnedLocation: returnedLocations,
        maximum: maxLocation
    };
}

//inspiration from http://bl.ocks.org/michellechandra/0b2ce4923dc9b5809922
function drawUSMap(id, json, data, mapWidth, mapHeight) {
    var projection = d3.geoAlbersUsa()
        .translate([mapWidth / 2, mapHeight / 2]) // translate to center of screen
        .scale([mapWidth]); // scale things down so see entire US

    // Define path generator
    var path = d3.geoPath() // path generator that will convert GeoJSON to SVG paths
        .projection(projection); // tell path generator to use albersUsa projection

    var svg = d3.select("body")
        .select("#" + id);

    svg.selectAll("path")
        .data(json.features)
        .enter()
        .append("path")
        .attr("d", path)
        .style("stroke", "#d8d8d8")
        .style("stroke-width", "1")
        .style("fill", function(d) {
            return d3.interpolateGreens(d.properties.count / max);
        })
        .on("click", function(d) {
            if (filter == "") {
                filter = d.properties.name;
                drawLocationsBar("vis2", data, d.properties.name, 450, 300);
                drawLineChart("vis3", data, filter, 600, 400);
            } else if (filter == d.properties.name) {
                filter = "";
                drawLocationsBar("vis2", data, "", 450, 300);
                drawLineChart("vis3", data, filter, 600, 400);
            } else {
                filter = d.properties.name;
                drawLocationsBar("vis2", data, d.properties.name, 450, 300);
                drawLineChart("vis3", data, filter, 600, 400);
            }

        });

    // d3.legend http://d3-legend.susielu.com/

    var linear = d3.scaleLinear()
        .domain([0, max])
        .range(["#e5f5e0", "#00441B"]);

    var svg = d3.select("svg");

    svg.append("g")
        .attr("class", "legendLinear")
        .attr("transform", "translate(12, 80)");

    var legendLinear = d3.legendColor()
        .labelFormat(d3.format(".0f"))
        .shapeWidth(25)
        .cells(5)
        .orient('vertical')
        .scale(linear);

    svg.select(".legendLinear")
        .call(legendLinear);

    svg.append("text")
        .attr("id", "title")
        .attr("transform", "translate(12, 20)")
        .text("Density of Breaches in the US");
}

function drawLocationsBar(id, data, filter, width, height) {
    var svg = d3.select("body")
        .select("#" + id);

    svg.selectAll("g.chartRow").remove();

    var info = getLocation(data, filter);
    var location = info.returnedLocation;
    var maxLocation = info.maximum;

    var margin = {
            top: 40,
            right: 40,
            bottom: 20,
            left: 0
        },
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom;

    var keys = location.keys();

    // keys.sort(function(a, b) {
    //     return location.get(b) - location.get(a);
    // });

    var x = d3.scaleLinear().rangeRound([0, width]);
    var y = d3.scaleBand().rangeRound([30, height + 50]).padding(0.1)

    y.domain(keys);
    x.domain([0, maxLocation]);

    // inspiration from http://bl.ocks.org/charlesdguthrie/11356441

    var chartRow = svg.selectAll("g.chartRow")
        .data(keys);

    var newRow = chartRow
        .enter()
        .append("g")
        .attr("class", "chartRow")
        .attr("transform", "translate(50,0)");

    //Add rectangles
    newRow.insert("rect")
        .attr("class", "bar")
        .attr("y", function(d) {
            return y(d);
        })
        .attr("x", 0)
        .attr("opacity", 1)
        .attr("width", 0)
        .attr("height", function(d) {
            return y.bandwidth();
        })
        .transition()
        .duration(1000)
        .attr("width", function(d) {
            return x(location.get(d));
        })
        .attr("opacity", 1);

    //Add value labels
    newRow.append("text")
        .attr("class", "label-location")
        .attr("y", function(d) {
            return y(d) + y.bandwidth() / 2;
        })
        .attr("x", 0)
        .attr("opacity", 1)
        .attr("dy", ".35em")
        .attr("dx", "0.5em")
        .text(function(d) {
            return location.get(d);
        });

    //Add Headlines
    newRow.append("text")
        .attr("class", "category")
        .attr("text-overflow", "ellipsis")
        .attr("y", function(d) {
            return y(d) + y.bandwidth() / 2;
        })
        .attr("x", 50)
        .attr("opacity", 1)
        .attr("dy", ".35em")
        .attr("dx", "0.5em")
        .text(function(d) {
            return d
        });

    svg.selectAll("#title").remove();

    svg.append("text")
        .attr("id", "title")
        .attr("transform", "translate(0, 20)")
        .text(function(d) {
            if (filter == "") {
                return "Top Locations of Breached Data in the US";
            } else {
                return "Top Locations of Breached Data in " + filter;
            }
        });

}

function drawLineChart(id, data, filter, width, height) {
    var svg = d3.select("#" + id);
    var margin = {
            top: 40,
            right: 20,
            bottom: 30,
            left: 50
        },
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom;

    svg.selectAll("g").remove();

    g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var parseTime = d3.timeParse("%Y-%m-%d");

    var data = getLineData(data, filter);

    console.log(data);

    var x = d3.scaleTime()
        .rangeRound([0, width]);

    var y = d3.scaleLinear()
        .rangeRound([height, 0]);

    var line = d3.line()
        .x(function(d) {
            return x(d.date);
        })
        .y(function(d) {
            return y(d.count);
        });

    data.sort(function(a, b) {
        return new Date(a.date) - new Date(b.date);
    });

    x.domain(d3.extent(data, function(d) {
        return d.date;
    }));
    y.domain(d3.extent(data, function(d) {
        return d.count;
    }));

    g.append("g")
        .attr("transform", "translate(0, " + height + ")")
        .call(d3.axisBottom(x))

    g.append("g")
        .call(d3.axisLeft(y))

    var path1 = g.append("path")
        .data(data)
        .attr("fill", "none")
        .attr("class", "line")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 1.5)
        .attr("d", line(data));
    // .transition()
    // .duration(3000)
    // .ease(d3.easeSin)
    // .attr("stroke-opacity", 1);

    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function(d) {
            return x(d.date);
        })
        .attr("cy", function(d) {
            return y(d.count);
        })
        .attr("r", 3)
        .attr("opacity", 1)
        .on("mouseover", function(d) {
            d3.select(this).classed("selected", true);

            drawInfo("vis4", d.summary, d.count, d.date, d.name, d.type, d.location, true);
        })
        .on("mouseout", function(d) {
            d3.select(this).classed("selected", false);

            drawInfo("vis4", d.summary, d.count, d.date, d.name, d.type, d.location, true);
        });

    var totalLength = path1.node().getTotalLength();

    path1.attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(3500)
        .ease(d3.easeSin)
        .attr("stroke-dashoffset", 0);

    svg.selectAll("text#title").remove();

    var title = "";

    if(filter == ""){
        title = "in the US";
    } else {
        title = "in " + filter;
    }

    svg.append("text")
        .attr("id", "title")
        .attr("transform", "translate(12, 20)")
        .text("Amount of Individuals Affected by Date " + title);
}

function drawInfo(id, summary, count, date, name, type, location, visibility) {
    var margin = {
        top: 20,
        right: 20,
        bottom: 30,
        left: 50
    };

    var svg = d3.select("#" + id);

    svg.selectAll("g").remove();

    g = svg.append("g")

    var details = g.append("foreignObject")
        .attr("id", "details")
        .attr("width", 450)
        .attr("height", 300)
        .attr("x", -40)
        .attr("y", 0);

    var body = details.append("xhtml:body")
        .style("text-align", "left")
        .style("background", "none")
        .html("<p>N/A</p>");

    if (summary == "" || summary == null) {
        summary = "None given."
    }

    if(date != "") {
        date = new Date(date).toDateString();
    }

    body.html("<table id=\"visTableLarge\" width=600px height=400px>" + "\n" +
        "<tr><th id=\"visTable\">Name of Entity:</th><td id=\"visTable\">" + name + "</td></tr>" + "\n" +
        "<tr><th id=\"visTable\">Date:</th><td id=\"visTable\">" + date + "</td></tr>" + "\n" +
        "<tr><th id=\"visTable\">Individuals Affected:</th><td id=\"visTable\">" + count + "</td></tr>" + "\n" +
        "<tr><th id=\"visTable\">Type of Breach:</th><td id=\"visTable\">" + type + "</td></tr>" + "\n" +
        "<tr><th id=\"visTable\">Location of Breach:</th><td id=\"visTable\">" + location + "</td></tr>" + "\n" +
        "</table>");

    if (visibility) {
        details.style("visibility", "visible");
    } else {
        details.style("visibility", "hidden");
    }
}
