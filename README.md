# sass-compiler

sass-compiler is an extension for the code editor CodeTasty that adds automatic compilation of SASS files upon saving.


### Compile Options

SASS compile options can be set in the first line of the edited file:

    // out: ../css/style.css, main: ../master.scss

out: compiled file destination

    // out: ., app.css, ../style.css
    //. - same path with css extension

main: adds a master file before compiled file

    // main: main.scss, ../master.scss

importing files

    @import "variables";