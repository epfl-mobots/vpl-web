/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
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
				window["tdmInit"](null,
					function () {
						app.vplCanvas.update();
					});
			} catch (e) {
				console.info(e);
				app.vplCanvas.update();
			}
		},
		isEnabled: function (language) {
			return language === "aseba" && app.runGlue.state != null;
		},
		preferredLanguage: "aseba",
		languages: ["aseba"],
		state: null
	});
};
