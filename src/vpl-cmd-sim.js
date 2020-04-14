/*
	Copyright 2018-2020 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Definition of a A3a.vpl.Application method to populate its collection of
commands with commands related to the simulator.

*/

/** Install commands for simulator
	@return {void}
*/
A3a.vpl.Application.prototype.addSim2DCommands = function () {
	this.commands.add("sim:close", {
		action: function (app, modifier) {
			app.setView(["sim"], {closeView: true});
		},
		object: this,
		isAvailable: function (app) {
			return app.views.length > 1 && app.views.indexOf("sim") >= 0;
		}
	});
	this.commands.add("sim:restart", {
		action: function (app, modifier) {
			app.restoreGround();
			app.sim2d.robot["reset"](A3a.vpl.VPLSim2DViewer.currentTime());
			app.sim2d.robot["start"]();
			app.sim2d.running = true;
			app.sim2d.paused = false;
			app.renderSim2dViewer();
		},
		object: this
	});
	this.commands.add("sim:pause", {
		action: function (app, modifier) {
			if (app.sim2d.running) {
				app.sim2d.paused = !app.sim2d.paused;
				if (app.sim2d.paused) {
					app.sim2d.robot["suspend"]();
				} else {
					app.sim2d.robot["resume"](A3a.vpl.VPLSim2DViewer.currentTime());
					app.renderSim2dViewer();
				}
			}
		},
		isEnabled: function (app) {
			return app.sim2d.running;
		},
		isSelected: function (app) {
			return app.sim2d.paused;
		},
		object: this,
		possibleStates: [
			{selected: false},
			{selected: true}
		]
	});
	this.commands.add("sim:speedup", {
		action: function (app, modifier) {
			/** @const */
			var s = [0.5, 1, 2, 5, 10];
			app.sim2d.robot.setSpeedupFactor(s[(s.indexOf(app.sim2d.robot.speedupFactor) + 1) % s.length]);
		},
		isSelected: function (app) {
			return app.sim2d.robot.speedupFactor !== 1;
		},
		getState: function (app) {
			return app.sim2d.robot.speedupFactor;
		},
		object: this,
		possibleStates: [
			{selected: false, state: 1},
			{selected: true, state: 0.5},
			{selected: true, state: 2},
			{selected: true, state: 5},
			{selected: true, state: 10}
		]
	});
	this.commands.add("sim:noise", {
		action: function (app, modifier) {
			app.sim2d.robot.hasNoise = !app.sim2d.robot.hasNoise;
		},
		isSelected: function (app) {
			return app.sim2d.robot.hasNoise;
		},
		object: this,
		possibleStates: [
			{selected: false},
			{selected: true}
		]
	});
	this.commands.add("sim:pen", {
		action: function (app, modifier) {
			app.sim2d.penDown = !app.sim2d.penDown;
		},
		isSelected: function (app) {
			return app.sim2d.penDown;
		},
		object: this,
		possibleStates: [
			{selected: false},
			{selected: true}
		]
	});
	this.commands.add("sim:clear", {
		action: function (app, modifier) {
			app.restoreGround();
		},
		isEnabled: function (app) {
			return app.sim2d.groundCanvasDirty;
		},
		object: this
	});
	this.commands.add("sim:map-kind", {
		action: function (app, modifier) {
			switch (app.sim2d.currentMap) {
			case A3a.vpl.VPLSim2DViewer.playgroundMap.ground:
				app.sim2d.currentMap = A3a.vpl.VPLSim2DViewer.playgroundMap.height;
				break;
			case A3a.vpl.VPLSim2DViewer.playgroundMap.height:
				app.sim2d.currentMap = A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle;
				break;
			case A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle:
				app.sim2d.currentMap = A3a.vpl.VPLSim2DViewer.playgroundMap.ground;
				break;
			}
		},
		getState: function (app) {
			switch (app.sim2d.currentMap) {
			case A3a.vpl.VPLSim2DViewer.playgroundMap.ground:
				return "ground";
			case A3a.vpl.VPLSim2DViewer.playgroundMap.height:
				return "height";
			case A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle:
				return "obstacles";
			default:
				return "ground";
			}
		},
		object: this,
		possibleStates: [
			{state: "ground"},
			{state: "height"},
			{state: "obstacles"}
		],
		isAvailable: function (app) {
			return app.simMaps === null;
		}
	});
	this.commands.add("sim:map", {
		action: function (app, modifier) {
			switch (app.sim2d.currentMap) {
			case A3a.vpl.VPLSim2DViewer.playgroundMap.ground:
				// toggle between null and disabled ground image
				app.setImage(app.sim2d.groundImage == null ? app.sim2d.disabledGroundImage : null);
				break;
			case A3a.vpl.VPLSim2DViewer.playgroundMap.height:
				// toggle between null and disabled height image
				app.setImage(app.sim2d.heightImage == null ? app.sim2d.disabledHeightImage : null);
				break;
			case A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle:
				// toggle between null and disabled obstacle svg
				app.setSVG(app.sim2d.hasObstacles ? null : app.sim2d.disabledObstacleSVG);
				break;
			}
		},
		isSelected: function (app) {
			switch (app.sim2d.currentMap) {
			case A3a.vpl.VPLSim2DViewer.playgroundMap.ground:
				return app.sim2d.groundImage != null;
			case A3a.vpl.VPLSim2DViewer.playgroundMap.height:
				return app.sim2d.heightImage != null;
			case A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle:
				return app.sim2d.hasObstacles;
			}
			throw "internal";
		},
		getState: function (app) {
			switch (app.sim2d.currentMap) {
			case A3a.vpl.VPLSim2DViewer.playgroundMap.ground:
				return "ground";
			case A3a.vpl.VPLSim2DViewer.playgroundMap.height:
				return "height";
			case A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle:
				return "obstacles";
			default:
				return "ground";
			}
		},
		object: this,
		possibleStates: [
			{selected: false, state: "ground"},
			{selected: false, state: "height"},
			{selected: false, state: "obstacles"},
			{selected: true, state: "ground"},
			{selected: true, state: "height"},
			{selected: true, state: "obstacles"}
		],
		isAvailable: function (app) {
			return app.simMaps === null;
		}
	});
	this.commands.add("sim:map-ground", {
		action: function (app, modifier) {
			if (modifier) {
				// open ground file
				app.loadBox.show("Open ground image file",
					".gif,.png,.jpg,.svg",
					function (file) {
						var fileReader = new window.FileReader();
						fileReader.onload = function (event) {
							var data = event.target.result;
							var img = new Image();
							img.addEventListener("load", function () {
								app.setImage(img, A3a.vpl.VPLSim2DViewer.playgroundMap.ground);
							});
							img.src = data;
						};
						fileReader["readAsDataURL"](file);
					});
			} else {
				// toggle between null and disabled ground image
				app.setImage(app.sim2d.groundImage == null ? app.sim2d.disabledGroundImage : null,
					A3a.vpl.VPLSim2DViewer.playgroundMap.ground);
			}
		},
		isSelected: function (app) {
			return app.sim2d.groundImage != null;
		},
		object: this,
		possibleStates: [
			{selected: false},
			{selected: true}
		],
		isAvailable: function (app) {
			return app.simMaps && app.simMaps.indexOf("ground") >= 0;
		}
	});
	this.commands.add("sim:map-height", {
		action: function (app, modifier) {
			if (modifier) {
				// open height file
				app.loadBox.show("Open height image file",
					".gif,.png,.jpg,.svg",
					function (file) {
						var fileReader = new window.FileReader();
						fileReader.onload = function (event) {
							var data = event.target.result;
							var img = new Image();
							img.addEventListener("load", function () {
								app.setImage(img, A3a.vpl.VPLSim2DViewer.playgroundMap.height);
							});
							img.src = data;
						};
						fileReader["readAsDataURL"](file);
					});
			} else {
				// toggle between null and disabled height image
				app.setImage(app.sim2d.heightImage == null ? app.sim2d.disabledHeightImage : null,
					A3a.vpl.VPLSim2DViewer.playgroundMap.height);
			}
		},
		isSelected: function (app) {
			return app.sim2d.heightImage != null;
		},
		object: this,
		possibleStates: [
			{selected: false},
			{selected: true}
		],
		isAvailable: function (app) {
			return app.simMaps && app.simMaps.indexOf("height") >= 0;
		}
	});
	this.commands.add("sim:map-obstacles", {
		action: function (app, modifier) {
			if (modifier) {
				// open obstacle file
				app.loadBox.show("Open obstacle SVG file",
					".svg",
					function (file) {
						var fileReader = new window.FileReader();
						fileReader.onload = function (event) {
							var data = event.target.result;
							app.setSVG(data, A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle);
						};
						fileReader["readAsText"](file);
					});
			} else {
				// toggle between null and disabled obstacle svg
				app.setSVG(app.sim2d.hasObstacles ? null : app.sim2d.disabledObstacleSVG,
					A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle);
			}
		},
		isSelected: function (app) {
			return app.sim2d.hasObstacles;
		},
		object: this,
		possibleStates: [
			{selected: false},
			{selected: true}
		],
		isAvailable: function (app) {
			return app.simMaps && app.simMaps.indexOf("obstacles") >= 0;
		}
	});
	this.commands.add("sim:vpl", {
		action: function (app, modifier) {
			if (app.multipleViews) {
				app.setView(["vpl"], {openView: true});
			} else {
				app.setView(["vpl"], {fromView: "sim"});
			}
		},
		isEnabled: function (app) {
			return app.editor == null || app.editor.doesMatchVPL();
		},
		object: this,
		isAvailable: function (app) {
			return (app.editor == null || !app.editor.noVPL) &&
				app.views.indexOf("vpl") < 0;
		}
	});
	this.commands.add("sim:text", {
		action: function (app, modifier) {
			if (app.multipleViews) {
				app.setView(["src"], {
					openView: true,
					unlocked: !app.editor.isLockedWithVPL
				});
			} else {
				app.setView(["src"],
					{
						fromView: "sim",
						unlocked: !app.editor.isLockedWithVPL
					});
			}
		},
		object: this,
		isAvailable: function (app) {
			return app.views.indexOf("src") < 0;
		}
	});
	this.commands.add("sim:teacher-reset", {
		action: function (app, modifier) {
			app.sim2d.resetUI();
			app.renderSim2dViewer();
		},
		object: this,
		keep: true,
		isAvailable: function (app) {
			return app.sim2d.teacherRole && app.sim2d.uiConfig.toolbarCustomizationMode;
		}
	});
	this.commands.add("sim:teacher", {
		action: function (app, modifier) {
			app.sim2d.uiConfig.toolbarCustomizationMode = !app.sim2d.uiConfig.toolbarCustomizationMode;
			app.renderSim2dViewer();
		},
		isSelected: function (app) {
			return app.sim2d.uiConfig.toolbarCustomizationMode;
		},
		object: this,
		keep: true,
		isAvailable:  function (app) {
			return app.sim2d.teacherRole;
		},
		possibleStates: [
			{selected: false},
			{selected: true}
		]
	});
};
