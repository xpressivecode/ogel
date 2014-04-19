'use strict';

module.exports = function (grunt) {

    // show elapsed time
    require('time-grunt')(grunt);

    // load all grunt tasks automatically instead of manually including
    require('load-grunt-tasks')(grunt);


    grunt.initConfig({
        templates: {
            main: {
                options: {
                    src: 'dev',
                    templateDir: 'dev/templates',
                    dest: 'release'
                }
            }
        },

        connect: {
            options: {
                port: 3000,
                base: 'release',
                hostname: '*',
                livereload: 9000
            },
            server: {}            
        },

        watch: {
           livereload: {
                options: {
                    livereload: { port: 9000 }
                },
                files: ['dev/**/*.html', 'dev/**/*.scss', 'bower_components/bootstrap-sass-official/vendor/assets/stylesheets/bootstrap/bootstrap.scss'],
                tasks: ['base']
           }
        },

        open: {
            server: {
                path: 'http://localhost:<%= connect.options.port %>'
            }
        },

        clean: {
            all: ['tmp', 'release'],
            temp: ['tmp']
        },

        copy: {
            bootstrap: {
                files: [
                    { expand: true, src: ['bower_components/bootstrap-sass-official/vendor/assets/stylesheets/**/*.scss', '!bower_components/bootstrap-sass-official/vendor/assets/stylesheets/**/bootstrap.scss'], dest: 'tmp/scss/', flatten: true, filter: 'isFile' }
                ]
            },

            jquery: {
                files: [
                    { src: 'bower_components/jquery/dist/jquery.min.js', dest: 'tmp/js/min/jquery.min.js' }
                ]
            },

            css: {
                files: [
                    { expand: true, src: ['dev/assets/scss/**'], dest: 'tmp/scss/', flatten: true, filter: 'isFile' }
                ]
            },

            js: {
                files: [
                    { expand: true, src: ['dev/assets/js/*.js'], dest: 'tmp/js/', flatten: true, filter: 'isFile' }
                ]
            }
        },

        sass: {
            dist: {
                files: [{
                    expand: true,
                    cwd: 'tmp/scss',
                    src: ['bootstrap.scss', 'main.scss'],
                    dest: 'tmp/css',
                    ext: '.css'
                }]
            }
        },

        concat: {
            bootstrap: {
                options: {
                    path: 'bower_components/bootstrap-sass-official/vendor/assets/javascripts/bootstrap/'
                },
                src: [
                    '<%= concat.bootstrap.options.path %>affix.js',
                    '<%= concat.bootstrap.options.path %>alert.js',
                    '<%= concat.bootstrap.options.path %>button.js',
                    '<%= concat.bootstrap.options.path %>carousel.js',
                    '<%= concat.bootstrap.options.path %>collapse.js',
                    '<%= concat.bootstrap.options.path %>dropdown.js',
                    '<%= concat.bootstrap.options.path %>tab.js',
                    '<%= concat.bootstrap.options.path %>transition.js',
                    '<%= concat.bootstrap.options.path %>scrollspy.js',
                    '<%= concat.bootstrap.options.path %>modal.js',
                    '<%= concat.bootstrap.options.path %>tooltip.js',
                    '<%= concat.bootstrap.options.path %>popover.js'
                ],
                dest: 'tmp/js/bootstrap.js'
            },

            css: {
                src: ['tmp/css/bootstrap.css', 'tmp/css/*.css'],
                dest: 'tmp/css/main.css'
            },

            js:  {
                src: ['tmp/js/min/jquery.min.js', 'tmp/js/min/*.js'],
                dest: 'release/js/main.min.js'
            }
        },

        cssmin: {
            options: {
                keepBreaks: true
            },
            minify: {
                expand: true,
                cwd: 'tmp/css',
                src: ['main.css'],
                dest: 'release/css',
                ext: '.min.css'
            }
        },

        uglify: {
            js: {
                expand: true,
                cwd: 'tmp/js',
                src: '*.js',
                dest: 'tmp/js/min'
            }
        }
    });

    grunt.loadTasks('tasks');

    // put more complex build tasks here 
    // 1. remove all temp and release folders so that we are starting from scratch
    // 2. generate flat html files from our templates
    // 3. copy bootstrap (sass), jquery and other bower_components into the proper assets folder of our tmp folder (this is how you get them local)
    // 4. copy over and merge boostrap js assets in the proper order (here you can pick and choose)
    // 5. run sass processor against our scss files (generates css files)
    // 6. minify our javascript files (only the ones that aren't min the min folder already) and move them into the min folder
    // 7. merge our css files together
    // 8. merge our js files together (from min folder) - jquery first and place the output into our release folder
    // 9. minify our css file and place the output into our release folder
    // 10. finally clean up the temp folder again as it's no longer needed
    grunt.registerTask('base', ['clean:all', 'templates', 'copy', 'concat:bootstrap', 'uglify', 'concat:css', 'concat:js', 'cssmin']);

    // high level order of operations for infrastructure stuff
    grunt.registerTask('default', ['base', 'connect', 'open', 'watch']);
};

