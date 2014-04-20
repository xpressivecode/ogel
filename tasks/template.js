'use strict';

var ogel = require('../lib/ogel');

module.exports = function (grunt) {
    grunt.registerMultiTask('ogel', 'Inject templates into your flat html files', function() {
        var options = this.options({
            src: '',
            dest: '',
            templateDir: ''
        });

        ogel.build(options);
    });
};