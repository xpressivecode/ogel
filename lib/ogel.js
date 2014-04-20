// TODO remove deps on grunt. The file methods are just very handy at the moment

var utils = require('./utils');
var _ = require('underscore');                  // used for _.extend (look at removing dep)
var fs = require('fs');                         // used for checking if dirs exist
var path = require('path');                     // used for join
var grunt = require('grunt');                   // used for file operations (look at removing dep)
var lorem = require('lorem');

var ogel = exports = module.exports = {};

// exposing these in case there is value in calling the init method manually to seeing what is found
ogel.templates = [];
ogel.files = [];
ogel.options = {};
ogel.shortcuts = {}; //used as a placeholder to bind helper methods too

ogel.build = function(options){
    this.init(options);

    var self = this;

    this.files.forEach(function(file){
        var html = grunt.file.read(path.join(options.src, file));

        // first parse block yields ex: {{layout}}foo{{/layout}}
        html = self.parseBlocks(html, {
            matchExpression: /{{(?!model)(.*?)}}((.|\r*\n)*?){{\/\1}}/gmi,
            isBlock: true
        });

        // now we parse inline yields ex: {{header}}
        html = self.parseBlocks(html, {
            matchExpression: /{{(?!\/\w+|model|repeat|\/repeat|ipsum|img:)(.*?)(?:)}}/gmi
        });

        // now we bind any model properties (cascades as it crawls the templates)
        // then replace any calls to the model properties with the values
        // TODO make mention of how values are stored, FIFO or LIFO?
        // TODO maybe look at making parseModel pass in a model {} as a reference, and it returns the html
        // would save having to call parseModelBlock, which does basically the same thing
        var model = self.parseModel(html);
        html = self.parseModelBlock(html); //removes any model definitions
        html = self.parseModelProperties(html, model);

        // now run any of the shortcut parsers
        for(var sc in self.shortcuts){
           html = self.shortcuts[sc](html);
        }

        grunt.file.write(path.join(options.dest, file), html);
    });
};

ogel.init = function(options){
    var self = this;
    this.templates = [];
    this.files = [];

    options = options || {};
    this.options = options = _.extend({ src: '', dest: '', templateDir: '' }, options);

    for(var opt in options){
        if('string' != typeof options[opt] || options[opt] == ''){
            throw new Error('Ogel.build() requires that the option ' + opt + ' be set');
        }
    }

    if(!fs.existsSync(options.src))throw new Error("The src path specified doesn't exist: " + options.src);
    if(!fs.existsSync(options.templateDir))throw new Error("The templateDir path specified doesn't exist: " + options.templateDir);

    this.files = grunt.file.expand({ cwd: options.src }, '*.html');
    if(!this.files.length){
        throw new Error("There were no html files found in the src directory: " + options.src);
    }

    var templates = grunt.file.expand({ cwd: options.templateDir }, '**/*.html');
    templates.forEach(function(tmpl){
        var name = tmpl.replace('.html', '');
        var content = grunt.file.read(path.join(options.templateDir, tmpl));
        self.templates[name] = content;
    });
};

ogel.parseBlocks = function(html, options){
    var self = this;

    options = options || {};
    if(!options.matchExpression)options.matchExpression = new RegExp('');

    var matches;
    while((matches = options.matchExpression.exec(html)) != null){
        var search = matches[0];            // swap value
        var name = matches[1];              // name of the template that we'll search for
        var innerContent = matches[2];      // inner contents of a block yield

        // default to an empty string. any templates being referenced that don't actually exist will
        // just be discarded with this
        var content = '';

        if(self.templates[name]){
            if(options.isBlock){
                if(!options.yield)options.yield = 'yield'; // default to main yield if not present, otherwise it's an optional yield with a label

                // {{yield}} block
                content = self.templates[name].replace('{{' + options.yield + '}}', innerContent);
                // optional yields associated to template, ex: {{yield:header}}
                content = self.parseYields(content, { name: name });
            }else{
                // this is a straight replace, example {{header}} as opposed to a block {{header}}foo{{/header}}
                content = self.templates[name];
            }
        }

        // swap content from original search
        html = html.replace(new RegExp(utils.escapeRegex(search), 'g'), content);

        // parse repeat blocks in case they contain any yields
        html = self.parseRepeatBlocks(html);

        // reset the index to crawl source again (recursive)
        options.matchExpression.lastIndex = 0;
    }

    return  html;
};

ogel.parseYields = function(html, options){
    var matchExpression = /{{yield:(.*?)}}/gmi;
    var matches;

    while((matches = matchExpression.exec(html)) != null){
        var search = matches[0];
        var name = matches[1];

        var block = utils.extractBlock(html, '{{' + options.name + ':' + name + '}}((.|\r*\n)*?){{/' + options.name + ':' + name + '}}');
        if(block != null){
            var innerContent = block[1];
            html = html.replace(new RegExp(utils.escapeRegex(search), 'g'), innerContent);
            matchExpression.lastIndex = 0;
        }
    }

    return html;
};

ogel.parseRepeatBlocks = function(html){
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

        html = html.replace(new RegExp(utils.escapeRegex(search), 'g'), tmp);

        matchExpression.lastIndex = 0;
    }

    return html;
};

ogel.parseModel = function(html){
    var model = {};

    var matchExpression = /{{model}}((.|\r*\n)*?){{\/model}}/gmi;
    var matches;

    while((matches = matchExpression.exec(html)) != null){
        var search = matches[0];
        var modelstr = matches[1];

        var obj;
        eval('obj=' + modelstr);

        model = _.extend(obj, model);

        html = html.replace(new RegExp(utils.escapeRegex(search), 'gmi'), '');
        matchExpression.lastIndex = 0;
    }

    return model;
};

ogel.parseModelBlock = function(html){
    var matchExpression = /{{model}}((.|\r*\n)*?){{\/model}}/gmi;
    var matches;

    while((matches = matchExpression.exec(html)) != null){
        var search = matches[0]

        html = html.replace(new RegExp(utils.escapeRegex(search), 'gim'), '');

        matchExpression.lastIndex = 0;
    }

    return html;
};

ogel.parseModelProperties = function(html, model){
    if(!model)return html;
    for(var prop in model){

        var matchExpression = new RegExp('{{model.' + prop + '}}', 'gim');
        var matches;

        while((matches = matchExpression.exec(html)) != null){
            var content = '';
            if(typeof model[prop] == 'function'){
                content = model[prop]();
            }else{
                content = model[prop];
            }

            html = html.replace(matchExpression, content);

            matchExpression.lastIndex = 0;
        }
    }

    return html;
};

ogel.shortcuts.parseIpsumBlocks = function(html){
    // TODO randomize this some how? it would make the page look more alive for repeat blocks

    var matchExpression = /{{ipsum:(.*?)}}/gmi;
    var matches;

    while((matches = matchExpression.exec(html)) != null){
        var search = matches[0];
        var command = matches[1];

        var ipsum = lorem.ipsum(command);
        html = html.replace(new RegExp(search, 'g'), ipsum);
    }

    return html;
};

ogel.shortcuts.parseImageBlocks = function(html){
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
};