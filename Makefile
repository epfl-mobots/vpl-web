#	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
#	Miniature Mobile Robots group, Switzerland
#	Author: Yves Piguet
#	For internal use only

.PHONY: main
main:	all

COPYRIGHT = /* Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE - js author Yves Piguet - svg author Maria Beltran */

# Default closure compiler in current directory, used if closure-compiler isn't found
# Update here or build with "make CLOSURECOMPILER=path" to match your environment
# The current version can be found at https://github.com/google/closure-compiler/wiki/Binary-Downloads
CLOSURECOMPILER ?= closure-compiler-v20181028.jar

CLOSURE = $(shell if which closure-compiler >/dev/null; then echo closure-compiler; else echo java -jar $(CLOSURECOMPILER); fi)
CLOSUREFLAGS = \
        --language_in ECMASCRIPT5_STRICT \
        --compilation_level ADVANCED_OPTIMIZATIONS \
        --use_types_for_optimization \
        --warning_level VERBOSE \
        --summary_detail_level 2

CLOSUREDBG = --debug --formatting=PRETTY_PRINT

JS = \
	a3a-ns.js \
	a3a-nodebase.js \
	a3a-nodeproxy.js \
	vpl-ns.js \
	vpl-blocktemplate.js \
	vpl-block.js \
	vpl-emptyblock.js \
	vpl-eventhandler.js \
	vpl-program.js \
	vpl-code-aseba.js \
	vpl-code-l2.js \
	vpl-code-js.js \
	vpl-controlbar.js \
	vpl-program-canvas.js \
	vpl-canvas.js \
	vpl-draw.js \
	vpl-blocklib.js \
	svg.js \
	svg-transform.js \
	vpl-blocklib-svg.js \
	vpl-blocklib-l2.js \
	vpl-blocklib-js.js \
	vpl-error.js \
	vpl-undo.js \
	vpl-aeslfile.js \
	vpl-texteditor.js \
	vpl-sourceedit.js \
	vpl-runglue.js \
	vpl-main.js \
	vpl-robot.js \
	vpl-virtualthymio.js \
	compiler-ns.js \
	compiler-vm.js \
	compiler.js \
	compiler-macros.js \
	compiler-l2.js \
	compiler-macros-l2.js \
	compiler-thymio.js \
	inputbuffer.js \
	a3a-idmapping.js \
	a3a-com.js \
	a3a-device.js \
	a3a-virtual-thymio.js \
	vpl-virtualthymio-a3a.js \
	vpl-sim.js \
	vpl-sim2d.js \
	vpl-thymio.js

.PHONY: all
all: vpl-min.js

vpl-min.js: $(JS)
	( \
		echo "$(COPYRIGHT)"; \
		echo '(function(){'; \
 		$(CLOSURE) $(CLOSUREFLAGS) $^; \
		echo '}).call(this);' \
	) >$@ || (rm -f $@; false)

.PHONY: clean
clean:
	rm -Rf vpl-min.js

.PHONY: oh
oh:
	ohcount $(JS)
