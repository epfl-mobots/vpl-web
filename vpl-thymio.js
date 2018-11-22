/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

window["installThymio"] = function () {
	/** Run code on the Thymio
		@param {string} code source code
		@return {void}
	*/
	window["vplRun"] = new A3a.vpl.RunGlue({
		run: function (code) {
			window["vplNode"].putA3aCodeAsync(code);
		},
		init: function () {
			// initialize the list of nodes
			try {
				var origin = document.location.origin.slice(0, 5) !== "http:"
					? "http://127.0.0.1:3000"
					: document.location.origin;
				A3a.NodeProxy.init(origin, function () {
					window["vplNode"] = A3a.Node.getNodeList()[0];
					window["vplCanvas"]["update"]();
				});
			} catch (e) {
				console.info(e);
				window["vplCanvas"]["update"]();
			}
		},
		isEnabled: function () {
			return window["vplNode"] != undefined;
		},
		preferredLanguage: "aseba"
	});
};
