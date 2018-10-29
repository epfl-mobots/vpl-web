/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

A3a.vpl.dragPayload = null;

/** @dict */
A3a.vpl.blockLib = {};

// window-level drag
/** @type {?function(Event,boolean):void} */
A3a.vpl.dragFun = null;
document.addEventListener("mousemove", function (e) {
	if (A3a.vpl.dragFun !== null) {
		A3a.vpl.dragFun(e, false);
		e.preventDefault();
	}
}, false);
document.addEventListener("mouseup", function (e) {
	if (A3a.vpl.dragFun !== null) {
		A3a.vpl.dragFun(e, true);
		A3a.vpl.dragFun = null;
		e.preventDefault();
	}
}, false);

// window-level touch drag
A3a.vpl.lastTouch = null;
document.addEventListener("touchmove", function (e) {
	e.preventDefault();
	if (A3a.vpl.dragFun !== null) {
		var touches = e.targetTouches;
		A3a.vpl.lastTouch = touches[0];
		A3a.vpl.dragFun(A3a.vpl.lastTouch, false);
	}
	return false;
}, {"capture": false, "passive": false});
document.addEventListener("touchend", function (e) {
	if (A3a.vpl.dragFun !== null) {
		A3a.vpl.dragFun(A3a.vpl.lastTouch, true);
		A3a.vpl.dragFun = null;
		e.preventDefault();
	}
	return false;
}, false);

var textEditor;

window.addEventListener("load", function () {

	/** Get value corresponding to key in the URI query
		@param {string} key
		@return {string}
	*/
	function getQueryOption(key) {
		var q = document.location.href.indexOf("?");
		if (q >= 0) {
			var pairs = document.location.href
				.slice(q + 1)
				.split("&").map(function (p) {
					return p.split("=")
						.map(function (s) {
							return decodeURIComponent(s);
						});
					});
			for (var i = 0; i < pairs.length; i++) {
				if (pairs[i][0] === key) {
					return pairs[i][1];
				}
			}
		}
		return "";
	}

	// general settings
	var isClassic = getQueryOption("appearance") === "classic";
	if (!isClassic) {
		try {
			var txt = document.getElementById("ui.json").textContent;
			var uiConfig = /** @type {Object} */(JSON.parse(txt));
			var svg = {};
			uiConfig["svgFilenames"].forEach(function (filename) {
				txt = document.getElementById(filename).textContent;
				svg[filename] = txt;
			});
			uiConfig["svg"] = svg;
			A3a.vpl.patchSVG(uiConfig);
		} catch (e) {}
	}
	if (getQueryOption("compiler") === "l2") {
		A3a.vpl.patchL2();
	}

	var filterBlur = 0;	// 0.1 px
	var filterGrayscale = 0;	// %
	var opt = getQueryOption("blur").trim() || "";
	if (/^\d+$/.test(opt)) {
		filterBlur = parseInt(opt, 10) / 10;
	}
	opt = getQueryOption("grayscale") || "";
	if (/^\d+$/.test(opt)) {
		filterGrayscale = parseInt(opt, 10) / 100;
	}

	var hasThymio = getQueryOption("robot") === "true";
	if (hasThymio) {
		window["vplRunFunction"] && window["vplRunFunction"]["init"] &&
			window["vplRunFunction"]["init"]();
	} else {
		window["vplRunFunction"] = null;
	}

	textEditor = new A3a.vpl.TextEditor("editor", "editor-lines");
	textEditor.onBreakpointChanged = function (bp) {
		window["vplBreakpointsFunction"] && window["vplBreakpointsFunction"](bp);
	};
	window["vplProgram"] = new A3a.vpl.Program();
	var canvas = document.getElementById("programCanvas");
	window["vplCanvas"] = new A3a.vpl.Canvas(canvas);
	window["vplCanvas"].wheel = function (dx, dy) {
		window["vplProgram"].scrollCanvas(window["vplCanvas"], dy);
		window["vplCanvas"].onUpdate();
	};
	window["vplCanvas"].state = new A3a.vpl.Program.CanvasRenderingState();
	window["vplCanvas"].onUpdate = function () {
		window["vplProgram"].invalidateCode();
		window["vplProgram"].enforceSingleTrailingEmptyEventHandler();
		window["vplProgram"].renderToCanvas(window["vplCanvas"]);
		textEditor.setContent(window["vplProgram"].getCode());
	};
	window["vplProgram"].addEventHandler(true);

	// apply canvas filters
	if (filterBlur > 0 || filterGrayscale > 0) {
		window["vplCanvas"].canvas["style"]["filter"] =
			"blur(" + filterBlur.toFixed(1) + "px) grayscale(" + filterGrayscale.toFixed(2) + ")";
	}

	canvas = document.getElementById("editorTBCanvas");
	window["srcTBCanvas"] = new A3a.vpl.Canvas(canvas);

	// accept dropped aesl files
	document.getElementsByTagName("body")[0].addEventListener('dragover', function(e) {
		e.stopPropagation();
		e.preventDefault();
		e.dataTransfer.dropEffect = "copy";
	}, false);
	document.getElementsByTagName("body")[0].addEventListener('drop', function(e) {
		e.stopPropagation();
		e.preventDefault();
		var files = e.dataTransfer.files;
		if (files.length === 1) {
			var file = files[0];
			var reader = new window.FileReader();
			reader.onload = function (event) {
				var data = event.target.result;
				var filename = file.name;
				window["vplProgram"].importFromAESLFile(data);
				window["vplCanvas"].onUpdate();
			};
			reader["readAsText"](file);
		}
	}, false);

	// reload from storage
	if (window["vplStorageGetFunction"]) {
		window["vplStorageGetFunction"]("vpl.json",
			function (data) {
				try {
					if (data) {
						window["vplProgram"].importFromJSON(data, function () {
							window["vplProgram"].renderToCanvas(window["vplCanvas"]);
						});
					}
				} catch (e) {}
			});
	} else {
		try {
			var vplJson = window.localStorage.getItem("vpl.json");
			if (vplJson) {
				window["vplProgram"].importFromJSON(vplJson, function () {
					window["vplProgram"].renderToCanvas(window["vplCanvas"]);
				});
			}
		} catch (e) {}
	}

	// initial canvas resize
	vplResize();
	window["vplCanvas"].onUpdate();

	// resize canvas
	window.addEventListener("resize", vplResize, false);

	// editor control update
	document.getElementById("editor").addEventListener("input",
		function () {
			srcToolbarRender(window["srcTBCanvas"]);
		},
		false);
	// editor tab key
	document.getElementById("editor").addEventListener("keydown", function (e) {
		if (e.keyCode === 9) {
			// prevent loss of focus in textarea
			e.preventDefault();
			e.cancelBubbles = true;
			var textarea = document.getElementById("editor");
			var text = textarea.value;
			var start = this.selectionStart, end = this.selectionEnd;
			text = text.slice(0, start) + "\t" + text.slice(end);
			textEditor.setContent(text);
			this.selectionStart = this.selectionEnd = start + 1;
			return false;
		}
		// normal behavior
		return true;
	}, false);

	if (getQueryOption("view") === "text") {
		window["vplProgram"].setView("src", true);
	} else {
		window["vplProgram"].setView("vpl");
		window["vplProgram"].experimentalFeatures = getQueryOption("exp") === "true";
		window["vplProgram"].setTeacherRole(getQueryOption("role") === "teacher");
		window["vplProgram"].renderToCanvas(window["vplCanvas"]);
		document.getElementById("editor").textContent = window["vplProgram"].getCode();
	}
	srcToolbarRender(window["srcTBCanvas"], window["vplProgram"].noVpl);
}, false);

function srcToolbarHeight(canvas) {
	var dims = canvas.dims;
	return dims.controlSize + 2 * dims.interBlockSpace;
};

/** Render toolbar for source code editor
	@param {A3a.vpl.Canvas} canvas
	@param {boolean=} noVpl
	@return {void}
*/
function srcToolbarRender(canvas, noVpl) {
	// start with an empty canvas
	canvas.clearItems();

	// top controls
	var canvasSize = canvas.getSize();
	var xc = canvas.dims.margin;

	// new
	canvas.addControl(xc, canvas.dims.margin,
		canvas.dims.controlSize, canvas.dims.controlSize,
		// draw
		function (ctx, item, dx, dy) {
			ctx.fillStyle = "navy";
			ctx.fillRect(item.x + dx, item.y + dy,
				canvas.dims.controlSize, canvas.dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.25,
				item.y + dy + canvas.dims.controlSize * 0.2);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.25,
				item.y + dy + canvas.dims.controlSize * 0.8);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.75,
				item.y + dy + canvas.dims.controlSize * 0.8);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.75,
				item.y + dy + canvas.dims.controlSize * 0.3);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.65,
				item.y + dy + canvas.dims.controlSize * 0.2);
			ctx.closePath();
			ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.65,
				item.y + dy + canvas.dims.controlSize * 0.2);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.65,
				item.y + dy + canvas.dims.controlSize * 0.3);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.75,
				item.y + dy + canvas.dims.controlSize * 0.3);
			ctx.strokeStyle = "white";
			ctx.lineWidth = canvas.dims.blockLineWidth;
			ctx.stroke();
		},
		// mousedown
		function (data, x, y, ev) {
			textEditor.setContent("");
			return 0;
		},
		// doDrop
		null,
		// canDrop
		null);
	xc += canvas.dims.controlSize + canvas.dims.interBlockSpace;

	// save
	var isEditorEmpty = document.getElementById("editor").value.trim().length === 0;
	canvas.addControl(xc, canvas.dims.margin,
		canvas.dims.controlSize, canvas.dims.controlSize,
		// draw
		function (ctx, item, dx, dy) {
			ctx.fillStyle = "navy";
			ctx.fillRect(item.x + dx, item.y + dy,
				canvas.dims.controlSize, canvas.dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.25,
				item.y + dy + canvas.dims.controlSize * 0.2);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.25,
				item.y + dy + canvas.dims.controlSize * 0.7);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.67,
				item.y + dy + canvas.dims.controlSize * 0.7);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.67,
				item.y + dy + canvas.dims.controlSize * 0.27);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.6,
				item.y + dy + canvas.dims.controlSize * 0.2);
			ctx.closePath();
			ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.6,
				item.y + dy + canvas.dims.controlSize * 0.2);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.6,
				item.y + dy + canvas.dims.controlSize * 0.27);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.67,
				item.y + dy + canvas.dims.controlSize * 0.27);
			ctx.strokeStyle = isEditorEmpty ? "#777" : "white";
			ctx.lineWidth = canvas.dims.blockLineWidth;
			ctx.stroke();
			ctx.lineWidth = 2 * canvas.dims.blockLineWidth;
			ctx.beginPath();
			ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.8,
				item.y + dy + canvas.dims.controlSize * 0.5);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.8,
				item.y + dy + canvas.dims.controlSize * 0.8);
			ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.7,
				item.y + dy + canvas.dims.controlSize * 0.7);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.8,
				item.y + dy + canvas.dims.controlSize * 0.8);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.9,
				item.y + dy + canvas.dims.controlSize * 0.7);
			ctx.stroke();
		},
		// mousedown
		function (data, x, y, ev) {
			if (!isEditorEmpty) {
				var src = document.getElementById("editor").value;
				var aesl = A3a.vpl.Program.toAESLFile(src);
				A3a.vpl.Program.downloadXML(aesl, "code.aesl");
			}
			return 0;
		},
		// doDrop
		null,
		// canDrop
		null);
	xc += canvas.dims.controlSize + canvas.dims.interBlockSpace;

	// vpl
	if (!noVpl) {
		canvas.addControl(xc, canvas.dims.margin,
			canvas.dims.controlSize, canvas.dims.controlSize,
			// draw
			function (ctx, item, dx, dy) {
				ctx.fillStyle = "navy";
				ctx.fillRect(item.x + dx, item.y + dy,
					canvas.dims.controlSize, canvas.dims.controlSize);
				ctx.beginPath();
				ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.25,
					item.y + dy + canvas.dims.controlSize * 0.2);
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.25,
					item.y + dy + canvas.dims.controlSize * 0.8);
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.75,
					item.y + dy + canvas.dims.controlSize * 0.8);
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.75,
					item.y + dy + canvas.dims.controlSize * 0.3);
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.65,
					item.y + dy + canvas.dims.controlSize * 0.2);
				ctx.closePath();
				ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.65,
					item.y + dy + canvas.dims.controlSize * 0.2);
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.65,
					item.y + dy + canvas.dims.controlSize * 0.3);
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.75,
					item.y + dy + canvas.dims.controlSize * 0.3);
				ctx.strokeStyle = "white";
				ctx.lineWidth = canvas.dims.blockLineWidth;
				ctx.stroke();
				ctx.fillStyle = "#99a";
				for (var y = 0.15; y < 0.6; y += 0.15) {
					ctx.fillRect(item.x + dx + canvas.dims.controlSize * 0.3,
						item.y + dy + canvas.dims.controlSize * (0.2 + y),
						canvas.dims.controlSize * 0.4,
						canvas.dims.controlSize * 0.10);
				}
			},
			// mousedown
			function (data, x, y, ev) {
				window["vplProgram"].setView("vpl");
				return 0;
			},
			// doDrop
			null,
			// canDrop
			null);
		xc += canvas.dims.controlSize + 2 * canvas.dims.interBlockSpace;
	}

	if (window["vplRunFunction"]) {
		xc += (canvasSize.width
			- (3 * canvas.dims.controlSize + 3 * canvas.dims.interBlockSpace) - xc) / 2;
		canvas.addControl(xc, canvas.dims.margin,
			canvas.dims.controlSize, canvas.dims.controlSize,
			// draw
			function (ctx, item, dx, dy) {
				ctx.fillStyle = "navy";
				ctx.fillRect(item.x + dx, item.y + dy,
					canvas.dims.controlSize, canvas.dims.controlSize);
				ctx.beginPath();
				ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.3,
					item.y + dy + canvas.dims.controlSize * 0.25);
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.3,
					item.y + dy + canvas.dims.controlSize * 0.75);
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.8,
					item.y + dy + canvas.dims.controlSize * 0.5);
				ctx.closePath();
				ctx.fillStyle = "white";
				ctx.fill();
			},
			// mousedown
			function (data, x, y, ev) {
				var code = document.getElementById("editor").value;
				window["vplRunFunction"](code);
				return 0;
			},
			// doDrop
			null,
			// canDrop
			null);
		xc += canvas.dims.controlSize + canvas.dims.interBlockSpace;

		canvas.addControl(xc, canvas.dims.margin,
			canvas.dims.controlSize, canvas.dims.controlSize,
			// draw
			function (ctx, item, dx, dy) {
				ctx.fillStyle = "navy";
				ctx.fillRect(item.x + dx, item.y + dy,
					canvas.dims.controlSize, canvas.dims.controlSize);
				ctx.fillStyle = "white";
				ctx.fillRect(item.x + dx + canvas.dims.controlSize * 0.28,
					item.y + dy + canvas.dims.controlSize * 0.28,
					canvas.dims.controlSize * 0.44, canvas.dims.controlSize * 0.44);
				ctx.fill();
			},
			// mousedown
			function (data, x, y, ev) {
				window["vplRunFunction"]("motor.left.target = 0\nmotor.right.target = 0\n");
				return 0;
			},
			// doDrop
			null,
			// canDrop
			null);
		xc += canvas.dims.controlSize + canvas.dims.interBlockSpace;
	}

	canvas.redraw();
};

function vplResize() {
	var width = window.innerWidth;
	var height = window.innerHeight;
	if (window["vplDisableResize"]) {
		var bnd = window["vplCanvas"].canvas.getBoundingClientRect();
		width = bnd.width;
		height = bnd.height;
	}

	// vpl
	window["vplCanvas"].resize(width, height);
	window["vplProgram"].renderToCanvas(window["vplCanvas"]);

	// editor
	window["srcTBCanvas"].dims = window["vplCanvas"].dims;
	window["srcTBCanvas"].resize(width, srcToolbarHeight(window["srcTBCanvas"]));
	window["srcTBCanvas"].canvas.style.height = window["srcTBCanvas"].height + "px";
	srcToolbarRender(window["srcTBCanvas"], window["vplProgram"].noVpl);
	var editor = document.getElementById("editor");
	editor.parentElement.style.height = (window.innerHeight - window["srcTBCanvas"].canvas.getBoundingClientRect().height) + "px";
}

// remember state across reload
window.addEventListener("unload", function () {
console.info("vplStorageSetFunction");
	var json = window["vplProgram"].exportToJSON();
	try {
		if (window["vplStorageSetFunction"]) {
			window["vplStorageSetFunction"]("vpl.json", json);
		} else {
			window.localStorage.setItem("vpl.json", json);
		}
	} catch (e) {}
}, false);
