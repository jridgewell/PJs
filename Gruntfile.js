/*global module:false*/
module.exports = function(grunt) {
    "use strict";

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        meta: {
            version: '<%= pkg.version %>'
        },

        uglify : {
            core : {
                src : '<%= pkg.main %>',
                dest : '<%= pkg.main.replace(".js", "-min.js") %>'
            }
        },

        jshint: {
            options: {
                jshintrc : '.jshintrc'
            },
            src : ['<%= pkg.main %>'],
            test : ['test/*.js'],
        },

        mochaTest: {
            options: {
                reporter: 'spec',
                timeout: '200'
            },
            src: ['test/*.js']
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-mocha-test');

    // Default task.
    grunt.registerTask('test', ['mochaTest']);
    grunt.registerTask('default', ['test', 'jshint', 'uglify']);

};
