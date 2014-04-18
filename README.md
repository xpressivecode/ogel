ogel
====

Templating system for rapid prototyping: grunt ask

Features
========

1. Templates (inline and block)
2. Nested Templates
3. Optional placeholders (yields)
4. Basic model support (think of having a layout where you need to set values based on interior page)
5. Lorem ipsum generation
6. Placeholder.it shortcut
7. Repeatable blocks

Templates 
---------

Templates are found via `{{name}}`, where the name would match a filename in your templates directory. If you place your template in a sub folder, such as `templates/menus/main-navigation.html`, you would reference it via `{{menus/main-navigation}}`

There are two types of templates. 

Inline:
-------
This is a straight replacement. 


An example:
```html
<body>
  ...
  {{footer}}
</body>
```
In this scenario, the `{{footer}}` would fetch the contents of the footer.html template and swap the content.


Block
-----
This allows for you to nest content within the data of a template. In order to do so, you must include a `{{yield}}` in your template. You must also include an opening and closing tag for the template. 

An example (say index.html referencing the layout template):
```html
{{layout}}
    <article>
      main article content goes here
    </article>
{{/layout}}
```

Nested Templates
----------------
You can nest templates. So a template can reference another template. It's a recursive system. 

An exmaple:
```html
{{layout}}
  {{aside}}
  <article>
    main article content goes here
  </article>
{{/layout}}
```

You can see above that we've used both the `layout` template as well as the `aside` template. In fact, the layout template could also reference multiple other templates etc.

Optional Placeholders
---------------------
You can include optional placeholders (or yield blocks) in your templates. For instance, maybe your layout has the ability to be either 1 or 2 columns. Your aside (column 1) is optional, so you can declare it like:

```html
<!-- layout.html (a template) -->
<body>
  <div class="row">
    {{yield:aside}} <!-- define an optional yield block -->
    <div class="col-md-10">
      {{yield}} <!-- main content of callee goes here -->
    </div>
  </div>
</body>
```

And in your page that references the layout template
```html
<!-- index.html (a page) -->
{{layout}}
  {{layout:aside}}
    <div class="col-md-2">
      side nav could go here
    </div>
  {{/layout:aside}}
  main content goes here and ends up in the {{yield}} block
{{/layout}}
```

