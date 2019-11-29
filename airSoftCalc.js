"use strict";

function EnergyCalculator() {
    var self = this;
    self.Energy = function (mass, speed) {
        var energy = 1 / 2 * mass * speed * speed;
        return energy;
    };

    self.Speed = function (mass, energy) {
        return Math.sqrt(energy / mass * 2);
    };

    self.SpeedAtDistance = function (mass, speed, airDensity, distance) {
        var s0 = 8 * mass / (airDensity * 0.47 * Math.PI * 0.006 * 0.006);
        var vD = speed * Math.pow(Math.E, -distance / s0);
        return vD;
    };

    self.EnergyAtDistance = function (mass, speed, airDensity, distance) {
        var speedAtDistance = self.SpeedAtDistance(mass, speed, airDensity, distance);
        return self.Energy(mass, speedAtDistance);
    };
}

function DistanceConversion() {
    var self = this;
    self.convertSpeedToFps = function (speedMps) {
        return speedMps * 3.2808399;
    };

    self.convertSpeedToMps = function (speedFps) {
        return speedFps * 0.3048;
    };
}

function ballModel() {
    var self = this;
    self.buildFromSpeedAndMass = function (speed, mass) {
        return {
            speedMps: speed,
            speedFps: new DistanceConversion().convertSpeedToFps(speed),
            mass: mass,
            energy: new EnergyCalculator().Energy(mass / 1000, speed),
            range: 30,
            airDensity: 1.2041,
            color: 0
        };
    };

    self.buildFromEnergyAndMass = function (energy, mass) {
        var speed = new EnergyCalculator().Speed(mass / 1000, energy);
        return {
            speedMps: speed,
            speedFps: new DistanceConversion().convertSpeedToFps(speed),
            mass: mass,
            energy: energy,
            range: 30,
            airDensity: 1.2041,
            color: 0
        };
    };

    self.speedMps = 100;
    self.speedFps = new DistanceConversion().convertSpeedToFps(100);
    self.mass = 0.2;
    self.energy = new EnergyCalculator().Energy(0.2 / 1000, 100);
    self.range = 30;
    self.airDensity = 1.2041;
    self.color = 0;
}

ko.extenders.numeric = function (target, precision) {
    var result = ko.pureComputed({
        read: target,
        write: function (newValue) {
            var current = target();
            var roundingMultiplier = Math.pow(10, precision);
            var newValueAsNum = isNaN(newValue) ? 0 : +newValue;
            var valueToWrite = Math.round(newValueAsNum * roundingMultiplier) / roundingMultiplier;

            if (valueToWrite !== current) {
                target(valueToWrite);
            } else {
                if (newValue !== current) {
                    target.notifySubscribers(valueToWrite);
                }
            }
        }
    }).extend({ notify: "always" });
    result(target());
    return result;
};

function ballViewModel(data, index) {
    var self = this;
    var innerUpdate = true;

    function round(value, decimals) {
        return Number(Math.round(value + "e" + decimals) + "e-" + decimals);
    }

    function round3(val) {
        return round(val, 3);
    }

    self.index = index;

    self.speedMps = ko.observable(data.speedMps).extend({ numeric: 3 });
    self.speedMps.subscribe(function (newValue) {
        if (!innerUpdate) {
            var val = newValue || 1;
            innerUpdate = true;
            self.speedFps(new DistanceConversion().convertSpeedToFps(val));
            self.energy(new EnergyCalculator().Energy(self.mass() / 1000, val));
            innerUpdate = false;
            updatePlot();
        }
    });
    self.speedFps = ko.observable(data.speedFps).extend({ numeric: 3 });
    self.speedFps.subscribe(function (newValue) {
        if (!innerUpdate) {
            var val = newValue || 1;
            innerUpdate = true;
            self.speedMps(new DistanceConversion().convertSpeedToMps(val));
            self.energy(new EnergyCalculator().Energy(self.mass() / 1000, self.speedMps()));
            innerUpdate = false;
            updatePlot();
        }
    });
    self.mass = ko.observable(data.mass).extend({ numeric: 3 });
    self.mass.subscribe(function (newValue) {
        if (!innerUpdate) {
            var val = newValue || 1;
            innerUpdate = true;
            self.speedMps(new EnergyCalculator().Speed(val / 1000, self.energy()));
            innerUpdate = false;
            updatePlot();
        }
    });
    self.energy = ko.observable(data.energy).extend({ numeric: 3 });
    self.energy.subscribe(function (newValue) {
        if (!innerUpdate) {
            var val = newValue || 1;
            innerUpdate = true;
            var speed = new EnergyCalculator().Speed(self.mass() / 1000, val);
            self.speedMps(speed);
            self.speedFps(new DistanceConversion().convertSpeedToFps(speed));
            innerUpdate = false;
            updatePlot();
        }
    });
    self.range = ko.observable(data.range);
    self.range.subscribe(function (newValue) {
        if (!innerUpdate) {
            updatePlot();
        }
    });
    self.airDensity = ko.observable(data.airDensity);
    self.airDensity.subscribe(function (newVal) {
        if (!innerUpdate) {
            updatePlot();
        }
    });
    self.airTemp = [
        { temperature: 30, density: 1.1644 },
        { temperature: 20, density: 1.2041 },
        { temperature: 10, density: 1.2466 },
        { temperature: 0, density: 1.2922 },
        { temperature: -10, density: 1.3413 }
    ];
    self.colorOptions = [
        { value: "#000", label: "black" },
        { value: "#00a", label: "blue" },
        { value: "#0a0", label: "green" },
        { value: "#0aa", label: "cyan" },
        { value: "#a00", label: "red" },
        { value: "#a0a", label: "magenta" },
        { value: "#a5a", label: "brown" },
        { value: "#aaa", label: "light gray" },
        { value: "#555", label: "dark gray" },
        { value: "#55f", label: "bright blue" },
        { value: "#5f5", label: "bright green" },
        { value: "#5ff", label: "bright cyan" },
        { value: "#f55", label: "bright red" },
        { value: "#f5f", label: "bright magenta" },
        { value: "#ff5", label: "bright yellow" }
    ];
    self.color = ko.observable(self.colorOptions[data.color]);
    self.color.subscribe(function (newVal) {
        if (!innerUpdate) {
            updatePlot();
        }
    });
    self.speedAtDistance = function () {
        return new EnergyCalculator().SpeedAtDistance(self.mass() / 1000, self.speedMps(), self.airDensity().density, self.range());
    };
    self.energyAtDistance = function () {
        return new EnergyCalculator().EnergyAtDistance(self.mass() / 1000, self.speedMps(), self.airDensity().density, self.range());
    };
    self.colorRgb = function () {
        return self.color().value;
    };

    function updatePlot() {
        appViewModel.updatePlot(self);
    }

    innerUpdate = false;
}

function viewModel(plotSpeed, plotEnergy) {
    var self = this;

    self.ballEntries = ko.observableArray();

    //self.add = function (ballEntry) {
    //    self.ballEntries.push(new ballViewModel(ballEntry));
    //};

    self.addBallOnClick = function () {
        self.addBallPreset();
    };

    self.addBallPreset = function (override) {
        var balls = self.ballEntries();
        var newBallModel = balls.length === 0 ? new ballModel() : ko.toJS(balls[balls.length - 1]);

        if (override != null) {
            newBallModel.speedMps = override.speedMps;
            newBallModel.speedFps = override.speedFps;
            newBallModel.mass = override.mass;
            newBallModel.energy = override.energy;
            newBallModel.range = override.range;
        }

        if (balls.length > 0) {
            var prevColor = newBallModel.color.value;
            var colorOptions = balls[balls.length - 1].colorOptions;
            var index = 0;
            var loop = 0;
            for (loop = 0; loop < colorOptions.length; loop += 1) {
                if (colorOptions[loop].value === prevColor) {
                    index = loop;
                    break;
                }
            }
            index = index + 1;
            index = index % colorOptions.length;
            newBallModel.color = index;
        }
        var b = new ballViewModel(newBallModel, self.ballEntries().length);
        self.addPlot(b);
        self.ballEntries.push(b);        
    };

    self.removeBall = function (ballViewModel) {
        var ballIndex = ballViewModel.index;
        self.removePlot(ballIndex);
        var loop = 0;
        var len = self.ballEntries().length;
        var ballEntries = self.ballEntries();
        for (loop = ballIndex; loop < len; loop++) {
            ballEntries[loop].index--;
        }
        self.ballEntries.remove(ballViewModel);
    };

    self.setAllBallsSpeed = function (ballViewModel) {
        self.ballEntries().forEach(function (item, index) {
            item.speedMps(ballViewModel.speedMps());
            item.speedFps(ballViewModel.speedFps());
        });
    };

    self.setAllBallsMass = function (ballViewModel) {
        self.ballEntries().forEach(function (item, index) {
            item.mass(ballViewModel.mass());
        });
    };

    self.setAllBallsEnergy = function (ballViewModel) {
        self.ballEntries().forEach(function (item, index) {
            item.energy(ballViewModel.energy());
        });
    };

    self.setAllBallsRange = function (ballViewModel) {
        self.ballEntries().forEach(function (item, index) {
            item.range(ballViewModel.range());
        });
    };

    self.setAllBallsAirTemperature = function (ballViewModel) {
        self.ballEntries().forEach(function (item, index) {
            item.airDensity(ballViewModel.airDensity());
        });
    }

    var energyCalculator = new EnergyCalculator();

    self.addPlot = function (ballEntry) {
        //Plotly.purge(speedPlot);
        //Plotly.purge(energyPlot);
        var maxRange = 0;
        //self.ballEntries().forEach(function (item, index) {
        //    if (item.range() > maxRange) { maxRange = item.range(); }
        //});
        maxRange = 100;
        //self.ballEntries().forEach(function (item, index) {
        var mass = ballEntry.mass();
        var speed = ballEntry.speedMps();
        var airDensity = ballEntry.airDensity().density;
        var color = ballEntry.color().value;

        drawPlot(speedPlot, ballEntry.index, function (x) { return energyCalculator.SpeedAtDistance(mass / 1000, speed, airDensity, x); }, maxRange, "Speed " + mass + "g, " + speed + "m/s", color, 1);
        drawPlot(energyPlot, ballEntry.index, function (x) { return energyCalculator.EnergyAtDistance(mass / 1000, speed, airDensity, x); }, maxRange, "Energy " + mass + "g, " + speed + "m/s", color, 3);
        //});
    };

    self.removePlot = function (index) {
        if (index >= 0) {
            Plotly.deleteTraces(speedPlot, index);
            Plotly.deleteTraces(energyPlot, index);
        }
    };

    self.updatePlot = function (ballEntry) {
        if (ballEntry == null) {
            return;
        }

        self.removePlot(ballEntry.index);
        self.addPlot(ballEntry);

        ////Plotly.purge(speedPlot);
        ////Plotly.purge(energyPlot);
        //var maxRange = 0;
        ////self.ballEntries().forEach(function (item, index) {
        ////    if (item.range() > maxRange) { maxRange = item.range(); }
        ////});
        //maxRange = 100;
        ////self.ballEntries().forEach(function (item, index) {
        //    var mass = ballEntry.mass();
        //    var speed = ballEntry.speedMps();
        //    var airDensity = ballEntry.airDensity().density;
        //    var color = ballEntry.color().value;

        //    drawPlot(speedPlot, function (x) { return energyCalculator.SpeedAtDistance(mass / 1000, speed, airDensity, x); }, maxRange, "Speed " + mass + "g, " + speed + "m/s", color, 1);
        //    drawPlot(energyPlot, function (x) { return energyCalculator.EnergyAtDistance(mass / 1000, speed, airDensity, x); }, maxRange, "Energy " + mass + "g, " + speed + "m/s", color, 3);
        ////});
    }

    function initGraph(plot) {
        var xAxis = [];
        var yAxis = [];

        var trace = {
            x: xAxis,
            y: yAxis
            //name: name,
            //line: {
            //    color: color,
            //    width: width
            //}
        };

        var data = [trace];
        Plotly.plot(plot, data, { margin: { t: 0 } });
    }

    initGraph(speedPlot);
    initGraph(energyPlot);

    function drawPlot(plot, index, fn, range, name, color, width, update) {
        var xAxis = [];
        var yAxis = [];
        var loop = 0;
        for (loop = 0; loop < range; loop = loop + 0.1) {
            xAxis.push(loop);
            yAxis.push(fn(loop));
        }

        var trace = {
            x: xAxis,
            y: yAxis,
            name: name,
            line: {
                color: color,
                width: width
            }
        };
        
        Plotly.addTraces(plot, trace, index);
    }
}