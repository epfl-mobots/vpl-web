/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** Install robot simulator
	@param {Object} options
	@return {void}
*/
A3a.vpl.Application.prototype.installRobotSimulator = function (options) {
	this.simCanvas = new A3a.vpl.Canvas(this.canvasEl);

	var app = this;
	var intervalId = null;
	this.runGlue = new A3a.vpl.RunGlue({
 		run: function (language, code) {
			var sim2d = app.sim2d;

			// load code
			sim2d.robot["reset"](0);
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
		preferredLanguage: "js",
		languages: ["js", "aseba", "l2", "python"]
	});
};
