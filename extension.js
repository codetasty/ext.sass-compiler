define(function(require, exports, module) {
	var ExtensionManager = require('core/extensionManager');
	
	var App = require('core/app');
	var FileManager = require('core/fileManager');
	var Utils = require('core/utils');
	
	var Sass = new require('./sass');
	
	var EditorEditors = require('modules/editor/ext/editors');
	var EditorCompiler = require('modules/editor/ext/compiler');
	
	var Extension = ExtensionManager.register({
		name: 'sass-compiler',
	}, {
		compilerName: 'SASS',
		watcher: null,
		sass: null,
		init: function() {
			var self = this;
			
			this.watcher = EditorCompiler.addWatcher(this.name, {
				extensions: ['sass', 'scss'],
				outputExtension: 'css',
				comments: true,
				watch: this.onWatch.bind(this),
			});
			
			this.sass = new Sass(paths.extension + '/sass-compiler/sass.worker.js');
			
			this.sass.importer(function(request, done) {
				var compiler = EditorCompiler.getCompiler(request.options.id);
				
				if (!compiler) {
					return callback(new Error('Compiler crashed.'));
				}
				
				var filename = request.previous === 'stdin' ? request.current : request.resolved;
				var extension = Utils.path.extension(filename);
				
				if (!extension) {
					filename += '.' + Utils.path.extension(compiler.source[0]);
				}
				
				if (request.previous === 'stdin') {
					filename = Utils.path.convert(filename, request.options.path);
				}
				
				FileManager.getCache(compiler.workspaceId, filename, function(data, err) {
					done({
						path: filename,
						content: data,
						error: err ? err.message : undefined
					});
				});
			});
		},
		destroy: function() {
			this.watcher = null;
			EditorCompiler.removeWatcher(this.name);
			
			this.sass.importer(null);
			this.sass.destroy();
			this.sass = null;
		},
		onWatch: function(workspaceId, obj, session, value) {
			EditorCompiler.addCompiler(this.watcher, this.compilerName, workspaceId, obj, function(compiler) {
				compiler.file = this.onFile.bind(this);
			}.bind(this));
		},
		onFile: function(compiler, path, file) {
			var style = Sass.style[compiler.options.style];
			
			if (typeof style === 'undefined') {
				style = Sass.style.compressed;
			}
			
			this.sass.compile(file, {
				style: style,
				importer: {
					id: compiler.id,
					path: path,
				}
			}, function(result) {
				if (result.status) {
					compiler.destroy(new Error(
						result.formatted
					));
					return EditorCompiler.removeCompiler(compiler);
				}
				
				EditorCompiler.saveOutput(compiler, result.text);
			});
		},
	});

	module.exports = Extension;
});