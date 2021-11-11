/*
	Copyright 2018-2021 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Support for file input: VPL3 program files (aesl or json), and image
files for the simulator (native image format handled by the browser,
or SVG for the obstacle map).

*/

/** Load a json program file
	@param {string} json program file content
	@param {A3a.vpl.Program.ImportOptions=} options
	@return {void}
*/
A3a.vpl.Application.prototype.loadProgramJSON = function (json, options) {
	try {
		this.program.importFromJSON(json, function (view) {
			if (this.views.indexOf(view) < 0) {
				if (this.views.length === 1) {
					this.setView([view]);
				} else {
					// switch vpl to src or src to vpl
					var views = this.views.slice();
					views[views.indexOf("vpl") >= 0 ? views.indexOf("vpl")
						: views.indexOf("src") >= 0 ? views.indexOf("src")
						: 0] = view;
					this.setView(views);
				}
			}
			this.programNotUploadedToServerYet = true;
			this.setHelpForCurrentAppState();
			if (this.views.indexOf("vpl") >= 0) {
				this.vplCanvas.onUpdate();
			}
		}, options);
	} catch (e) {}
};

/** Get the suffix (without dot) of a filename
	@param {string} filename
	@return {string}
*/
A3a.vpl.Application.getFileSuffix = function (filename) {
	return /(\.[^.]*|)$/.exec(filename)[0].slice(1).toLowerCase();
};

/** Load a program file (aesl, vpl3 (json) or zip bundle)
	@param {File} file
	@return {boolean} true if file suffix was recognized as a program
*/
A3a.vpl.Application.prototype.loadProgramFile = function (file) {
	var ext = A3a.vpl.Application.getFileSuffix(file.name);
	var reader = new window.FileReader();
	var app = this;
	switch (ext) {
	case "aesl":
	case A3a.vpl.Program.suffix:
	case A3a.vpl.Program.suffixUI:
	case "json":
		reader.onload = function (event) {
			var data = event.target.result;
			var filename = file.name;
			var dontChangeProgram = false;
			if (data.trim()[0] === "<") {
				// aesl (xml)
				app.program.importFromAESLFile(data);
			} else {
				// json
				dontChangeProgram = ext === "vpl3ui";
				app.loadProgramJSON(data, {dontChangeProgram: dontChangeProgram});
			}
			if (!dontChangeProgram) {
				app.program.filename = filename;
			}
			app.vplCanvas.onUpdate();
		};
		reader["readAsText"](file);
		return true;
	case "zip":
		reader.onload = function (event) {
			var dataURL = event.target.result;
			var contentBase64 = dataURL.slice(dataURL.indexOf(',') + 1);
			var content = atob(contentBase64);
			var zipbundle = new A3a.vpl.ZipBundle();
			zipbundle.load(content, function () {

				var getProcessImageURL = function (filename, binaryContent, isStatement) {
					return function (url0) {
						// convert relative url to file url if found in zipbundle
						var suffix = A3a.vpl.ZipBundle.getSuffix(url0);
						var imageBase64 = zipbundle.getFileSync(url0, true, function (base64Content) {
							// one more image has been decoded; reprocess file again
							var html = A3a.vpl.toHTML(binaryContent, A3a.vpl.ZipBundle.getSuffix(filename),
								getProcessImageURL(filename, binaryContent, isStatement));
							app.setHelpContent(html, isStatement);
						});
						if (imageBase64) {
							// convert base64 to data url
							return "data:" + A3a.vpl.suffixToMimetype[suffix.toLowerCase()] + ";base64," + imageBase64;
						}
						return url0;
					};
				};

				// reset vpl3, doc, statement
				app.newVPL(true);
				if (app.jsonForNew) {
					app.loadProgramJSON(app.jsonForNew);
				}
				app.program.filename = null;
				app.setHelpForCurrentAppState();
				app.statementBox = null;
				
				// load first vpl3 or ui, doc, statement
				var uiFiles = zipbundle.manifest.getFilesForType(A3a.vpl.ZipBundle.Manifest.File.Type.ui);
				var vpl3Files = zipbundle.manifest.getFilesForType(A3a.vpl.ZipBundle.Manifest.File.Type.vpl3);
				var docFiles = zipbundle.manifest.getFilesForType(A3a.vpl.ZipBundle.Manifest.File.Type.doc);
				var statementFiles = zipbundle.manifest.getFilesForType(A3a.vpl.ZipBundle.Manifest.File.Type.statement);
				if (vpl3Files.length > 0) {
					zipbundle.getFile(vpl3Files[0].filename, false, function (textContent) {
						if (/^[\s]*{/.test(/** @type {string} */(textContent))) {
							// json
							app.loadProgramJSON(/** @type {string} */(textContent));
						} else {
							// try xml
							app.program.importFromAESLFile(/** @type {string} */(textContent));
							app.vplCanvas.onUpdate();
						}
						app.program.filename = vpl3Files[0].filename;
						app.vplCanvas.update();
					});
				} else if (uiFiles.length > 0) {
					zipbundle.getFile(uiFiles[0].filename, false, function (textContent) {
						// assume json
						app.loadProgramJSON(/** @type {string} */(textContent));
						app.vplCanvas.update();
					});
				}
				if (docFiles.length > 0) {
					zipbundle.getFile(docFiles[0].filename, true, function (base64Content) {
						var binaryContent = atob(/** @type {string} */(base64Content));
						var html = A3a.vpl.toHTML(binaryContent, A3a.vpl.ZipBundle.getSuffix(docFiles[0].filename),
							getProcessImageURL(docFiles[0].filename, binaryContent, false));
						app.setHelpContent(html, false);
					});
				}
				if (statementFiles.length > 0) {
					zipbundle.getFile(statementFiles[0].filename, true, function (base64Content) {
						var binaryContent = atob(/** @type {string} */(base64Content));
						var html = A3a.vpl.toHTML(binaryContent, A3a.vpl.ZipBundle.getSuffix(statementFiles[0].filename),
							getProcessImageURL(statementFiles[0].filename, binaryContent, true));
						app.setHelpContent(html, true);
						app.vplCanvas.update();	// update toolbar
					});
				}
				app.renderProgramToCanvas();
			});
		};
		reader["readAsDataURL"](file);
		return true;
	}

	return false;
};

/** Load an image file (svg, png, jpg or gif) into the simulator
	@param {File} file
	@return {boolean} true if file suffix was recognized as an image
*/
A3a.vpl.Application.prototype.loadImageFile = function (file) {
	var r = /^[^.]+\.(.*)$/.exec(file.name);
	var ext = r ? r[1] : "";
	var reader = new window.FileReader();
	switch (ext.toLowerCase()) {
	case "svg":
	case "png":
	case "jpg":
	case "gif":
		var app = this;
		if (this.sim2d) {
			if (this.sim2d.wantsSVG()) {
				reader.onload = function (event) {
					var data = event.target.result;
					app.setSVG(data);
				};
				reader["readAsText"](file);
			} else {
				reader.onload = function (event) {
					var data = event.target.result;
					var img = new Image();
					img.addEventListener("load", function () {
						app.setImage(img);
					});
					img.src = data;
				};
				reader["readAsDataURL"](file);
			}
		}
		return true;
	}

	return false;
};

/** Load an audio file (wav) into the simulator
	@param {File} file
	@return {boolean} true if file suffix was recognized as an audio file
*/
A3a.vpl.Application.prototype.loadAudioFile = function (file) {
	var r = /^[^.]+\.(.*)$/.exec(file.name);
	var ext = r ? r[1] : "";
	var reader = new window.FileReader();
	switch (ext.toLowerCase()) {
	case "wav":
		var app = this;
		if (this.sim2d) {
			reader.onload = function (event) {
				var data = event.target.result;
				app.setAudio(file.name, data);
			};
			reader["readAsArrayBuffer"](file);
		}
		return true;
	}

	return false;
};
