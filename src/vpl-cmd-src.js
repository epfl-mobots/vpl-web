/*
	Copyright 2018-2020 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Definition of a A3a.vpl.Application method to populate its collection of
commands with commands related to the source-code editor.

*/

/** Install commands for source code editor
	@return {void}
*/
A3a.vpl.Application.prototype.addSrcCommands = function () {
	this.commands.add("src:close", {
		action: function (app, modifier) {
			app.setView(["src"], {closeView: true});
		},
		object: this,
		isAvailable: function (app) {
			return app.views.length > 1 && app.views.indexOf("src") >= 0;
		}
	});
	this.commands.add("src:new", {
		action: function (app, modifier) {
			app.editor.textEditor.setContent("");
			app.editor.tbCanvas.redraw();
		},
		isEnabled: function (app) {
			return !app.editor.isLockedWithVPL && app.editor.getCode().length > 0;
		},
		object: this
	});
	this.commands.add("src:save", {
		action: function (app, modifier) {
			// var src = app.editor.getCode();
			// var aesl = A3a.vpl.Program.toAESLFile(src);
			// A3a.vpl.Program.downloadText(aesl, "code.aesl");
			var json = app.program.exportToJSON({lib: false, prog: true});
			A3a.vpl.Program.downloadText(json,
				app.program.filename || A3a.vpl.Program.defaultFilename,
				A3a.vpl.Program.mimetype);
		},
		isEnabled: function (app) {
			return app.editor.getCode().length > 0;
		},
		object: this
	});
	this.commands.add("src:vpl", {
		action: function (app, modifier) {
			if (app.multipleViews) {
				app.setView(["vpl"], {openView: true});
			} else {
				app.setView(["vpl"], {fromView: "src"});
			}
		},
		isEnabled: function (app) {
			return app.editor.doesMatchVPL();
		},
		object: this,
		isAvailable: function (app) {
			return !app.editor.noVPL && app.views.indexOf("vpl") < 0;
		}
	});
	this.commands.add("src:locked", {
		action: function (app, modifier) {
			app.editor.lockWithVPL(!app.editor.isLockedWithVPL);
			app.editor.tbCanvas.redraw();
			if (app.editor.isLockedWithVPL) {
				app.program.noVPL = false;
				app.renderProgramToCanvas();
			}
		},
		isEnabled: function (app) {
			return app.editor.srcForAsm === null;
		},
		isSelected: function (app) {
			return app.editor.isLockedWithVPL;
		},
		object: this,
		isAvailable: function (app) {
			return !app.editor.noVPL;
		},
		possibleStates: [
			{selected: false},
			{selected: true}
		]
	});
	this.commands.add("src:language", {
		action: function (app, modifier) {
			var r = app.editor.updateCodeLanguage();
			app.editor.language = r.language;
			if (app.editor.isLockedWithVPL) {
				app.editor.setCode(r.code);
			}
		},
		isEnabled: function (app) {
			return app.editor.srcForAsm === null;
		},
		getState: function (app) {
			return app.editor.language;
		},
		object: this,
		isAvailable: function (app) {
			return app.editor.updateCodeLanguage != null;
		},
		possibleStates: [
			{state: "aseba"},
			{state: "l2"},
			{state: "asm"},
			{state: "js"},
			{state: "python"}
		]
	});
	this.commands.add("src:disass", {
		action: function (app, modifier) {
			if (app.editor.srcForAsm !== null) {
				app.editor.setCode(/** @type {string} */(app.editor.srcForAsm));
				app.editor.textEditor.setReadOnly(app.editor.isLockedWithVPL);
			} else {
				var src = app.editor.getCode();
				var dis = app.editor.disass(app.editor.language, src);
				if (dis !== null) {
					app.editor.setCode(/** @type {string} */(dis), true);
					app.editor.textEditor.setReadOnly(true);
					app.editor.srcForAsm = src;
				}
			}
			app.renderSourceEditorToolbar();
		},
		isEnabled: function (app) {
			return app.editor.disass != null && app.editor.disass(app.editor.language, "") !== null;
		},
		isSelected: function (app) {
			return app.editor.srcForAsm !== null;
		},
		object: this,
		isAvailable: function (app) {
			return app.editor.disass !== null;
		},
		possibleStates: [
			{selected: false},
			{selected: true}
		]
	});
	this.commands.add("src:run", {
		action: function (app, modifier) {
			var code = app.editor.getCode();
			app.robots[app.currentRobotIndex].runGlue.run(code, app.editor.language);
		},
		isEnabled: function (app) {
			return app.robots[app.currentRobotIndex].runGlue.isEnabled(app.editor.language);
		},
		object: this,
		isAvailable: function (app) {
			return app.currentRobotIndex >= 0;
		}
	});
	this.commands.add("src:stop", {
		action: function (app, modifier) {
			app.stopRobot();
		},
		isEnabled: function (app) {
			return app.canStopRobot();
		},
		object: this,
		isAvailable: function (app) {
			return app.currentRobotIndex >= 0;
		}
	});
	this.commands.add("src:connected", {
		isEnabled: function (app) {
			return !app.program.noVPL && app.currentRobotIndex >= 0 &&
				app.robots[app.currentRobotIndex].runGlue.isConnected();
		},
		object: this,
		isAvailable: function (app) {
			return app.robots.length > 0;
		},
		possibleStates: [
			{selected: false},
			{selected: true},
			{selected: false, state: "monitored"},
			{selected: true, state: "monitored"},
			{selected: false, state: "nonmonitored"},
			{selected: true, state: "nonmonitored"}
		]
	});
	this.commands.add("src:sim", {
		action: function (app, modifier) {
			if (app.multipleViews) {
				app.setView(["sim"], {openView: true});
			} else {
				app.setView(["sim"], {fromView: "src"});
			}
		},
		object: this,
		isAvailable: function (app) {
			return app.robots.find(function (r) { return r.name === "sim"; }) != null && app.sim2d != null &&
				app.views.indexOf("sim") < 0;
		}
	});
	this.commands.add("src:teacher-reset", {
		action: function (app, modifier) {
			app.editor.resetUI();
			app.renderSourceEditorToolbar();
		},
		object: this,
		keep: true,
		isAvailable: function (app) {
			return app.editor.teacherRole && app.editor.uiConfig.toolbarCustomizationMode;
		}
	});
	this.commands.add("src:teacher", {
		action: function (app, modifier) {
			app.editor.uiConfig.toolbarCustomizationMode = !app.editor.uiConfig.toolbarCustomizationMode;
			app.renderSourceEditorToolbar();
		},
		isSelected: function (app) {
			return app.editor.uiConfig.toolbarCustomizationMode;
		},
		object: this,
		keep: true,
		isAvailable:  function (app) {
			return app.editor.teacherRole;
		},
		possibleStates: [
			{selected: false},
			{selected: true}
		]
	});
};
