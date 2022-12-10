var TextEditor = Object.assign((function(monaco, el, options={}) {
    this.monaco = monaco;
    this.editor = monaco.editor.create(el, Object.assign({
        minimap: {
            enabled: false
        }
    }, options));
    if (el.firstElementChild.className.indexOf('diff-placeholder') >= 0) {
        const placeholderEl = el.firstElementChild;
        this.editor.onDidFocusEditorWidget(() => {
            placeholderEl.style.display = 'none';
        });
        this.editor.onDidBlurEditorWidget(() => {
            if (this.editor.getValue()) {
                placeholderEl.style.display = 'none';
            } else {
                placeholderEl.style.display = "initial";
            }
        });
    }
      
}).prototype, {
    getValue() {
        return this.editor.getValue();
    }
}).constructor;


var DiffEditor = Object.assign((function(monaco, el) {
    this.monaco = monaco;
    this.lineNumbers = {};
    this.editor = monaco.editor.create(el, {
        lineNumbers: originLineNumber => this.lineNumbers[originLineNumber],
        readOnly: true,
        minimap: {
            enabled: false
        }
    });
}).prototype, {
    refresh(edits) {
        this.lineNumbers = this._generateLineNumbers(edits);
        this.editor.setValue(edits.map(edit => edit.lines).flatMap(line => line).join('\n'));
        this.editor.deltaDecorations([], this._generateHighlightDecorations(edits));
    },
    _generateHighlightDecorations(edits) {
        let lineNumber = 0;
        let decorations = [];
        for (let edit of edits) {
            if (!['delete', 'add'].includes(edit.type)) {
                lineNumber += edit.lines.length;
                continue;
            }
            decorations.push({
                range: new this.monaco.Range(lineNumber + 1, 1, lineNumber + edit.lines.length, 1),
                options: {
                    isWholeLine: true,
                    className: `decoration-${edit.type}-background`
                }
            })
            lineNumber += edit.lines.length;
        }
        return decorations;
    },
    _generateLineNumbers(edits) {
        let lineNumbers = {};
        let totalLineNumber = 0;
        let srcLineNumber = 0;
        let dstLineNumber = 0;
        for (let edit of edits) {
            for (let i = 0; i < edit.lines.length; i++) {
                totalLineNumber++;
                if (edit.type == 'delete') {
                    srcLineNumber ++;
                    lineNumbers[totalLineNumber] = srcLineNumber;
                } else if (edit.type == 'add') {
                    dstLineNumber ++;
                    lineNumbers[totalLineNumber] = '';
                } else if (edit.type == 'common') {
                    srcLineNumber ++;
                    dstLineNumber ++;
                    lineNumbers[totalLineNumber] = srcLineNumber;
                }
            }
        }
        return lineNumbers;
    }
}).constructor;

var DiffBlockEditor = Object.assign((function(monaco, el) {
    this.monaco = monaco;
    this.editor = monaco.editor.create(el, {
        readOnly: true,
        minimap: {
            enabled: false
        }
    });
}).prototype, {
    refresh(lines) {
        this.editor.setValue(lines.join('\n'));
        this.editor.deltaDecorations([], this._generateHighlightDecorations(lines));
    },
    _generateHighlightDecorations(lines) {
        let lineNumber = 0;
        let prevLineNumber = 0;
        let decorations = [];
        let prevPrefix = ' ';
        for (let line of [...lines, '']) {
            lineNumber++;
            let prefix = line.charAt(0);
            if (prefix !== prevPrefix) {
                if (prevLineNumber > 0) {
                    let prevLineType = ({
                        '@': 'header',
                        '+': 'add',
                        '-': 'delete'
                    })[prevPrefix];
                    if (prevLineType) {
                        decorations.push({
                            range: new this.monaco.Range(prevLineNumber, 1, lineNumber - 1, (lines[lineNumber - 2] || '').length + 1),
                            options: {
                                isWholeline: true,
                                inlineClassName: `decoration-${prevLineType}`
                            }
                        })
                    }
                }
                prevLineNumber = lineNumber;
                prevPrefix = prefix;
            }
        }
        return decorations;
    }
}).constructor;