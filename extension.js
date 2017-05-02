define(function(require, exports, module) {
	var ExtensionManager = require('core/extensionManager');
	
	var App = require('core/app');
	var Socket = require('core/socket');
	var Workspace = require('core/workspace');
	var Notification = require('core/notification');
	var Fn = require('core/fn');
	var FileManager = require('core/fileManager');
	
	var Sass = new require('./sass');
	
	var SassWorker = new Sass(paths.extension + '/sass-compiler/sass.worker.js');
	
	var EditorEditors = require('modules/editor/ext/editors');
	
	var Extension = ExtensionManager.register({
		name: 'sass-compiler',
		
	}, {
		init: function() {
			var self = this;
			SassWorker.importer(function(request, done) {
				var ext = Fn.pathinfo(Extension.importPath).extension;
				var reqExt = Fn.pathinfo(request.current).extension;
				
				var toLoad = request.current;
				
				if (!reqExt) {
					toLoad += '.' + ext;
				}
				
				if (self._underscores) {
					toLoad = toLoad.split('/');
					toLoad[toLoad.length-1] = '_' + toLoad[toLoad.length-1];
					toLoad = toLoad.join('/');
				}
				
				toLoad = FileManager.parsePath(Extension.importPath, toLoad);
				
				FileManager.getCache(Extension.importWorkspace, toLoad, function(data, err) {
					done({
						path: toLoad,
						content: data,
						error: err ? err.message : null
					});
				});
			});
			
			EditorEditors.on('save', this.onSave);
		},
		destroy: function() {
			EditorEditors.off('save', this.onSave);
		},
		onSave: function(session, value) {
			if (Extension._exts.indexOf(session.storage.extension) !== -1) {
				Extension.compile(session.storage.workspaceId, session.storage.path, value);
			}
		},
		_exts: ['scss', 'sass'],
		_underscores: false,
		importWorkspace: null,
		importPath: '',
		compile: function(workspaceId, path, doc) {
			var self = this;
			var options = FileManager.getFileOptions(doc);
			
			if (!options.out) {
				return false;
			}
			
			var destination = FileManager.parsePath(path, options.out, [this._exts.join('|'), 'css']);
			
			if (!destination) {
				return false;
			}
			
			if (destination.match(/\.(scss|sass)$/)) {
				FileManager.getCache(workspaceId, destination, function(data, err) {
					if (err) {
						return Notification.open({
							type: 'error',
							title: 'SASS compilation failed',
							description: err.message,
							autoClose: true
						});
					}
					
					Extension.compile(workspaceId, destination, data);
				});
				
				return false;
			}
			
			this.importWorkspace = workspaceId;
			this.importPath = path;
			this._underscores = options.underscores || false;
			
			var $notification = Notification.open({
				type: 'default',
				title: 'SASS compilation',
				description: 'Compiling <strong>' + path + '</strong>',
				onClose: function() {
					
				}
			});
			
			SassWorker.compile(doc, {
				style: options.style ? Sass.style[options.style] : Sass.style.nested
			}, function(result) {
				if (result.status) {
					$notification.trigger('close');
					
					Notification.open({
						type: 'error',
						title: 'SASS compilation failed',
						description: result.formatted,
						autoClose: true
					});
					
					return false;
				}
				
				if (options.plugin && App.extensions[options.plugin]) {
					App.extensions[options.plugin].plugin(result.text, function(output, error) {
						if (error) {
							$notification.trigger('close');
							
							Notification.open({
								type: 'error',
								title: 'SASS compilation failed (' + options.plugin + ')',
								description: error.message + ' on line ' + error.line,
								autoClose: true
							});
							return false;
						}
						
						FileManager.save({
							id: workspaceId,
							path: destination,
							data: function() {
								$notification.trigger('close');
							},
							error: function() {
								$notification.trigger('close');
							}
						}, output);
					});
					
					return false;
				}
				
				FileManager.save({
					id: workspaceId,
					path: destination,
					data: function() {
						$notification.trigger('close');
					},
					error: function() {
						$notification.trigger('close');
					}
				}, result.text);
			});
		}
	});

	module.exports = Extension;
});