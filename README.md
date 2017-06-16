# SASS/SCSS compiler

sass-compiler is an extension for the code editor CodeTasty that adds automatic compilation of SASS files upon saving.

## Configuration

### 1, Configuration file (recommended)

Create or edit **codetasty.json** file in workspace root.

```
{
    "extension": {
        "sass-compiler": {
            "files": {
                "watch": [
                    "less/*.sass"
                ]
                "source": "less/app.sass",
                "output": "build/app.css"
            }
        }
    }
}
```

#### files
Type: `Array|Object`

Can be also array to compile multiple files.

#### files.watch
Type: `Array`, Required

List of files to watch. Can include asterisk (*) to match any file name.

#### files.source
Type: `String`, Required

Source file that should be compiled.

#### files.output
Type: `String`, Required

Destination where the compiled output is saved.

#### files.style
Type: `String`, Default: `compressed`

Sets output format.

Options: `style`, `nested`, `expanded`, `compact`, `compressed`

#### files.plugin
Type: `String|Array`

Injects plugin, must be installed (e.g. "css-autoprefixer").

### 2, Inline comment (deprecated)

Compile options can be set in the first line of the edited file, separated by comma.

    // out: ../css/style.css, compress: true

#### out
Type: `String`, Required

Sets output file.

    // out: ., app.css, ../style.css
    // . - same path with css extension
    // something.less - will compile this file instead

#### style
Type: `String`, Default: `compressed`

Sets output format.

    // style: nested, expanded, compact, compressed

#### plugin
Type: `String`, Default: `null`

Injects plugin, must be installed.

    // plugin: css-autoprefixer
