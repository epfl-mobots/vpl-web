/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

window["installRobotSimulator"] = function (options) {
	/** Run code on the robot simulator
		@param {string} code source code
		@return {void}
	*/
	window["vplRun"] = new A3a.vpl.RunGlue({
 		run: function (code) {
			var sim = window["vplSim"];

			// load code
			sim.robot["reset"](0);
			sim.robot["loadCode"](code);

			// (re)launch real-time simulator
			if (sim.intervalId !== null) {
				// already running: stop
				clearInterval(sim.intervalId);
			}
			var t0 = A3a.vpl.VPLSim2DViewer.currentTime();
			sim.robot["start"](t0);
			sim.intervalId = setInterval(function () {
				var t = A3a.vpl.VPLSim2DViewer.currentTime();
				sim.robot["run"](t,
					/** @type {A3a.vpl.Robot.TraceFun} */(function (shape, param) {
						sim.sim.drawPen(shape, param);
					}));
			}, 10);
		},
		init: function (language) {
			var robot = language === "js"
				? new A3a.vpl.VirtualThymio()
				: new A3a.vpl.VirtualThymioVM();
			var sim = new A3a.vpl.VPLSim2DViewer(robot);
			if (options && options.canvasFilter) {
				sim.simCanvas.setFilter(options.canvasFilter);
			}
			window["vplSim"] = {
				robot: robot,
				sim: sim,
				intervalId: null
			};
		},
		preferredLanguage: "js",
		languages: ["js", "aseba", "l2"]
	});
};
