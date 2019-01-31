/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** Install commands for simulator
	@param {A3a.vpl.Commands} commands
	@param {A3a.vpl.VPLSourceEditor} editor
	@return {void}
*/
A3a.vpl.VPLSim2DViewer.prototype.addSim2DCommands = function (commands, editor) {
	commands.add("sim:restart", {
		action: function (sim2d, modifier) {
			sim2d.restoreGround();
			sim2d.robot["start"](A3a.vpl.VPLSim2DViewer.currentTime());
			sim2d.running = true;
			sim2d.paused = false;
			sim2d.render();
		},
		object: this
	});
	commands.add("sim:pause", {
		action: function (sim2d, modifier) {
			if (sim2d.running) {
				sim2d.paused = !sim2d.paused;
				if (sim2d.paused) {
					sim2d.robot["suspend"]();
				} else {
					sim2d.robot["resume"](A3a.vpl.VPLSim2DViewer.currentTime());
					sim2d.render();
				}
			}
		},
		isEnabled: function (sim2d) {
			return sim2d.running;
		},
		isSelected: function (sim2d) {
			return sim2d.paused;
		},
		object: this
	});
	commands.add("sim:speedup", {
		action: function (sim2d, modifier) {
			/** @const */
			var s = [0.5, 1, 2, 5, 10];
			sim2d.robot.setSpeedupFactor(s[(s.indexOf(sim2d.robot.speedupFactor) + 1) % s.length]);
		},
		isSelected: function (sim2d) {
			return sim2d.robot.speedupFactor !== 1;
		},
		getState: function (sim2d) {
			return sim2d.robot.speedupFactor;
		},
		object: this
	});
	commands.add("sim:noise", {
		action: function (sim2d, modifier) {
			sim2d.robot.hasNoise = !sim2d.robot.hasNoise;
		},
		isSelected: function (sim2d) {
			return sim2d.robot.hasNoise;
		},
		object: this
	});
	commands.add("sim:pen", {
		action: function (sim2d, modifier) {
			sim2d.penDown = !sim2d.penDown;
		},
		isSelected: function (sim2d) {
			return sim2d.penDown;
		},
		object: this
	});
	commands.add("sim:clear", {
		action: function (sim2d, modifier) {
			sim2d.restoreGround();
		},
		isEnabled: function (sim2d) {
			return sim2d.groundCanvasDirty;
		},
		object: this
	});
	commands.add("sim:map-kind", {
		action: function (sim2d, modifier) {
			switch (sim2d.currentMap) {
			case A3a.vpl.VPLSim2DViewer.playgroundMap.ground:
				sim2d.currentMap = A3a.vpl.VPLSim2DViewer.playgroundMap.height;
				break;
			case A3a.vpl.VPLSim2DViewer.playgroundMap.height:
				sim2d.currentMap = A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle;
				break;
			case A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle:
				sim2d.currentMap = A3a.vpl.VPLSim2DViewer.playgroundMap.ground;
				break;
			}
		},
		getState: function (sim2d) {
			switch (sim2d.currentMap) {
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
		object: this
	});
	commands.add("sim:map", {
		action: function (sim2d, modifier) {
			switch (sim2d.currentMap) {
			case A3a.vpl.VPLSim2DViewer.playgroundMap.ground:
				// toggle between null and disabled ground image
				sim2d.setImage(sim2d.groundImage == null ? sim2d.disabledGroundImage : null);
				break;
			case A3a.vpl.VPLSim2DViewer.playgroundMap.height:
				// toggle between null and disabled height image
				sim2d.setImage(sim2d.heightImage == null ? sim2d.disabledHeightImage : null);
				break;
			case A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle:
				// toggle between null and disabled obstacle svg
				sim2d.setSVG(sim2d.hasObstacles ? null : sim2d.disabledObstacleSVG);
				break;
			}
		},
		isSelected: function (sim2d) {
			switch (sim2d.currentMap) {
			case A3a.vpl.VPLSim2DViewer.playgroundMap.ground:
				return sim2d.groundImage != null;
			case A3a.vpl.VPLSim2DViewer.playgroundMap.height:
				return sim2d.heightImage != null;
			case A3a.vpl.VPLSim2DViewer.playgroundMap.obstacle:
				return sim2d.hasObstacles;
			}
			throw "internal";
		},
		getState: function (sim2d) {
			switch (sim2d.currentMap) {
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
		object: this
	});
	commands.add("sim:vpl", {
		action: function (sim2d, modifier) {
			window["vplProgram"].setView("vpl");
		},
		isEnabled: function (sim2d) {
			return editor == null || editor.doesMatchVPL();
		},
		object: this,
		isAvailable: function (srcEditor) {
			return editor == null || !editor.noVPL;
		}
	});
	commands.add("sim:text", {
		action: function (sim2d, modifier) {
			window["vplProgram"].setView("src",
				{unlocked: !window["vplEditor"].isLockedWithVPL});
		},
		object: this
	});
	commands.add("sim:teacher-reset", {
		action: function (sim2d, modifier) {
			sim2d.resetUI();
			sim2d.render();
		},
		object: this,
		keep: true,
		isAvailable: function (sim2d) {
			return sim2d.teacherRole && sim2d.uiConfig.customizationMode;
		}
	});
	commands.add("sim:teacher", {
		action: function (sim2d, modifier) {
			sim2d.uiConfig.customizationMode = !sim2d.uiConfig.customizationMode;
			sim2d.render();
		},
		isSelected: function (sim2d) {
			return sim2d.uiConfig.customizationMode;
		},
		object: this,
		keep: true,
		isAvailable:  function (sim2d) {
			return sim2d.teacherRole;
		}
	});
};
