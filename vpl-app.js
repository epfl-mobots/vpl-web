/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** Change current view
	@param {string} view "vpl", "src" or "sim"
	@param {{noVpl:(boolean|undefined),unlocked:(boolean|undefined)}=} options
	noVpl:true to prevent vpl (default: false),
	unlocked:true (with "src") for source code editor in unlocked state (disconnected
	from vpl)
	@return {void}
*/
A3a.vpl.Program.setView = function (view, options) {
	window["vplProgram"].noVpl = options && options.noVpl || false;
	document.getElementById("vpl-editor").style.display = view !== "src" ? "block" : "none";
	document.getElementById("src-editor").style.display = view === "src" ? "block" : "none";
	window["vplCanvas"].state.view = view;

	var views = view.split("+");
	window["vplSim"].sim.visible = views.indexOf("sim") >= 0;
	window["vplCanvas"].hide();
	window["simCanvas"].hide();
	if (views.indexOf("vpl") >= 0) {
		window["vplCanvas"].show();
	}
	if (views.indexOf("sim") >= 0) {
		window["simCanvas"].show();
	}

	switch (view) {
	case "vpl":
		window["vplCanvas"].setRelativeArea({xmin: 0, xmax: 1, ymin: 0, ymax: 1});
		window["vplCanvas"].onUpdate = function () {
			window["vplProgram"].invalidateCode();
			window["vplProgram"].enforceSingleTrailingEmptyEventHandler();
			window["vplProgram"].renderToCanvas(window["vplCanvas"]);
			window["vplEditor"].setCode(window["vplProgram"].getCode(window["vplProgram"].currentLanguage));
		};
		window["vplCanvas"].onDraw = null;
		break;
	case "src":
		window["vplEditor"].lockWithVPL(!(options && options.unlocked));
		window["vplEditor"].focus();
		break;
	case "sim":
		window["simCanvas"].setRelativeArea({xmin: 0, xmax: 1, ymin: 0, ymax: 1});
		window["simCanvas"].onUpdate = function () {
			window["vplSim"].sim.render();
		};
		window["simCanvas"].onDraw = null;
		break;
	case "vpl+sim":
		window["vplCanvas"].setRelativeArea({xmin: 0, xmax: 0.5, ymin: 0, ymax: 1});
		window["simCanvas"].setRelativeArea({xmin: 0.5, xmax: 1, ymin: 0, ymax: 1});
		window["vplCanvas"].onUpdate = function () {
			window["vplProgram"].invalidateCode();
			window["vplProgram"].enforceSingleTrailingEmptyEventHandler();
			window["vplProgram"].renderToCanvas(window["vplCanvas"]);
			window["vplEditor"].setCode(window["vplProgram"].getCode(window["vplProgram"].currentLanguage));
		};
		window["simCanvas"].onUpdate = function () {
			window["vplSim"].sim.render();
		};
		window["vplCanvas"].onDraw =
 			window["simCanvas"].onDraw =
				function () {
					window["vplCanvas"].redraw();
					window["simCanvas"].redraw();
				};
		break;
	case "sim+vpl":
		window["simCanvas"].setRelativeArea({xmin: 0, xmax: 0.5, ymin: 0, ymax: 1});
		window["vplCanvas"].setRelativeArea({xmin: 0.5, xmax: 1, ymin: 0, ymax: 1});
		window["vplCanvas"].onUpdate = function () {
			window["vplProgram"].invalidateCode();
			window["vplProgram"].enforceSingleTrailingEmptyEventHandler();
			window["vplProgram"].renderToCanvas(window["vplCanvas"]);
			window["vplEditor"].setCode(window["vplProgram"].getCode(window["vplProgram"].currentLanguage));
		};
		window["simCanvas"].onUpdate = function () {
			window["vplSim"].sim.render();
		};
		window["vplCanvas"].onDraw =
 			window["simCanvas"].onDraw =
				function () {
					window["vplCanvas"].redraw();
					window["simCanvas"].redraw();
				};
		break;
	}

	if (views.indexOf("vpl") >= 0) {
		window["vplCanvas"].onUpdate();
		window["vplCanvas"].onDraw ? window["vplCanvas"].onDraw() : window["vplCanvas"].redraw();
	}
	if (views.indexOf("sim") >= 0) {
		window["vplSim"].sim.start(false);
		window["simCanvas"].onUpdate();
		window["simCanvas"].onDraw ? window["simCanvas"].onDraw() : window["simCanvas"].redraw();
	}
};
