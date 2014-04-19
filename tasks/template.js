'use strict';
var path = require('path');
var chalk =  require('chalk');
var lorem = require('lorem');

module.exports = function (grunt) {
    /**
     * Escapes characters in the string that are not safe to use in a RegExp.
     * @param {*} s The string to escape. If not a string, it will be casted
     *     to one.
     * @return {string} A RegExp safe, escaped copy of {@code s}.
     */
    function escape(s) {
        return String(s).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').
            replace(/\x08/g, '\\x08');
    };

    grunt.registerMultiTask('templates', 'Inject templates into your flat html files', function(){
        var options = this.options({
            src: '',
            dest: '',
            templateDir: ''
        });

        for(var prop in options){
            if(options[prop] == '')grunt.fatal('options.' + prop + ' is required');
        }

        if(!grunt.file.exists(options.src))grunt.fatal('options.src points to a non-existant dir: ' + options.src);
        if(!grunt.file.exists(options.templateDir))grunt.fatal('options.templateDir points to a non-existant dir: ' + options.templateDir);

        var files = grunt.file.expand({ cwd: options.src }, '*.html');
        if(files.length == 0){
            grunt.log.warn('no html files found in directory ' + chalk.cyan(options.src));
            grunt.log.warn('aborting as there are no files to parse');
            return;
        }

        var templates = grunt.file.expand({ cwd: options.templateDir }, '**/*.html');
      
        templates.forEach(function(template){
            var name = template.replace('.html', '');
            grunt.log.ok(name);
            var html = grunt.file.read(path.join(options.templateDir, template));
            templates[name] = html;
        });

        files.forEach(function(file){
            var model = {};

            grunt.log.subhead('[*] processing ' + chalk.cyan(file));
            var html = grunt.file.read(path.join(options.src, file));

            grunt.log.subhead('parsing model');
            html = parseModel(html, model);

            grunt.log.subhead('parsing blocks');
            html = parseBlock(html, {
                matchExpression: /{{(?!model)(.*?)}}((.|\r*\n)*?){{\/\1}}/gmi,
                isBlock: true
            }, model);

            grunt.log.subhead('parsing inline');
            html = parseBlock(html, {
                matchExpression: /{{(?!model|repeat|\/repeat|ipsum|img:)(.*?)(?:)}}/gmi
            }, model);

            grunt.log.subhead('parsing model properties');
            html = parseModelProperties(html, model);

            grunt.log.subhead('parsing lorem ipsum');
            html = parseIpsumBlock(html);

            grunt.log.subhead('parsing img');
            html = parseImgBlock(html);

            grunt.file.write(path.join(options.dest, file), html);
        });

        function parseBlock(html, options, model){
            options = options || {};

            var required = ['matchExpression'];
            required.forEach(function(req){
                if(!options[req]){
                    grunt.log.error('parseBlock.' + chalk.cyan(req) + ' is required');    
                    return html;
                }
            });

            var matches = null;
            while((matches = options.matchExpression.exec(html)) != null){
                grunt.log.subhead('parsing model');
                html = parseModel(html, model);

                var search = matches[0];
                var name = matches[1];
                var innerContent = matches[2];

                var content = '';

                grunt.log.writeln('\tinjecting template ' + chalk.cyan(name));
                if(!templates[name]){
                    grunt.log.writeln('\t\t* template ' + chalk.cyan(name) + ' not found. Using an empty string as a replacement');
                }else{
                    if(options.isBlock){
                        grunt.log.ok('1');
                        if(!options.yield)options.yield = 'yield';
                        content = templates[name].replace('{{' + options.yield + '}}', innerContent);
grunt.log.ok('1.1');
                        content = parseYields(content, {
                            name: name
                        });
                        grunt.log.ok('1.2');
                    }else{
                        grunt.log.ok('2');
                        content = templates[name];
                    }
                }

                grunt.log.writeln('here');
                html = html.replace(new RegExp(escape(search), 'g'), content);
                grunt.log.subhead('parsing repeat blocks');
                html = parseRepeatBlock(html);
                
                options.matchExpression.lastIndex = 0;
            }

            html = parseModel(html, model);

            return html;
        }

        function parseRepeatBlock(html){
            var matchExpression = /{{repeat:([0-9]*?)}}((.|\r*\n)*?){{\/repeat}}/gmi;
            var matches;

            while((matches = matchExpression.exec(html)) != null){
                var search = matches[0];
                var times = parseInt(matches[1]);
                var innerContent = matches[2];

                var tmp = '';

                for(var i=0;i<times;i++){
                    tmp += innerContent;
                }

                html = html.replace(new RegExp(escape(search), 'g'), tmp);
            }
            return  html;
        }

        function parseIpsumBlock(html){
            var matchExpression = /{{ipsum:(.*?)}}/gmi;
            var matches;

            while((matches = matchExpression.exec(html)) != null){
                var search = matches[0];
                var command = matches[1];

                var ipsum = lorem.ipsum(command);
                html = html.replace(new RegExp(search, 'g'), ipsum);
            }

            return html;
        }

        function parseImgBlock(html){
            //TODO some how make the attributes conditional/optional and use a single regex

            var matchExpression = /{{img:(.*?):(.*?)}}/gmi;
            var matches;

            while((matches = matchExpression.exec(html)) != null){
                var search = matches[0];
                var command = matches[1];
                var attributes = matches[2];

                if(!attributes)attributes = '';

                var img = '<img src="http://placehold.it/' + command + '" ' + attributes + ' >';

                html = html.replace(new RegExp(search, 'g'), img);
            }

            matchExpression = /{{img:(.*?)}}/gmi;
            matches;

            while((matches = matchExpression.exec(html)) != null){
                var search = matches[0];
                var command = matches[1];

                var img = '<img src="http://placehold.it/' + command + '" >';

                html = html.replace(new RegExp(search, 'g'), img);
            }

            return html;
        }

        function parseYields(html, options){
            
            var matchExpression = /{{yield:(.*?)}}/gmi;
            var matches = null;

            while((matches = matchExpression.exec(html)) != null){
                var search = matches[0];
                var name = matches[1];

                var block = extractBlock(html, '{{' + options.name + ':' + name + '}}((.|\r*\n)*?){{/' + options.name + ':' + name + '}}');
                if(block != null){
                    var innerContent = block[1];
                    html = html.replace(search, innerContent);
                    matchExpression.lastIndex = 0;
                }
            }
            return html;
        }

        function extractBlock(html, yieldStatement){
            var matchExpression = new RegExp(yieldStatement, 'gmi');
            var matches = matchExpression.exec(html);

            return matches;
        }
         
        function parseModel(html, model){
            var matches = extractBlock(html, '{{model}}((.|\r*\n)*?){{/model}}');
            if(matches != null){
                var search = matches[0];
                var modelstr = matches[1];

                var obj;
                eval('obj = ' + modelstr);
                
                for(var prop in obj){
                    model[prop] = obj[prop];
                }

                //todo for some reason the regex here failed when a model contained a function
                html = html.replace(search, '');
            }
            
            return html;
        }

        function parseModelProperties(html, model){
            for(var prop in model){
                var matchExpression = new RegExp('{{model.' + prop + '}}', 'gi');

                var content = '';
                if(typeof model[prop] == 'function'){
                    content = model[prop]();
                }else{
                    content = model[prop];
                }
                html = html.replace(matchExpression, content);
            }

            return html;
        }
    });
};