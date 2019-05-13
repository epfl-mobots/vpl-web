/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** Install connection with Thymio
	@return {A3a.vpl.RunGlue}
*/
A3a.vpl.Application.prototype.installThymio = function () {
	var app = this;
	return new A3a.vpl.RunGlue({
		run: function (language, code) {
			/** @type {A3a.Node} */(app.robots[app.currentRobotIndex].runGlue.state).putA3aCodeAsync(code);
		},
		init: function (language) {
			// initialize the list of nodes
			try {
				var origin = document.location.origin.slice(0, 5) !== "http:"
					? "http://127.0.0.1:3000"
					: document.location.origin;
				A3a.NodeProxy.init(origin, function () {
					app.robots[app.currentRobotIndex].runGlue.state = A3a.Node.getNodeList()[0];
					app.vplCanvas.update();
				});
			} catch (e) {
				console.info(e);
				app.vplCanvas.update();
			}
		},
		isConnected: function () {
			return app.robots[app.currentRobotIndex].runGlue.state != null;
		},
		isEnabled: function (language) {
			return language === "aseba" && app.robots[app.currentRobotIndex].runGlue.state != null;
		},
		preferredLanguage: "aseba",
		languages: ["aseba", "l2"],
		state: null
	});
};
