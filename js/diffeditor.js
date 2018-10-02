var TextEditor = Object.assign((function(monaco, el) {
    this.monaco = monaco;
    this.editor = monaco.editor.create(el, {
        minimap: {
            enabled: false
        }
    });
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
                    className: `decoration-${edit.type}`
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