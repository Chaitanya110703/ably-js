"use strict";

var fs = require('fs'),
		path = require('path'),
		shell = require('shelljs'),
		kexec = require('kexec');

module.exports = function (grunt) {
	var test = grunt.option('test'),
			debug = grunt.option('debug'),
			inspector = grunt.option('inspector'),
			fgrep = grunt.option('fgrep'),
			helpers = ['spec/support/modules_helper.js', 'spec/support/test_helper.js'],
			tearDown = ['spec/support/tear_down.js'];

	function getRelativePath(files) {
		return files.map(function(helperPath) {
			var fullPath = path.join(path.dirname(fs.realpathSync(__filename)), '../..', helperPath);
			return path.relative(process.cwd(), fullPath);
		});
	}

	function resolveTests(testString) {
		return testString.split(',').map(function(test) {
			var fullPath = path.join(process.cwd(), test);
			return path.relative(process.cwd(), fullPath);
		});
	}

	grunt.registerTask('mocha:webserver',
		'Run the Mocha web server',
		function() {
			kexec('spec/web_server');
		}
	);

	grunt.registerTask('mocha',
		'Run the Mocha test suite.\nOptions:\n  --test [tests] e.g. --test spec/rest/auth.test.js\n  --debug will debug using standard node debugger\n  --inspector will start with node inspector',
		function() {
			var runTests = getRelativePath(helpers).concat(['spec/realtime/*.test.js', 'spec/rest/*.test.js']).concat(getRelativePath(tearDown)).join(' ');
			grunt.log.writeln("Running Mocha test suite against " + (test ? test : 'all tests'));

			if (test) {
				runTests = getRelativePath(helpers).concat(resolveTests(test)).concat(getRelativePath(tearDown)).join(' ');
			}

			if (fgrep) {
				runTests += ' --fgrep ' + fgrep;
			}

			var done = this.async(),
					nodeExecutable = 'node';

			if (debug) {
				nodeExecutable = 'node debug';
			} else if (inspector) {
				nodeExecutable = 'node-debug';
			}

			shell.exec(nodeExecutable + ' node_modules/.bin/mocha ' + runTests, function(code) {
				if (code !== 0) {
					grunt.log.error("Mocha tests failed!");
					shell.exit(1);
				} else {
					grunt.log.ok("Mocha tests passed");
				}
				done();
			});
		});
};
