/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** Change current view
	@param {string} view "vpl", "src" or "sim"
	@param {{noVPL:(boolean|undefined),unlocked:(boolean|undefined)}=} options
	noVPL:true to prevent vpl (default: false),
	unlocked:true (with "src") for source code editor in unlocked state (disconnected
	from vpl)
	@return {void}
*/
A3a.vpl.Program.setView = function (view, options) {
	if (options && options.noVPL) {
		window["vplProgram"].noVPL = true;
		window["vplEditor"].noVPL = true;
		window["vplEditor"].lockWithVPL(false);
	}

	var views = view.split("+");

	document.getElementById("src-editor").style.display = views.indexOf("src") >= 0 ? "block" : "none";
	window["vplCanvas"].state.view = view;

	if (window["vplSim"] != null) {
		window["vplSim"].sim.visible = views.indexOf("sim") >= 0;
		window["simCanvas"].hide();
	}
	window["vplCanvas"].hide();
	window["editorCanvas"].hide();
	if (views.indexOf("vpl") >= 0) {
		window["vplCanvas"].show();
	}
	if (views.indexOf("src") >= 0) {
		window["editorCanvas"].show();
	}
	if (window["vplSim"] != null && views.indexOf("sim") >= 0) {
		window["simCanvas"].show();
	}

	for (var i = 0; i < views.length; i++) {
		var relArea = {
			xmin: i / views.length,
			xmax: (i + 1) / views.length,
			ymin: 0,
			ymax: 1
		};
		switch (views[i]) {
		case "vpl":
			window["vplCanvas"].setRelativeArea(relArea);
			window["vplCanvas"].onUpdate = function () {
				window["vplProgram"].invalidateCode();
				window["vplProgram"].enforceSingleTrailingEmptyEventHandler();
				window["vplProgram"].renderToCanvas(window["vplCanvas"]);
				window["vplEditor"].setCode(window["vplProgram"].getCode(window["vplProgram"].currentLanguage));
			};
			break;
		case "src":
			window["editorCanvas"].setRelativeArea(relArea);
			window["vplEditor"].lockWithVPL(!(options && (options.noVPL || options.unlocked)));
			window["vplEditor"].focus();
			break;
		case "sim":
			window["simCanvas"].setRelativeArea(relArea);
			window["simCanvas"].onUpdate = function () {
				window["vplSim"].sim.render();
			};
			break;
		}
	}

	window["vplCanvas"].onDraw =
		window["editorCanvas"].onDraw =
		window["simCanvas"].onDraw =
			function () {
				views.indexOf("vpl") >= 0 && window["vplCanvas"].redraw();
				views.indexOf("src") >= 0 && window["editorCanvas"].redraw();
				views.indexOf("sim") >= 0 && window["simCanvas"].redraw();
			};

	if (views.indexOf("vpl") >= 0) {
		window["vplCanvas"].onUpdate();
		window["vplCanvas"].onDraw ? window["vplCanvas"].onDraw() : window["vplCanvas"].redraw();
	}
	if (views.indexOf("src") >= 0) {
		window["editorCanvas"].onUpdate();
		window["editorCanvas"].onDraw ? window["editorCanvas"].onDraw() : window["editorCanvas"].redraw();
	}
	if (views.indexOf("sim") >= 0) {
		window["vplSim"].sim.start(false);
		window["simCanvas"].onUpdate();
		window["simCanvas"].onDraw ? window["simCanvas"].onDraw() : window["simCanvas"].redraw();
	}
};
