# sass-compiler

sass-compiler is an extension for the code editor CodeTasty that adds automatic compilation of SASS files upon saving.


### Compile Options

SASS compile options can be set in the first line of the edited file:

    // out: ../css/style.css, style: nested

out: compiled file destination

    // out: ., app.css, ../style.css
    // . - same path with css extension
    // something.scss - will compile this file instead

style: format output

    // style: nested, expanded, compact, compressed

underscores: prefix imported files with underscores 

    // underscores: true

plugin: inject plugin (must be installed)

    // plugin: css-autoprefixer

importing files

    @import "variables";