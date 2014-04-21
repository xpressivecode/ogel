var ogel = require('../'),
    assert = require('assert'),
    path = require('path');

var options = {
    src: path.resolve(__dirname, 'fixtures'),
    dest: path.resolve(__dirname, 'results'),
    templateDir: path.resolve(__dirname, 'fixtures/templates')
};

describe('Ogel', function(){
    describe('Model Binding', function(){
        it('should bind properties', function(done){
            ogel.preview(options, function(){
                var result = ogel.model;
                assert.equal(result.title, 'Index');

                done();
            });
        });

        it('should bind methods', function(done){
            ogel.preview(options, function(){
                var result = ogel.model;
                assert.equal(result.year(), 2014);

                done();
            });
        });

        it('should remove any model definitions', function(done){
            ogel.preview(options, function(args){
                var result = /{{model}}/gmi.test(args.html);
                assert.equal(result, false);

                done();
            });
        });

        it('should replace model placeholders/tokens with actual values', function(done){
            ogel.preview(options, function(args){
                var result = /{{model.title}}/gmi.test(args.html);
                assert.equal(result, false);

                result = /<title>Index<\/title>/gmi.test(args.html);
                assert.equal(result, true);

                done();
            });
        });

        it('should bind properties from multiple templates into a single object', function(done){
            ogel.preview(options, function(){
                var result = ogel.model;
                assert(result.title);                   // from index
                assert(result.year);                    // from layout

                done();
            });
        });

        it('should allows pages to override template values so that they only act as defaults', function(done){
            ogel.preview(options, function(){
                var result = ogel.model;
                assert.equal(result.width, 10);         // layout has a default of 12, index overrides this value to 10

                done();
            });
        });
    });
});