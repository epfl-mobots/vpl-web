/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** Install connection with Thymio via Thymio Device Manager
	@return {void}
*/
A3a.vpl.Application.prototype.installThymioTDM = function () {
	var app = this;
	this.runGlue = new A3a.vpl.RunGlue({
		run: function (language, code) {
			window["tdmRun"](code);
		},
		init: function (language) {
			// initialize the list of nodes
			try {
				window["tdmInit"](vplGetHashOption("w"),
					vplGetHashOption("uuid"),
					function () {
						app.runGlue.state = {};
						app.vplCanvas.update();
					});
			} catch (e) {
				console.info(e);
				app.vplCanvas.update();
			}
		},
		isConnected: function () {
			return app.runGlue.state != null && window["tdmIsConnected"]();;
		},
		isEnabled: function (language) {
			return language === "aseba" && app.runGlue.state != null && window["tdmCanRun"]();
		},
		preferredLanguage: "aseba",
		languages: ["aseba"],
		state: null
	});
};
