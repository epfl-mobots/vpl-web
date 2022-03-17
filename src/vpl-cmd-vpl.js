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

Definition of a A3a.vpl.Application method to populate the collection of
commands with commands related to the VPL programming view.

*/

/** Install commands for program
	@return {void}
*/
A3a.vpl.Application.prototype.addVPLCommands = function () {

	/** Get program filename without suffix
		@param {A3a.vpl.Application} app
		@return {string}
	*/
	function baseFilename(app) {
		var filename = app.program.filename || A3a.vpl.Program.defaultFilename;
		return filename.slice(-A3a.vpl.Program.suffix.length - 1) === "." + A3a.vpl.Program.suffix
			? filename.slice(0, -A3a.vpl.Program.suffix.length - 1)
			: filename;
	}

	this.commands.add("vpl:close", {
		action: function (app, modifier) {
			app.setView(["vpl"], {closeView: true});
		},
		object: this,
		isAvailable: function (app) {
			return app.views.length > 1 && app.views.indexOf("vpl") >= 0;
		},
		keyShortcut: "w"
	});
	this.commands.add("vpl:about", {
		action: function (app, modifier) {
			app.aboutBox.show();
		},
		object: this,
		isAvailable: function (app) {
			return app.aboutBox != null;
		},
		keyShortcut: "i"
	});
	this.commands.add("vpl:help", {
		action: function (app, modifier) {
			app.helpBox.show();
		},
		object: this,
		isAvailable: function (app) {
			return app.helpBox != null;
		},
		keyShortcut: "?"
	});
	this.commands.add("vpl:statement", {
		action: function (app, modifier) {
			app.statementBox.show();
		},
		object: this,
		isAvailable: function (app) {
			return app.statementBox != null;
		}
	});
	this.commands.add("vpl:readonly", {
		isEnabled: function (app) {
			return false;
		},
		object: this,
		isAvailable: function (app) {
			return app.program.readOnly || app.program.noVPL;
		}
	});
	this.commands.add("vpl:suspend", {
		action: function (app, modifier) {
			app.suspended = !app.suspended;
			if (app.suspended) {
				if (app.canStopRobot()) {
					app.stopRobot(true);
					app.program.uploaded = false;
				}
				app.suspendBox.show();
			} else {
				app.suspendBox.hide();
			}
		},
		isSelected: function (app) {
			return app.suspended;
		},
		object: this,
		isAvailable: function (app) {
			return app.program.teacherRole === A3a.vpl.Program.teacherRoleType.student &&
				app.suspendBox != null;
		}
	});
	this.commands.add("vpl:new", {
		action: function (app, modifier) {
			app.newVPL();
			if (app.jsonForNew) {
				app.loadProgramJSON(app.jsonForNew);
			}
			app.program.saveStateAfterChange();
			app.renderProgramToCanvas();
		},
		isEnabled: function (app) {
			return !app.program.noVPL && !app.program.readOnly &&
				(app.program.filename != null || !app.program.isEmpty());
		},
		object: this,
		isAvailable: function (app) {
			return !app.program.readOnly;
		},
		keyShortcut: "n"
	});
	this.commands.add("vpl:save", {
		action: function (app, modifier) {
			if (modifier) {
				var html = app.toHTMLDocument(app.css);
				A3a.vpl.Program.downloadText(html, baseFilename(app) + ".html", "text/html");
			} else {
				var json = app.program.exportToJSON({lib: true, prog: true});
				A3a.vpl.Program.downloadText(json,
					app.program.filename || A3a.vpl.Program.defaultFilename,
					A3a.vpl.Program.mimetype);
			}
		},
		isEnabled: function (app) {
			return !app.program.noVPL && !app.program.isEmpty();
		},
		object: this,
		isAvailable: function (app) {
			return !app.program.readOnly;
		},
		keyShortcut: "s"
	});
	this.commands.add("vpl:load", {
		action: function (app, modifier) {
			app.loadBox.show("Open program file",
				".aesl,.json,." + A3a.vpl.Program.suffix + ",." + A3a.vpl.Program.suffixUI + ",.zip",
				function (file) {
					app.loadProgramFile(file);
					app.program.saveStateAfterChange();
				});
		},
		isEnabled: function (app) {
			return !app.program.noVPL && !app.program.readOnly;
		},
		object: this,
		isAvailable: function (app) {
			return !app.program.readOnly;
		},
		keyShortcut: "o"
	});
	this.commands.add("vpl:upload", {
		action: function (app, modifier) {
			var json = app.program.exportToJSON({lib: false, prog: true});
			window["vplUpload"](app.program.filename, json);
			app.program.uploadedToServer = true;
			app.programNotUploadedToServerYet = false;
		},
		isEnabled: function (app) {
			return !app.program.noVPL && !app.program.readOnly && !app.program.isEmpty();
		},
		isSelected: function (app) {
			return app.program.uploadedToServer;
		},
		getState: function (app) {
			if (app.program.isEmpty()) {
				return "empty";
			} else if (app.program.uploadedToServer) {
				return "uploaded";
			} else {
				if (app.programNotUploadedToServerYet) {
					return "canUpload";
				} else {
					return "canUploadAgain";
				}
			}
		},
		object: this,
		isAvailable: function (app) {
			return window["vplUpload"] != null && !app.program.readOnly;
		}
	});
	this.commands.add("vpl:nextProgram", {
		action: function (app, modifier) {
			var json = app.program.exportToJSON({lib: false, prog: true});
			var nextJson = window["vplNextProgram"](app.program.filename, json);
			app.loadProgramJSON(nextJson);
			var parsedJson = JSON.parse(nextJson);
			app.program.filename = parsedJson["filename"] || A3a.vpl.Program.defaultFilename;
		},
		isEnabled: function (app) {
			return window["vplNextProgram"](app.program.filename, null) != null;
		},
		object: this,
		isAvailable: function (app) {
			return window["vplNextProgram"] != null;
		}
	});
	this.commands.add("vpl:exportToHTML", {
		action: function (app, modifier) {
			if (modifier) {
				var html = app.uiToHTMLDocument(app.css);
				A3a.vpl.Program.downloadText(html, "vpl-ui.html", "text/html");
			} else {
				var html = app.toHTMLDocument(app.css);
				var filename = baseFilename(app) + ".html";
				A3a.vpl.Program.downloadText(html, filename, "text/html");
			}
		},
		isEnabled: function (app) {
			return !app.program.noVPL && !app.program.isEmpty();
		},
		object: this,
		keyShortcut: "h"
	});
	this.commands.add("vpl:text", {
		action: function (app, modifier) {
			if (app.multipleViews) {
				app.setView(["src"], {openView: true});
			} else {
				app.setView(["src"], {fromView: "vpl"});
			}
		},
		isEnabled: function (app) {
			return !app.program.noVPL;
		},
		doDrop: function (app, draggedItem) {
			if (draggedItem.data instanceof A3a.vpl.Block && draggedItem.data.ruleContainer) {
				var block = /** @type {A3a.vpl.Block} */(draggedItem.data);
				var span = app.program.getCodeLocation(app.program.currentLanguage, block);
				if (span) {
					app.setView(["src"]);
					app.editor.selectRange(span.begin, span.end);
				}
			} else if (draggedItem.data instanceof A3a.vpl.Rule) {
				var rule = /** @type {A3a.vpl.Rule} */(draggedItem.data);
				var span = app.program.getCodeLocation(app.program.currentLanguage, rule);
				if (span) {
					app.setView(["src"]);
					app.editor.selectRange(span.begin, span.end);
				}
			}
		},
		canDrop: function (app, draggedItem) {
			return draggedItem.data instanceof A3a.vpl.Block && draggedItem.data.ruleContainer != null ||
				draggedItem.data instanceof A3a.vpl.Rule;
		},
		object: this,
		isAvailable: function (app) {
			return app.editor && app.views.indexOf("src") < 0;
		}
	});
	this.commands.add("vpl:text-toggle", {
		action: function (app, modifier) {
			app.setView(["src"], {toggle: true});
		},
		isEnabled: function (app) {
			return !app.program.noVPL;
		},
		isSelected: function (app) {
			return app.views.indexOf("src") >= 0;
		},
		object: this,
		possibleStates: [
			{selected: false},
			{selected: true}
		]
	});
	this.commands.add("vpl:advanced", {
		action: function (app, modifier) {
			app.program.setMode(app.program.mode === A3a.vpl.mode.basic
				? A3a.vpl.mode.advanced
				: A3a.vpl.mode.basic);
			app.setHelpForCurrentAppState();
		},
		isEnabled: function (app) {
			return !app.program.noVPL && !app.program.readOnly;
		},
		isSelected: function (app) {
			return app.program.mode === A3a.vpl.mode.advanced;
		},
		object: this,
		isAvailable: function (app) {
			return A3a.vpl.Program.advancedModeEnabled && !app.program.readOnly;
		},
		possibleStates: [
			{selected: false},
			{selected: true}
		]
	});
	this.commands.add("vpl:undo", {
		action: function (app, modifier) {
			app.program.undo(function () {
				app.renderProgramToCanvas();
				app.program.saveStateAfterChange();
			});
		},
		isEnabled: function (app) {
			return !app.program.noVPL && app.program.undoState.canUndo();
		},
		object: this,
		isAvailable: function (app) {
			return !app.program.readOnly;
		},
		keyShortcut: "z"
	});
	this.commands.add("vpl:redo", {
		action: function (app, modifier) {
			app.program.redo(function () {
				app.renderProgramToCanvas();
				app.program.saveStateAfterChange();
			});
		},
		isEnabled: function (app) {
			return !app.program.noVPL && app.program.undoState.canRedo();
		},
		object: this,
		isAvailable: function (app) {
			return !app.program.readOnly;
		},
		keyShortcut: "y"
	});
	this.commands.add("vpl:add-comment", {
		action: function (app, modifier) {
			app.program.saveStateBeforeChange();
			var position = app.kbdControl.targetType === A3a.vpl.KbdControl.ObjectType.rule ? app.kbdControl.targetIndex1 : null;
			position = app.program.addComment("", position, true);
			app.program.saveStateAfterChange();
			app.editComment(position);
			app.renderProgramToCanvas();
		},
		isEnabled: function (app) {
			return !app.program.noVPL;
		},
		object: this,
		isAvailable: function (app) {
			return !app.program.readOnly;
		}
	});
	this.commands.add("vpl:run", {
		action: function (app, modifier) {
			var code = app.program.getCode(app.program.currentLanguage);
			app.robots[app.currentRobotIndex].runGlue.run(code, app.program.currentLanguage);
			app.program.uploaded = true;
			app.program.notUploadedYet = false;
		},
		isEnabled: function (app) {
			if (app.program.noVPL || !app.robots[app.currentRobotIndex].runGlue.isEnabled(app.program.currentLanguage)) {
				return false;
			}
			var error = app.program.getError();
 			return error == null || error.isWarning;
		},
		isSelected: function (app) {
			return app.program.uploaded;
		},
		getState: function (app) {
			if (app.program.isEmpty()) {
				return "empty";
			} else if (app.program.uploaded) {
				return "running";
			} else {
				var error = app.program.getError();
 				if (error && !error.isWarning) {
					return "error";
				} else if (app.program.notUploadedYet) {
					return "canLoad";
				} else {
					return "canReload";
				}
			}
		},
		doDrop: function (app, draggedItem) {
			if (draggedItem.data instanceof A3a.vpl.Block) {
				if (draggedItem.data.ruleContainer) {
					// action from an event handler: just send it
					var code = app.program.codeForBlock(/** @type {A3a.vpl.Block} */(draggedItem.data), app.program.currentLanguage);
					app.robots[app.currentRobotIndex].runGlue.run(code, app.program.currentLanguage);
				} else {
					// action from the templates: display in a zoomed state to set the parameters
					// (disabled by canDrop below)
					app.vplCanvas.zoomedItemProxy = app.vplCanvas.makeZoomedClone(draggedItem);
				}
			} else if (draggedItem.data instanceof A3a.vpl.Rule) {
				var code = app.program.codeForActions(/** @type {A3a.vpl.Rule} */(draggedItem.data), app.program.currentLanguage);
				app.robots[app.currentRobotIndex].runGlue.run(code, app.program.currentLanguage);
			}
		},
		canDrop: function (app, draggedItem) {
			return app.currentRobotIndex >= 0 &&
				app.robots[app.currentRobotIndex].runGlue.isEnabled(app.program.currentLanguage) &&
				draggedItem.data instanceof A3a.vpl.Rule &&
						/** @type {A3a.vpl.Rule} */(draggedItem.data).hasBlockOfType(A3a.vpl.blockType.action) ||
				draggedItem.data instanceof A3a.vpl.Block &&
					/** @type {A3a.vpl.Block} */(draggedItem.data).ruleContainer != null &&
					/** @type {A3a.vpl.Block} */(draggedItem.data).blockTemplate.type ===
						A3a.vpl.blockType.action;
		},
		object: this,
		isAvailable: function (app) {
			return app.currentRobotIndex >= 0;
		},
		possibleStates: [
			{selected: false},
			{selected: true},
			{state: "empty"},
			{state: "running"},
			{state: "error"},
			{state: "canLoad"},
			{state: "canReload"}
		],
		keyShortcut: "r"
	});
	this.commands.add("vpl:stop", {
		action: function (app, modifier) {
			app.stopRobot();
			app.program.uploaded = false;
		},
		isEnabled: function (app) {
			return app.canStopRobot();
		},
		object: this,
		isAvailable: function (app) {
			return app.currentRobotIndex >= 0;
		},
		keyShortcut: "."
	});
	this.commands.add("vpl:stop-abnormally", {
		action: function (app, modifier) {
			app.stopRobot(true);
			app.program.uploaded = false;
		},
		isEnabled: function (app) {
			return app.canStopRobot();
		},
		object: this,
		isAvailable: function (app) {
			return app.currentRobotIndex >= 0;
		}
	});
	this.commands.add("vpl:slowdown", {
		action: function (app, modifier) {
			/** @const */
			var s = [0.1, 0.2, 0.5, 1];
			app.program.setSlowdownFactor(s[(s.indexOf(app.program.slowdownFactor) + 1) % s.length]);
		},
		isSelected: function (app) {
			return app.program.slowdownFactor !== 1;
		},
		getState: function (app) {
			return app.program.slowdownFactor;
		},
		object: this,
		possibleStates: [
			{selected: true, state: 0.1},
			{selected: true, state: 0.2},
			{selected: true, state: 0.5},
			{selected: false, state: 1}
		],
		isAvailable: function (app) {
			// same as vpl:run
			return app.currentRobotIndex >= 0;
		}
	});
	this.commands.add("vpl:debug", {
		// not implemented yet
		action: function (app) {
		},
		isSelected: function (app) {
			return false;
		},
		object: this,
		isAvailable: function (app) {
			return false;
		},
		possibleStates: [
			{selected: false},
			{selected: true}
		]
	});
	this.commands.add("vpl:flash", {
		action: function (app, modifier) {
			var code = app.program.getCode(app.program.currentLanguage);
			app.robots[app.currentRobotIndex].runGlue.flash(code, app.program.currentLanguage);
			app.program.flashed = true;
		},
		isEnabled: function (app) {
			if (app.program.noVPL || !app.robots[app.currentRobotIndex].runGlue.canFlash(app.program.currentLanguage)) {
				return false;
			}
			var error = app.program.getError();
 			return error == null || error.isWarning;
		},
		isSelected: function (app) {
			return app.program.flashed;
		},
		object: this,
		isAvailable: function (app) {
			return app.currentRobotIndex >= 0 && app.robots[app.currentRobotIndex].runGlue.isFlashAvailable();
		}
	});
	this.commands.add("vpl:connected", {
		isSelected: function (app) {
			return !app.program.noVPL && app.robots[app.currentRobotIndex].runGlue.isConnected();
		},
		getState: function (app) {
			return app.supervisorConnected ? "monitored"
 				: app.supervisorConnected === false ? "nonmonitored" : "";
		},
		object: this,
		isAvailable: function (app) {
			return app.currentRobotIndex >= 0;
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
	this.commands.add("vpl:robot", {
		action: function (app) {
			app.currentRobotIndex = (app.currentRobotIndex + 1) % app.robots.length;
		},
		getState: function (app) {
			return app.robots[app.currentRobotIndex].name;
		},
		object: this,
		isAvailable: function (app) {
			return app.robots.length > 1;
		}
	});
	this.commands.add("vpl:volume", {
		action: function (app) {
			// switch to next volume value (unset, muted, min, ..., max)
			var values = [null, 8, 7, 6, 5, 4, 3, 2, 1, 0];
			app.program.volume = values[(values.indexOf(app.program.volume) + 1) % values.length];
		},
		isSelected: function (app) {
			return app.program.volume !== null;
		},
		getState: function (app) {
			return app.program.volume === null ? "" : app.program.volume.toString(10);
		},
		object: this,
		possibleStates: [
			{selected: false, state: ""},
			{selected: true, state: "8"},
			{selected: true, state: "7"},
			{selected: true, state: "6"},
			{selected: true, state: "5"},
			{selected: true, state: "4"},
			{selected: true, state: "3"},
			{selected: true, state: "2"},
			{selected: true, state: "1"},
			{selected: true, state: "0"}
		]
	});
	this.commands.add("vpl:sim", {
		action: function (app, modifier) {
			if (app.multipleViews) {
				app.setView(["sim"], {openView: true});
			} else {
				app.setView(["sim"], {fromView: "vpl"});
			}
		},
		isEnabled: function (app) {
			return !app.program.noVPL;
		},
		object: this,
		isAvailable: function (app) {
			return app.currentRobotIndex >= 0 && app.sim2d != null &&
				app.views.indexOf("sim") < 0;
		}
	});
	this.commands.add("vpl:duplicate", {
		isEnabled: function (app) {
			return !app.program.noVPL;
		},
		doDrop: function (app, draggedItem) {
			// duplicate event handler
			var i = app.program.program.indexOf(draggedItem.data);
			if (i >= 0) {
				app.program.saveStateBeforeChange();
				app.program.program.splice(i + 1, 0, draggedItem.data.copy());
				app.program.saveStateAfterChange();
				app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
				app.log();
			}
		},
		canDrop: function (app, draggedItem) {
			return draggedItem.data instanceof A3a.vpl.Rule &&
				!/** @type {A3a.vpl.Rule} */(draggedItem.data).isEmpty();
		},
		object: this,
		isAvailable: function (app) {
			return !app.program.readOnly;
		}
	});
	this.commands.add("vpl:disable", {
		isEnabled: function (app) {
			return !app.program.noVPL;
		},
		doDrop: function (app, draggedItem) {
			// disable or reenable block or event handler
			if (draggedItem.data instanceof A3a.vpl.Block) {
				app.program.saveStateBeforeChange();
				draggedItem.data.disabled = !draggedItem.data.disabled;
				app.program.saveStateAfterChange();
				app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
				app.log();
			} else if (draggedItem.data instanceof A3a.vpl.Rule) {
				app.program.saveStateBeforeChange();
				draggedItem.data.toggleDisable();
				app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
				app.log();
			}
		},
		canDrop: function (app, draggedItem) {
			// accept non-empty event handler or block in event handler
			return draggedItem.data instanceof A3a.vpl.Rule
				? !/** @type {A3a.vpl.Rule} */(draggedItem.data).isEmpty()
				: draggedItem.data instanceof A3a.vpl.Block &&
					draggedItem.data.ruleContainer !== null;
		},
		object: this,
		isAvailable: function (app) {
			return !app.program.readOnly;
		}
	});
	this.commands.add("vpl:lock", {
		isEnabled: function (app) {
			return !app.program.noVPL;
		},
		doDrop: function (app, draggedItem) {
			// lock or unlock block or event handler
			if (draggedItem.data instanceof A3a.vpl.Block) {
				app.program.saveStateBeforeChange();
				draggedItem.data.locked = !draggedItem.data.locked;
				app.program.saveStateAfterChange();
				app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
				app.log();
			} else if (draggedItem.data instanceof A3a.vpl.Rule) {
				app.program.saveStateBeforeChange();
				draggedItem.data.locked = !draggedItem.data.locked;
				app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
				app.log();
			}
		},
		canDrop: function (app, draggedItem) {
			// accept non-empty event handler or block in event handler
			return draggedItem.data instanceof A3a.vpl.Rule
				? !/** @type {A3a.vpl.Rule} */(draggedItem.data).isEmpty()
				: draggedItem.data instanceof A3a.vpl.Block &&
					draggedItem.data.ruleContainer !== null;
		},
		object: this,
		isAvailable: function (app) {
			return app.program.experimentalFeatures &&
				app.program.teacherRole === A3a.vpl.Program.teacherRoleType.teacher &&
				!app.program.readOnly;
		}
	});
	this.commands.add("vpl:trashcan", {
		isEnabled: function (app) {
			return !app.program.noVPL;
		},
		doDrop: function (app, draggedItem) {
			// remove block or event handler
			if (draggedItem.data instanceof A3a.vpl.Block) {
				if (draggedItem.data.ruleContainer !== null) {
					app.program.saveStateBeforeChange();
					draggedItem.data.ruleContainer.removeBlock(
						/** @type {A3a.vpl.positionInContainer} */(draggedItem.data.positionInContainer));
					app.program.saveStateAfterChange();
					app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
					app.log();
				}
			} else if (draggedItem.data instanceof A3a.vpl.Rule) {
				var i = app.program.program.indexOf(draggedItem.data);
				if (i >= 0) {
					app.program.saveStateBeforeChange();
					app.program.program.splice(i, 1);
					app.program.saveStateAfterChange();
					app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
					app.log();
				}
			}
		},
		canDrop: function (app, draggedItem) {
			// accept non-empty unlocked event handler or block in event handler
			return draggedItem.data instanceof A3a.vpl.Block
				? draggedItem.data.ruleContainer !== null && !draggedItem.data.locked
				: draggedItem.data instanceof A3a.vpl.Rule &&
					(!/** @type {A3a.vpl.Rule} */(draggedItem.data).isEmpty() ||
 						app.program.program.indexOf(draggedItem.data) + 1 < app.program.program.length) &&
 					!/** @type {A3a.vpl.Rule} */(draggedItem.data).locked;
		},
		object: this,
		isAvailable: function (app) {
			return !app.program.readOnly;
		}
	});
	this.commands.add("vpl:message-error", {
		isEnabled: function (app) {
			return false;
		},
		getState: function (app) {
			return app.vplMessage;
		},
		object: this,
		isAvailable: function (app) {
			return app.vplMessage && !app.vplMessageIsWarning;
		}
	});
	this.commands.add("vpl:message-warning", {
		isEnabled: function (app) {
			return false;
		},
		getState: function (app) {
			return app.vplMessage;
		},
		object: this,
		isAvailable: function (app) {
			return app.vplMessage && app.vplMessageIsWarning;
		}
	});
	this.commands.add("vpl:message-empty", {
		isEnabled: function (app) {
			return false;
		},
		object: this,
		isAvailable: function (app) {
			return !app.vplMessage;
		}
	});
	this.commands.add("vpl:filename", {
		action: function (app, modifier) {
			if (!app.program.fixedFilename) {
				app.startTextField({
					initialValue: app.program.filename || A3a.vpl.Program.defaultFilename,
					suffix: "." + A3a.vpl.Program.suffix,
					display: function (str, selBegin, selEnd) {
						app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
					},
					finish: function (str) {
						if (str !== null) {
							app.program.saveStateBeforeChange();
							app.program.filename = str;
						}
						app.textField = null;
						app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
					},
					ref: app.program
				});
			}
		},
		isEnabled: function (app) {
			return !app.program.fixedFilename;
		},
		getState: function (app) {
			return app.program.fixedFilename
			 	? (app.program.filename || A3a.vpl.Program.defaultFilename) + (app.username ? "\n" + app.username : "")
				: app.program.filename || A3a.vpl.Program.defaultFilename;
		},
		object: this,
		isAvailable: function (app) {
			return app.program.filename || app.username || !app.program.fixedFilename ? true : false;
		}
	});
	this.commands.add("vpl:teacher", {
		action: function (app, modifier) {
			app.program.uiConfig.blockCustomizationMode = !app.program.uiConfig.blockCustomizationMode;
			if (app.program.teacherRole === A3a.vpl.Program.teacherRoleType.teacher) {
				app.program.uiConfig.toolbarCustomizationMode = app.program.uiConfig.blockCustomizationMode;
			} else {
				app.program.uiConfig.toolbarCustomizationDisabled = app.program.uiConfig.blockCustomizationMode;
			}
			if (!app.program.uiConfig.blockCustomizationMode) {
				app.setHelpForCurrentAppState();
				if (app.vplToolbarConfig.indexOf("vpl:teacher-setasnew") < 0 &&
					app.vplToolbar2Config.indexOf("vpl:setasnew") < 0) {
					// no "vpl:setasnew" button in any vpl toolbar:
					// do it automatically when quitting configuration mode
					app.commands.execute("vpl:teacher-setasnew");
				}
			}
		},
		isEnabled: function (app) {
			return !app.program.noVPL && !app.program.readOnly;
		},
		isSelected: function (app) {
			return app.program.uiConfig.blockCustomizationMode;
		},
		object: this,
		keep: true,
		isAvailable: function (app) {
			return app.program.teacherRole !== A3a.vpl.Program.teacherRoleType.student &&
				!app.program.readOnly;
		},
		possibleStates: [
			{selected: false},
			{selected: true}
		]
	});
	this.commands.add("vpl:teacher-reset", {
		action: function (app, modifier) {
			if (modifier) {
				A3a.vpl.Program.enableAllBlocks(app.program.mode);
				app.program.enabledBlocksBasic = A3a.vpl.Program.basicBlocks;
				app.program.enabledBlocksAdvanced = A3a.vpl.Program.advancedBlocks;
			} else {
				A3a.vpl.Program.resetBlockLib();
				app.program.new();
				app.program.resetUI();
			}
		},
		isEnabled: function (app) {
			return !app.program.noVPL;
		},
		object: this,
		keep: true,
		isAvailable: function (app) {
			return app.program.teacherRole !== A3a.vpl.Program.teacherRoleType.student &&
				app.program.uiConfig.blockCustomizationMode && !app.program.readOnly;
		}
	});
	this.commands.add("vpl:teacher-save", {
		action: function (app, modifier) {
			var json = app.program.exportToJSON({lib: true, prog: false});
			A3a.vpl.Program.downloadText(json,
				A3a.vpl.Program.defaultFilenameUI,
				A3a.vpl.Program.mimetypeUI);
		},
		isEnabled: function (app) {
			return !app.program.noVPL;
		},
		object: this,
		keep: true,
		isAvailable: function (app) {
			return app.program.teacherRole !== A3a.vpl.Program.teacherRoleType.student &&
				app.program.uiConfig.blockCustomizationMode && !app.program.readOnly;
		}
	});
	this.commands.add("vpl:teacher-setasnew", {
		action: function (app, modifier) {
			var json = app.program.exportToJSON({lib: true, prog: false});
			app.jsonForNew = app.jsonForNew === json ? null : json;
		},
		isSelected: function (app) {
			return app.jsonForNew === app.program.exportToJSON({lib: true, prog: false});
		},
		object: this,
		keep: true,
		isAvailable: function (app) {
			return app.program.teacherRole !== A3a.vpl.Program.teacherRoleType.student &&
				app.program.uiConfig.blockCustomizationMode && !app.program.readOnly;
		},
		possibleStates: [
			{selected: false},
			{selected: true}
		]
	});
};
