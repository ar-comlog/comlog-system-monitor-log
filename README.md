# Watch a Logfile

Installation via
```sh
$ npm install -s comlog-system-monitor-log
```

# Usage
```javascript
var Service = require('comlog-system-monitor-log');

var csmf = new Service({
	path: '/path/to/file.log', // String or function
	// OR path: function() { return '/path/to/file.log'; },
	match: "/ERROR|WARN/i", // Optional (Default /ERROR/i)
	lines: 10, // Optional (Default 1)
	check: "function(conf, cb) { return true; //or cb(true); }" // Optional false == refresh watcher 
});

csmf.on('error', function(err) {
    console.error(err);
});

// bind event
csmf.on('down', function() {
    console.info('Log check Error');
});

// bind event
csmf.on('up', function() {
    console.info('Log check successfull');
});

csmf.start()
```
