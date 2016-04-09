define(function(require, exports, module) {
	var ExtensionManager = require('code/extensionManager');
	
	var Code = require('code/code');
	var Socket = require('code/socket');
	var Workspace = require('code/workspace');
	var Notification = require('code/notification');
	var Fn = require('code/fn');
	var FileManager = require('code/fileManager');
	
	var Sass = new require('./sass');
	
	var SassWorker = new Sass(appPath + '/extension/sass-compiler/sass.worker.js');
	
	var EditorSession = require('modules/editor/ext/session');
	
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
			
			EditorSession.on('save', function(e) {
				if (self._exts.indexOf(e.storage.extension) !== -1) {
					Extension.compile(e.storage.workspaceId, e.storage.path, e.session.data.getValue());
				}
			});
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
				FileManager.getCache(workspaceId, destination, function(data) {
					Extension.compile(workspaceId, destination, data);
				});
				
				return false;
			}
			
			this.importWorkspace = workspaceId;
			this.importPath = path;
			this._underscores = options.underscores || false;
			
			SassWorker.compile(doc, {
				style: options.style ? Sass.style[options.style] : Sass.style.nested
			}, function(result) {
				if (result.status) {
					Notification.open({
						type: 'error',
						title: 'SASS compilation failed',
						description: result.formatted,
						autoClose: true
					});
					
					return false;
				}
				
				if (options.plugin && Code.extensions[options.plugin]) {
					Code.extensions[options.plugin].plugin(result.text, function(output, error) {
						if (error) {
							Notification.open({
								type: 'error',
								title: 'SASS compilation failed (' + options.plugin + ')',
								description: error.message + ' on line ' + error.line,
								autoClose: true
							});
							return false;
						}
						
						FileManager.saveFile(workspaceId, destination, output, null);
					});
					
					return false;
				}
				
				FileManager.saveFile(workspaceId, destination, result.text, null);
			});
		}
	});

	module.exports = Extension;
});