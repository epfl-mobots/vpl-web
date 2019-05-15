/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** Install commands for program
	@return {void}
*/
A3a.vpl.Application.prototype.addVPLCommands = function () {
	this.commands.add("vpl:close", {
		action: function (app, modifier) {
			app.setView(["vpl"], {closeView: true});
		},
		object: this,
		isAvailable: function (app) {
			return app.views.length > 1 && app.views.indexOf("vpl") >= 0;
		}
	});
	this.commands.add("vpl:about", {
		action: function (app, modifier) {
			app.aboutBox.show();
		},
		object: this,
		isAvailable: function (app) {
			return app.aboutBox != null;
		}
	});
	this.commands.add("vpl:new", {
		action: function (app, modifier) {
			app.program.new();
		},
		isEnabled: function (app) {
			return !app.program.noVPL && !app.program.isEmpty();
		},
		object: this
	});
	this.commands.add("vpl:save", {
		action: function (app, modifier) {
			if (modifier) {
				var html = app.toHTMLDocument(app.css);
				A3a.vpl.Program.downloadText(html, "vpl-program.html", "text/html");
			} else {
				// var aesl = app.program.exportAsAESLFile();
				// A3a.vpl.Program.downloadText(aesl, "vpl.aesl");
				var json = app.program.exportToJSON({lib: false});
				A3a.vpl.Program.downloadText(json, "vpl.json", "application/json");
			}
		},
		isEnabled: function (app) {
			return !app.program.noVPL && !app.program.isEmpty();
		},
		object: this
	});
	this.commands.add("vpl:load", {
		action: function (app, modifier) {
			app.loadBox.show();
		},
		isEnabled: function (app) {
			return !app.program.noVPL;
		},
		object: this
	});
	this.commands.add("vpl:upload", {
		action: function (app, modifier) {
			var aesl = app.program.exportAsAESLFile();
			// ...
		},
		isEnabled: function (app) {
			return !app.program.noVPL && !app.program.isEmpty();
		},
		object: this,
		isAvailable: function (app) {
			return window["vplStorageSetFunction"] != null;
		}
	});
	this.commands.add("vpl:exportToHTML", {
		action: function (app, modifier) {
			var html = app.toHTMLDocument(app.css);
			A3a.vpl.Program.downloadText(html, "vpl-program.html", "text/html");
		},
		isEnabled: function (app) {
			return !app.program.noVPL && !app.program.isEmpty();
		},
		object: this
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
			if (draggedItem.data instanceof A3a.vpl.Block && draggedItem.data.eventHandlerContainer) {
				var block = /** @type {A3a.vpl.Block} */(draggedItem.data);
				var span = app.program.getCodeLocation(app.program.currentLanguage, block);
				if (span) {
					app.setView(["src"]);
					app.editor.selectRange(span.begin, span.end);
				}
			} else if (draggedItem.data instanceof A3a.vpl.EventHandler) {
				var eventHandler = /** @type {A3a.vpl.EventHandler} */(draggedItem.data);
				var span = app.program.getCodeLocation(app.program.currentLanguage, eventHandler);
				if (span) {
					app.setView(["src"]);
					app.editor.selectRange(span.begin, span.end);
				}
			}
		},
		canDrop: function (app, draggedItem) {
			return draggedItem.data instanceof A3a.vpl.Block && draggedItem.data.eventHandlerContainer != null ||
				draggedItem.data instanceof A3a.vpl.EventHandler;
		},
		object: this,
		isAvailable: function (app) {
			return app.views.indexOf("src") < 0;
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
		object: this
	});
	this.commands.add("vpl:advanced", {
		action: function (app, modifier) {
			app.program.setMode(app.program.mode === A3a.vpl.mode.basic
				? A3a.vpl.mode.advanced
				: A3a.vpl.mode.basic);
		},
		isEnabled: function (app) {
			return !app.program.noVPL;
		},
		isSelected: function (app) {
			return app.program.mode === A3a.vpl.mode.advanced;
		},
		object: this
	});
	this.commands.add("vpl:undo", {
		action: function (app, modifier) {
			app.program.undo(function () { app.renderProgramToCanvas(); });
		},
		isEnabled: function (app) {
			return !app.program.noVPL && app.program.undoState.canUndo();
		},
		object: this
	});
	this.commands.add("vpl:redo", {
		action: function (app, modifier) {
			app.program.redo(function () { app.renderProgramToCanvas(); });
		},
		isEnabled: function (app) {
			return !app.program.noVPL && app.program.undoState.canRedo();
		},
		object: this
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
				if (draggedItem.data.eventHandlerContainer) {
					// action from an event handler: just send it
					var code = app.program.codeForBlock(/** @type {A3a.vpl.Block} */(draggedItem.data), app.program.currentLanguage);
					app.robots[app.currentRobotIndex].runGlue.run(code, app.program.currentLanguage);
				} else {
					// action from the templates: display in a zoomed state to set the parameters
					// (disabled by canDrop below)
					app.vplCanvas.zoomedItemProxy = app.vplCanvas.makeZoomedClone(draggedItem);
				}
			} else if (draggedItem.data instanceof A3a.vpl.EventHandler) {
				var code = app.program.codeForActions(/** @type {A3a.vpl.EventHandler} */(draggedItem.data), app.program.currentLanguage);
				app.robots[app.currentRobotIndex].runGlue.run(code, app.program.currentLanguage);
			}
		},
		canDrop: function (app, draggedItem) {
			return app.robots[app.currentRobotIndex].runGlue.isEnabled(app.program.currentLanguage) &&
				draggedItem.data instanceof A3a.vpl.EventHandler &&
						/** @type {A3a.vpl.EventHandler} */(draggedItem.data).hasBlockOfType(A3a.vpl.blockType.action) ||
				draggedItem.data instanceof A3a.vpl.Block &&
					/** @type {A3a.vpl.Block} */(draggedItem.data).eventHandlerContainer != null &&
					/** @type {A3a.vpl.Block} */(draggedItem.data).blockTemplate.type ===
						A3a.vpl.blockType.action;
		},
		object: this,
		isAvailable: function (app) {
			return app.currentRobotIndex >= 0;
		}
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
		}
	});
	this.commands.add("vpl:connected", {
		isEnabled: function (app) {
			return false;
		},
		isSelected: function (app) {
			return !app.program.noVPL && app.robots[app.currentRobotIndex].runGlue.isConnected();
		},
		object: this,
		isAvailable: function (app) {
			return app.currentRobotIndex >= 0;
		}
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
				app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
			}
		},
		canDrop: function (app, draggedItem) {
            return draggedItem.data instanceof A3a.vpl.EventHandler &&
				!/** @type {A3a.vpl.EventHandler} */(draggedItem.data).isEmpty();
		},
		object: this
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
				app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
			} else if (draggedItem.data instanceof A3a.vpl.EventHandler) {
				app.program.saveStateBeforeChange();
				draggedItem.data.toggleDisable();
				app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
			}
		},
		canDrop: function (app, draggedItem) {
			// accept non-empty event handler or block in event handler
			return draggedItem.data instanceof A3a.vpl.EventHandler
				? !/** @type {A3a.vpl.EventHandler} */(draggedItem.data).isEmpty()
				: draggedItem.data instanceof A3a.vpl.Block &&
					draggedItem.data.eventHandlerContainer !== null;
		},
		object: this
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
				app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
			} else if (draggedItem.data instanceof A3a.vpl.EventHandler) {
				app.program.saveStateBeforeChange();
				draggedItem.data.locked = !draggedItem.data.locked;
				app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
			}
		},
		canDrop: function (app, draggedItem) {
			// accept non-empty event handler or block in event handler
			return draggedItem.data instanceof A3a.vpl.EventHandler
				? !/** @type {A3a.vpl.EventHandler} */(draggedItem.data).isEmpty()
				: draggedItem.data instanceof A3a.vpl.Block &&
					draggedItem.data.eventHandlerContainer !== null;
		},
		object: this,
		isAvailable: function (app) {
			return app.program.experimentalFeatures && app.program.teacherRole;
		}
	});
	this.commands.add("vpl:trashcan", {
		isEnabled: function (app) {
			return !app.program.noVPL;
		},
		doDrop: function (app, draggedItem) {
			// remove block or event handler
			if (draggedItem.data instanceof A3a.vpl.Block) {
				if (draggedItem.data.eventHandlerContainer !== null) {
					app.program.saveStateBeforeChange();
					draggedItem.data.eventHandlerContainer.removeBlock(
						/** @type {A3a.vpl.positionInContainer} */(draggedItem.data.positionInContainer));
					app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
				}
			} else if (draggedItem.data instanceof A3a.vpl.EventHandler) {
				var i = app.program.program.indexOf(draggedItem.data);
				if (i >= 0) {
					app.program.saveStateBeforeChange();
					app.program.program.splice(i, 1);
					app.vplCanvas.onUpdate && app.vplCanvas.onUpdate();
				}
			}
		},
		canDrop: function (app, draggedItem) {
			// accept non-empty unlocked event handler or block in event handler
			return draggedItem.data instanceof A3a.vpl.Block
				? draggedItem.data.eventHandlerContainer !== null && !draggedItem.data.locked
				: draggedItem.data instanceof A3a.vpl.EventHandler &&
					(!/** @type {A3a.vpl.EventHandler} */(draggedItem.data).isEmpty() ||
 						app.program.program.indexOf(draggedItem.data) + 1 < app.program.program.length) &&
 					!/** @type {A3a.vpl.EventHandler} */(draggedItem.data).locked;
		},
		object: this
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
	this.commands.add("vpl:teacher", {
		action: function (app, modifier) {
			app.program.uiConfig.customizationMode = !app.program.uiConfig.customizationMode;
		},
		isEnabled: function (app) {
			return !app.program.noVPL;
		},
		isSelected: function (app) {
			return app.program.uiConfig.customizationMode;
		},
		object: this,
		keep: true,
		isAvailable: function (app) {
			return app.program.teacherRole;
		}
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
			return app.program.teacherRole && app.program.uiConfig.customizationMode;
		}
	});
	this.commands.add("vpl:teacher-save", {
		action: function (app, modifier) {
			var json = app.program.exportToJSON({prog: false});
			A3a.vpl.Program.downloadText(json, "vpl.json", "application/json");
		},
		isEnabled: function (app) {
			return !app.program.noVPL;
		},
		object: this,
		keep: true,
		isAvailable: function (app) {
			return app.program.teacherRole && app.program.uiConfig.customizationMode;
		}
	});
};
