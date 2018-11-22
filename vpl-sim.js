/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

window["installRobotSimulator"] = function () {
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
				sim.robot["run"](t);
			}, 10);
		},
		init: function () {
			var robot = new A3a.vpl.VirtualThymio();
			window["vplSim"] = {
				robot: robot,
				sim: new A3a.vpl.VPLSim2DViewer(robot),
				intervalId: null
			};
		},
		preferredLanguage: "js"
	});
};
