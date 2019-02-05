/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** Install commands for program
	@param {A3a.vpl.Commands} commands
	@param {A3a.vpl.Canvas} canvas
	@param {A3a.vpl.VPLSourceEditor} editor
	@param {A3a.vpl.RunGlue} runglue
	@return {void}
*/
A3a.vpl.Program.prototype.addVPLCommands = function (commands, canvas, editor, runglue) {
	commands.add("vpl:new", {
		action: function (program, modifier) {
			program.new();
		},
		object: this
	});
	commands.add("vpl:save", {
		action: function (program, modifier) {
			// var aesl = program.exportAsAESLFile();
			// A3a.vpl.Program.downloadText(aesl, "vpl.aesl");
			var json = program.exportToJSON();
			A3a.vpl.Program.downloadText(json, "vpl.json", "application/json");
		},
		isEnabled: function (program) {
			return !program.isEmpty();
		},
		object: this
	});
	commands.add("vpl:upload", {
		action: function (program, modifier) {
			var aesl = program.exportAsAESLFile();
			// ...
		},
		isEnabled: function (program) {
			return !program.isEmpty();
		},
		object: this,
		isAvailable: function (program) {
			return window["vplStorageSetFunction"] != null;
		}
	});
	commands.add("vpl:text", {
		action: function (program, modifier) {
			A3a.vpl.Program.setView("src");
		},
		doDrop: function (program, draggedItem) {
			if (draggedItem.data instanceof A3a.vpl.Block && draggedItem.data.eventHandlerContainer) {
				var block = /** @type {A3a.vpl.Block} */(draggedItem.data);
				var span = program.getCodeLocation(program.currentLanguage, block);
				if (span) {
					A3a.vpl.Program.setView("src");
					editor.selectRange(span.begin, span.end);
				}
			} else if (draggedItem.data instanceof A3a.vpl.EventHandler) {
				var eventHandler = /** @type {A3a.vpl.EventHandler} */(draggedItem.data);
				var span = program.getCodeLocation(program.currentLanguage, eventHandler);
				if (span) {
					A3a.vpl.Program.setView("src");
					editor.selectRange(span.begin, span.end);
				}
			}
		},
		canDrop: function (program, draggedItem) {
			return draggedItem.data instanceof A3a.vpl.Block && draggedItem.data.eventHandlerContainer != null ||
				draggedItem.data instanceof A3a.vpl.EventHandler;
		},
		object: this
	});
	commands.add("vpl:advanced", {
		action: function (program, modifier) {
			program.setMode(program.mode === A3a.vpl.mode.basic
				? A3a.vpl.mode.advanced
				: A3a.vpl.mode.basic);
		},
		isSelected: function (program) {
			return program.mode === A3a.vpl.mode.advanced;
		},
		object: this
	});
	commands.add("vpl:undo", {
		action: function (program, modifier) {
			program.undo(function () { program.renderToCanvas(canvas); });
		},
		isEnabled: function (program) {
			return program.undoState.canUndo();
		},
		object: this
	});
	commands.add("vpl:redo", {
		action: function (program, modifier) {
			program.redo(function () { program.renderToCanvas(canvas); });
		},
		isEnabled: function (program) {
			return program.undoState.canRedo();
		},
		object: this
	});
	commands.add("vpl:run", {
		action: function (program, modifier) {
			var code = program.getCode(program.currentLanguage);
			runglue.run(code, program.currentLanguage);
			program.uploaded = true;
			program.notUploadedYet = false;
		},
		isEnabled: function (program) {
			return runglue.isEnabled(program.currentLanguage);
		},
		isSelected: function (program) {
			return program.uploaded;
		},
		getState: function (program) {
			if (program.program.length === 0) {
				return "empty";
			} else if (program.uploaded) {
				return "running";
			} else if (program.notUploadedYet) {
				return "canLoad";
			} else {
				return "canReload";
			}
		},
		doDrop: function (program, draggedItem) {
			if (draggedItem.data instanceof A3a.vpl.Block) {
				if (draggedItem.data.eventHandlerContainer) {
					// action from an event handler: just send it
					var code = program.codeForBlock(/** @type {A3a.vpl.Block} */(draggedItem.data), program.currentLanguage);
					runglue.run(code, program.currentLanguage);
				} else {
					// action from the templates: display in a zoomed state to set the parameters
					// (disabled by canDrop below)
					canvas.zoomedItemProxy = canvas.makeZoomedClone(draggedItem);
				}
			} else if (draggedItem.data instanceof A3a.vpl.EventHandler) {
				var code = program.codeForActions(/** @type {A3a.vpl.EventHandler} */(draggedItem.data), program.currentLanguage);
				runglue.run(code, program.currentLanguage);
			}
		},
		canDrop: function (program, draggedItem) {
			return runglue.isEnabled(program.currentLanguage) &&
				draggedItem.data instanceof A3a.vpl.EventHandler &&
						/** @type {A3a.vpl.EventHandler} */(draggedItem.data).hasBlockOfType(A3a.vpl.blockType.action) ||
				draggedItem.data instanceof A3a.vpl.Block &&
					/** @type {A3a.vpl.Block} */(draggedItem.data).eventHandlerContainer != null &&
					/** @type {A3a.vpl.Block} */(draggedItem.data).blockTemplate.type ===
						A3a.vpl.blockType.action;
		},
		object: this,
		isAvailable: function (program) {
			return runglue != null;
		}
	});
	commands.add("vpl:stop", {
		action: function (program, modifier) {
			runglue.stop(program.currentLanguage);
			program.uploaded = false;
		},
		isEnabled: function (program) {
			return runglue.isEnabled(program.currentLanguage);
		},
		object: this,
		isAvailable: function (program) {
			return runglue != null;
		}
	});
	commands.add("vpl:sim", {
		action: function (program, modifier) {
			A3a.vpl.Program.setView("sim");
		},
		object: this,
		isAvailable: function (program) {
			return runglue != null && window["vplSim"] != null &&
				window["vplCanvas"].state.view.split("+").indexOf("sim") < 0;
		}
	});
	commands.add("vpl:duplicate", {
		doDrop: function (program, draggedItem) {
			// duplicate event handler
			var i = program.program.indexOf(draggedItem.data);
			if (i >= 0) {
				program.saveStateBeforeChange();
				program.program.splice(i + 1, 0, draggedItem.data.copy());
				canvas.onUpdate && canvas.onUpdate();
			}
		},
		canDrop: function (program, draggedItem) {
            return draggedItem.data instanceof A3a.vpl.EventHandler &&
				!/** @type {A3a.vpl.EventHandler} */(draggedItem.data).isEmpty();
		},
		object: this
	});
	commands.add("vpl:disable", {
		doDrop: function (program, draggedItem) {
			// disable or reenable block or event handler
			if (draggedItem.data instanceof A3a.vpl.Block) {
				program.saveStateBeforeChange();
				draggedItem.data.disabled = !draggedItem.data.disabled;
				canvas.onUpdate && canvas.onUpdate();
			} else if (draggedItem.data instanceof A3a.vpl.EventHandler) {
				program.saveStateBeforeChange();
				draggedItem.data.toggleDisable();
				canvas.onUpdate && canvas.onUpdate();
			}
		},
		canDrop: function (program, draggedItem) {
			// accept non-empty event handler or block in event handler
			return draggedItem.data instanceof A3a.vpl.EventHandler
				? !/** @type {A3a.vpl.EventHandler} */(draggedItem.data).isEmpty()
				: draggedItem.data instanceof A3a.vpl.Block &&
					draggedItem.data.eventHandlerContainer !== null;
		},
		object: this
	});
	commands.add("vpl:lock", {
		doDrop: function (program, draggedItem) {
			// lock or unlock block or event handler
			if (draggedItem.data instanceof A3a.vpl.Block) {
				program.saveStateBeforeChange();
				draggedItem.data.locked = !draggedItem.data.locked;
				canvas.onUpdate && canvas.onUpdate();
			} else if (draggedItem.data instanceof A3a.vpl.EventHandler) {
				program.saveStateBeforeChange();
				draggedItem.data.locked = !draggedItem.data.locked;
				canvas.onUpdate && canvas.onUpdate();
			}
		},
		canDrop: function (program, draggedItem) {
			// accept non-empty event handler or block in event handler
			return draggedItem.data instanceof A3a.vpl.EventHandler
				? !/** @type {A3a.vpl.EventHandler} */(draggedItem.data).isEmpty()
				: draggedItem.data instanceof A3a.vpl.Block &&
					draggedItem.data.eventHandlerContainer !== null;
		},
		object: this,
		isAvailable: function (program) {
			return this.experimentalFeatures && this.teacherRole;
		}
	});
	commands.add("vpl:trashcan", {
		doDrop: function (program, draggedItem) {
			// remove block or event handler
			if (draggedItem.data instanceof A3a.vpl.Block) {
				if (draggedItem.data.eventHandlerContainer !== null) {
					program.saveStateBeforeChange();
					draggedItem.data.eventHandlerContainer.removeBlock(
						/** @type {A3a.vpl.positionInContainer} */(draggedItem.data.positionInContainer));
					canvas.onUpdate && canvas.onUpdate();
				}
			} else if (draggedItem.data instanceof A3a.vpl.EventHandler) {
				var i = program.program.indexOf(draggedItem.data);
				if (i >= 0) {
					program.saveStateBeforeChange();
					program.program.splice(i, 1);
					canvas.onUpdate && canvas.onUpdate();
				}
			}
		},
		canDrop: function (program, draggedItem) {
			// accept non-empty unlocked event handler or block in event handler
			return draggedItem.data instanceof A3a.vpl.Block
				? draggedItem.data.eventHandlerContainer !== null && !draggedItem.data.locked
				: draggedItem.data instanceof A3a.vpl.EventHandler &&
					!/** @type {A3a.vpl.EventHandler} */(draggedItem.data).isEmpty() &&
 					!/** @type {A3a.vpl.EventHandler} */(draggedItem.data).locked;
		},
		object: this
	});
	commands.add("vpl:teacher", {
		action: function (program, modifier) {
			program.uiConfig.customizationMode = !program.uiConfig.customizationMode;
		},
		isSelected: function (program) {
			return program.uiConfig.customizationMode;
		},
		object: this,
		keep: true,
		isAvailable: function (program) {
			return program.teacherRole;
		}
	});
	commands.add("vpl:teacher-reset", {
		action: function (program, modifier) {
			if (modifier) {
				A3a.vpl.Program.enableAllBlocks(program.mode);
				program.enabledBlocksBasic = A3a.vpl.Program.basicBlocks;
				program.enabledBlocksAdvanced = A3a.vpl.Program.advancedBlocks;
			} else {
				A3a.vpl.Program.resetBlockLib();
				program.new();
				program.resetUI();
			}
		},
		object: this,
		keep: true,
		isAvailable: function (program) {
			return program.teacherRole && program.uiConfig.customizationMode;
		}
	});
	commands.add("vpl:teacher-save", {
		action: function (program, modifier) {
			var json = program.exportToJSON(true);
			A3a.vpl.Program.downloadText(json, "vpl.json", "application/json");
		},
		object: this,
		keep: true,
		isAvailable: function (program) {
			return program.teacherRole && program.uiConfig.customizationMode;
		}
	});
};
