var Tail = require('tail').Tail;

function ComlogLogWatcher(options) {
	require('comlog-event-handler')(this);

	var	_self = this;
	this.status = null; // null = start, true = off, false = on
	this.debug = false;
	this.traceLog = false;
	this.interval = 10000; // 10 Sekunden
	this.checkInterval = 10000
	this.lines = 1;

	// Private funktionen
	var _running = false, _timer = null, _checkRunning = false, _fw, _downCount = 0;

	if (!options) options = {};
	options.match = options.match || '/ERROR/i';
	options.encoding = options.encoding || 'utf-8';
	options.follow = options.follow || true;
	options.check = options.check || function(opt) { if (opt.activePath != opt.path()) return false; };

	if (_self.debug && !options.logger) options.logger = console;
	if (options.match.substr(0, 1) != '/') options.match = '/'+options.match+'/';
	var tmp = options.match.match(/(\/)(.*)(\/)(.*)/);
	try {
		options.match = new RegExp(tmp[2], tmp[4]);
	} catch (e) {
		if (this.debug) console.error(e.message);
	}

	for(var i in options) {
		// Extracting local options
		if (typeof this[i] != 'undefined') {
			this[i] = options[i];
			delete options[i];
		}
	}

	var _optToFunc = function(opt) {
		if (typeof opt == 'undefined' || opt === null) return function () { return null; };
		if (opt instanceof Function) return opt;

		if (opt.search(/\s*function\s*\(/) > -1) {
			opt = eval("(" + opt + ")");
		}
		else {
			var _f = opt;
			opt = function () { return _f; };
		}

		return opt
	}

	options.path = _optToFunc(options.path);
	options.check = _optToFunc(options.check);

	function _watch() {
		if (_running) return;
		_running = true;

		options.activePath = options.path();

		try {
			_fw = new Tail(options.activePath, options);
			if (_self.debug) console.info("Starting Logfilter for '"+options.activePath+"'");
			_fw.on("line", function(data) {
				if (_self.traceLog) console.log(data);

				// down
				if ((data+'').search(options.match) > -1) {
					if (_self.debug) console.warn("Logfilter '"+options.activePath+"' found "+options.match);
					if (_self.status === true) _self.emit('down');
					_self.status = false;
					_downCount = 0;
				}
				// up
				else {
					if (_self.status === false) {
						_downCount++;
						_self.status = _downCount > _self.lines;
						if (_self.status) {
							if (_self.debug) console.info("Logfilter '"+options.activePath+"' check ok");
							_self.emit('up');
						} else {
							if (_self.debug) console.info("Logfilter '"+options.activePath+"' check no change");
						}
					} else {
						_self.status = true;
						if (_self.debug) console.info("Logfilter '"+options.activePath+"' check ok");
					}
				}
			});

			_fw.on("error", function(err) {
				if (_self.debug) console.error(err.stack || err);
				_self.emit('error', [new Error("Error by watching \""+options.activePath+"\"\n"+err.message)]);
				if (_self.status === true) _self.emit('down');
				_self.status = false;

				_running = false;
				_timer = setTimeout(_watch, _self.interval);
			});
		} catch (err) {
			if (_self.debug) console.error(err.stack || err);
			_self.emit('error', [new Error("Error by watching \""+options.activePath+"\"\n"+err.message)]);
			if (_self.status === true) _self.emit('down');
			_self.status = false;

			_running = false;
			_timer = setTimeout(_watch, _self.interval);
		}
	}

	function _check() {
		if (_self.debug) console.info("Check logfilter '"+options.activePath+"'");
		var _cb = function(res) {
			if (res === false) _self.restart();
			else _checkTimer =  setTimeout(_check, _self.checkInterval);
		}

		_cb(options.check(options, _cb));
	}

	this.restart = function () {
		if (_self.debug) console.info("Restarting logfilter '"+options.activePath+"'");
		_self.stop();
		_running = false;
		_self.start();
	}

	/**
	 * Überwachung starten
	 */
	this.start = function() {
		_watch();
		_check();
	};

	/**
	 * Überwachung stoppen
	 */
	this.stop = function() {
		debugger;
		try { if (_timer !== null) clearTimeout(_timer);} catch (e) { console.warn(e.stack); }
		try { if (_checkTimer !== null) clearTimeout(_checkTimer);} catch (e) {console.warn(e.stack);}
		try { if (_fw) _fw.unwatch(); } catch (e) {console.warn(e.stack);}
	};

	for(var i in options) this[i] = options[i];
}

module.exports = ComlogLogWatcher;