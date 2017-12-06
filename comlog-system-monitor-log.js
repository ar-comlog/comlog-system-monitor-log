var Tail = require('tail').Tail;

function ComlogLogWatcher(options) {
	require('comlog-event-handler')(this);

	var	_self = this;
	this.status = null; // null = start, true = off, false = on
	this.debug = false;
	this.interval = 60000; // 1 Minute
	this.lines = 1;

	// Private funktionen
	var _running = false, _timer = null, _fw, _downCount = 0;

	if (!options) options = {};
	options.match = options.match || '/ERROR/i';
	if (options.match.substr(0, 1) != '/') options.match = '/'+options.match+'/';
	var tmp = options.match.match(/(\/)(.*)(\/)(.*)/);
	try {
		options.match = new RegExp(tmp[2], tmp[4]);
	} catch (e) {
		if (this.debug) console.error(e.message);
	}

	// Extracting local options
	for(var i in options) {
		if (typeof this[i] != 'undefined') {
			this[i] = options[i];
			delete options[i];
		}
	}

	function _watch() {
		if (_running) return;
		_running = true;

		_fw = new Tail(options.path);
		_fw.on("line", function(data) {

			// down
			if ((data+'').search(options.match) > -1) {
				if (_self.debug) console.warn("Logfilter found "+options.match);
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
						if (_self.debug) console.info("Logfilter check ok");
						_self.emit('up');
					} else {
						if (_self.debug) console.info("Logfilter check nothing");
					}
				} else {
					_self.status = true;
					if (_self.debug) console.info("Logfilter check ok");
				}
			}
		});

		_fw.on("error", function(err) {
			if (_self.debug) console.error(err.stack || err);
			_self.emit('error', [new Error("Connection to \""+options.user+'@'+options.host+"\" filed \n"+err.message)]);
			if (_self.status === true) _self.emit('down');
			_self.status = false;

			_running = false;
			_timer = setTimeout(_watch, _self.interval);
		});
	}

	/**
	 * Überwachung starten
	 */
	this.start = function() {
		_watch();
	};

	/**
	 * Überwachung stoppen
	 */
	this.stop = function() {
		try {
			if (_timer !== null) clearInterval(_timer);
			if (_fw) _fw.unwatch();
		} catch (e) {}
	};

	for(var i in options) this[i] = options[i];
}

module.exports = ComlogLogWatcher;