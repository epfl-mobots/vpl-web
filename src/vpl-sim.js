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

Implementation of an A3a.vpl.Application methods which creates an
A3a.vpl.RunGlue object for the simulator.

*/

/** Install robot simulator
	@param {Object} options
	@return {A3a.vpl.RunGlue}
*/
A3a.vpl.Application.prototype.installRobotSimulator = function (options) {
	var app = this;

	this.simCanvas = new A3a.vpl.Canvas(this.canvasEl, {css: this.css});
	this.simCanvas.defaultDoOver = function () {
		if (app.simHint !== null) {
			app.simHint = null;
			app.requestRendering();
		}
	};

	var intervalId = null;
	return new A3a.vpl.RunGlue({
 		run: function (language, code) {
			var sim2d = app.sim2d;

			// load code
			sim2d.robot["loadCode"](language, code);

			// (re)launch real-time simulator
			if (intervalId !== null) {
				// already running: stop
				clearInterval(intervalId);
			}
			var t0 = A3a.vpl.VPLSim2DViewer.currentTime();
			sim2d.robot["start"](t0);
			intervalId = setInterval(function () {
				var t = A3a.vpl.VPLSim2DViewer.currentTime();
				sim2d.robot["run"](t,
					/** @type {A3a.vpl.Robot.TraceFun} */(function (shape, param) {
						sim2d.drawPen(shape, param);
					}));
			}, 10);
			sim2d.robot.suspended = sim2d.paused;	// don't change paused state
			app.requestRendering();
		},
		init: function (language) {
			var robot = new A3a.vpl.VirtualThymioVM();
			var sim2d = new A3a.vpl.VPLSim2DViewer(app.simCanvas, robot);
			if (options && options.canvasFilter) {
				app.simCanvas.setFilter(options.canvasFilter);
			}
			if (options && options.canvasTransform) {
				app.simCanvas.transform = options.canvasTransform;
			}
			app.sim2d = sim2d;
		},
		getName: function () {
			return "Simulator";
		},
		preferredLanguage: "js",
		languages: ["js", "aseba", "l2", "asm"]
	});
};
