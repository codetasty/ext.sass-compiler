/* global define, $, config */
"use strict";

define(function(require, exports, module) {
	const ExtensionManager = require('core/extensionManager');
	
	const App = require('core/app');
	const FileManager = require('core/fileManager');
	const Utils = require('core/utils');
	
	const Sass = require('./sass');
	
	const EditorEditors = require('modules/editor/ext/editors');
	const EditorCompiler = require('modules/editor/ext/compiler');
	
	class Extension extends ExtensionManager.Extension {
		constructor() {
			super({
				name: 'sass-compiler',
			});
			
			this.sass = null;
			this.watcher = null;
			
			this.compilerName = 'SASS';
		}
		
		init() {
			super.init();
			
			var self = this;
			
			this.watcher = EditorCompiler.addWatcher(this.name, {
				extensions: ['sass', 'scss'],
				outputExtension: 'css',
				comments: true,
				watch: this.onWatch.bind(this),
			});
			
			this.sass = new Sass(config.paths.extension + '/sass-compiler/sass.worker.js?rev=' + this.version);
			
			this.sass.importer((request, done) => {
				var compiler = EditorCompiler.getCompiler(request.options.id);
				
				if (!compiler) {
					return done({error: new Error('Compiler crashed.')});
				}
				
				var filename = request.previous === 'stdin' ? request.current : request.resolved;
				var extension = Utils.path.extension(filename);
				
				if (!extension) {
					filename += '.' + Utils.path.extension(compiler.source[0]);
				}
				
				if (request.previous === 'stdin') {
					filename = Utils.path.convert(filename, request.options.path);
				}
				
				FileManager.getCache(compiler.workspaceId, filename).then(data => {
					// fix SCSS/SASS handling, see https://github.com/medialize/sass.js/pull/73
					this.sass.writeFile(filename, data, () => {
						done({
							path: filename,
						});
					});
				}).catch(e => {
					done({
						path: filename,
						content: null,
						error: e.message,
					});
				});
			});
		}
		
		destroy() {
			super.destroy();
			
			this.watcher = null;
			EditorCompiler.removeWatcher(this.name);
			
			this.sass.importer(null);
			this.sass.destroy();
			this.sass = null;
		}
		
		onWatch(workspaceId, obj, session, value) {
			EditorCompiler.addCompiler(this.watcher, this.compilerName, workspaceId, obj, function(compiler) {
				compiler.file = this.onFile.bind(this);
			}.bind(this));
		}
		
		onFile(compiler, path, file) {
			var style = Sass.style[compiler.options.style];
			
			if (typeof style === 'undefined') {
				style = Sass.style.compressed;
			}
			
			this.sass.compile(file, {
				style: style,
				indentedSyntax: Utils.path.extension(compiler.source[0]) === 'sass',
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
		}
	}

	module.exports = new Extension();
});