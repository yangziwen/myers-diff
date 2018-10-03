var MyersDiff = Object.assign((function(options) {
    this.srcLines = options.srcLines;
    this.dstLines = options.dstLines;
    this.mapping = {};  // key is [d][k], value is the matrix position
    this.prevStepMapping = {}; // key is [d][k], value is the previous d,k
    let maxSearchDepth = parseInt(options.maxSearchDepth);
    this.maxSearchDepth = !isNaN(maxSearchDepth) ? maxSearchDepth : 1000;
    this.findAllSteps = !!options.findAllSteps;
    this.finalSteps = [];
    this.foundBestSteps = false;
    this.bestFinalStep = null;
}).prototype, {
    NOT_EXIST_POSITION: {x: -1, y: -1},
    getPosition(d, k) {
        with (this) {
            return mapping[d] && mapping[d][k] || NOT_EXIST_POSITION;
        }
    },
    getPrevStep(d, k) {
        with (this) {
            return prevStepMapping[d] && prevStepMapping[d][k] || null;
        }
    },
    ensureSubmapping(mapping, key) {
        return mapping[key] || (mapping[key] = {});
    },
    addPosition(d, k, position) {
        if (position == this.NOT_EXIST_POSITION) {
            return false;
        }
        const existedPosition = this.getPosition(d, k);
        if (position.x > existedPosition.x) {
            this.ensureSubmapping(this.mapping, d)[k] = position;
            return true;
        }
        return false;
    },
    getBestFinalStep() {
        return this.bestFinalStep;
    },
    getFinalSteps() {
        return this.finalSteps;
    },
    getBestSteps() {
        return this.getSteps(this.bestFinalStep);
    },
    getBestPositions() {
        return this.getPositions(this.bestFinalStep);
    },
    getPositions(lastStep) {
        return this.getSteps(lastStep).map(step => {
            return this.getPosition(step.d, step.k);
        })
    },
    getSteps(lastStep) {
        if (!lastStep) {
            return [];
        }
        let steps = [lastStep];
        let {d, k} = lastStep;
        let prevStep = this.getPrevStep(d, k);
        while (prevStep) {
            steps.unshift(prevStep);
            d = prevStep.d, k = prevStep.k;
            prevStep = this.getPrevStep(d, k);
        }
        return steps;
    },
    getEdits(lastStep) {
        lastStep || (lastStep = this.getBestFinalStep());
        if (!lastStep) {
            return [];
        }
        let prevPosition = {x: 0, y: 0};
        let edits = [{type: 'common', lines: [], fromOffset: 0, toOffset: 0}];
        let currentEdit = edits[0];    // can be 'common', 'add', 'delete'
        for (let position of this.getPositions(lastStep)) {
            let {x, y} = prevPosition;
            let stepX = position.x - prevPosition.x;
            let stepY = position.y - prevPosition.y;
            let noChangeStep = Math.min(stepX, stepY);
            let newEditType = 'common';
            if (stepX > stepY) {
                newEditType = 'delete';
            } else if (stepX < stepY) {
                newEditType = 'add';
            }
            if (newEditType != currentEdit.type) {
                currentEdit = {type: newEditType, lines: [], fromOffset: x, toOffset: y};
                edits.push(currentEdit);
            }
            if (newEditType == 'delete') {
                currentEdit.lines.push(this.srcLines[prevPosition.x]);
                x++;
            } else if (newEditType == 'add') {
                currentEdit.lines.push(this.dstLines[prevPosition.y]);
                y++;
            }
            if (noChangeStep > 0) {
                if (currentEdit.type != 'common') {
                    currentEdit = {type: 'common', lines:[], fromOffset: x, toOffset: y};
                    edits.push(currentEdit);
                }
                currentEdit.lines.push(...this.srcLines.slice(x, x + noChangeStep));
            }
            prevPosition = position;
        }
        if (edits[0].lines.length == 0) {
            edits.shift();
        }
        return edits;
    },
    getDiffBlocks(lastStep, unified) {
        let edits = this.getEdits(lastStep);
        if (!edits || edits.length == 0) {
            return [];
        }
        if (!edits.find(edit => edit.type != 'common')) {
            return [];
        }
        isNaN(unified = parseInt(unified)) && (unified = 3);
        let currentBlock = {edits: []};
        if (unified > 0 || ['delete', 'add'].includes(edits[0].type)) {
            currentBlock.edits.push(edits[0]);
        }
        let blocks = [currentBlock];
        let lastEdit = edits.slice(-1)[0];
        for (let i = 1; i < edits.length; i++) {
            let edit = edits[i];
            if (['delete', 'add'].includes(edit.type)) {
                currentBlock.edits.push(edit);
                continue;
            }
            if (edit.type == 'common') {
                if (unified > 0) {
                    currentBlock.edits.push(edit);
                }
                if (edit.lines.length > 2 * unified && edit !== lastEdit) {
                    currentBlock = {edits: []};
                    if (unified > 0) {
                        currentBlock.edits.push(edit);
                    }
                    blocks.push(currentBlock);
                }
            }
        }
        for (let block of blocks) {
            let edits = block.edits;
            let firstEdit = edits[0];
            let lastEdit = edits.slice(-1)[0];
            let middleEdits = edits.slice(1, -1);
            let firstEditLines = [];
            let lastEditLines = [];
            if (firstEdit.type == 'common' && firstEdit.lines.length > unified) {
                block.fromOffset = firstEdit.fromOffset + firstEdit.lines.length - unified;
                block.toOffset = firstEdit.toOffset + firstEdit.lines.length - unified;
                firstEditLines.push(...firstEdit.lines.slice(-unified));
            } else {
                block.fromOffset = firstEdit.fromOffset;
                block.toOffset = firstEdit.toOffset;
                firstEditLines.push(...firstEdit.lines);
            }
            if (lastEdit.type == 'common' && lastEdit.lines.length > unified) {
                block.fromLineCount = lastEdit.fromOffset - block.fromOffset + unified;
                block.toLineCount = lastEdit.toOffset - block.toOffset + unified;
                lastEditLines.push(...lastEdit.lines.slice(0, unified));
            } else {
                let lastEditFromLineCount = lastEdit.type != 'add' ? lastEdit.lines.length : 0;
                let lastEditToLineCount = lastEdit.type != 'delete' ? lastEdit.lines.length : 0;
                block.fromLineCount = lastEdit.fromOffset - block.fromOffset + lastEditFromLineCount;
                block.toLineCount = lastEdit.toOffset - block.toOffset + lastEditToLineCount;
                lastEditLines.push(...lastEdit.lines);
            }
            let fromLineNumber = block.fromOffset + (block.fromLineCount > 0 ? 1 : 0);
            let toLineNumber = block.toOffset + (block.toLineCount > 0 ? 1 : 0);
            let lines = [`@@ -${fromLineNumber},${block.fromLineCount} +${toLineNumber},${block.toLineCount} @@`];
            let getPrefix = type => {
                switch (type) {
                    case 'delete':
                        return '-';
                    case 'add':
                        return '+';
                    default:
                        return ' ';
                }
            }
            lines.push(...firstEditLines.map(line => getPrefix(firstEdit.type) + line));
            for (let edit of middleEdits) {
                lines.push(...edit.lines.map(line => getPrefix(edit.type) + line));
            }
            if (firstEdit !== lastEdit) {
                lines.push(...lastEditLines.map(line => getPrefix(lastEdit.type) + line));
            }
            block.lines = lines;
        }
        return blocks;
    },
    getStandardDiff(lastStep, unified) {
        let blocks = this.getDiffBlocks(lastStep, unified);
        return blocks.map(block => block.lines).flatMap(line => line);
    },
    getSimpleDiff(lastStep) {
        let edits = this.getEdits(lastStep);
        let lines = [];
        for (let edit of edits) {
            if (edit.type == 'common') {
                lines.push(...edit.lines.map(line => '  ' + line));
            } else if (edit.type == 'delete') {
                lines.push(...edit.lines.map(line => '- ' + line));
            } else if (edit.type == 'add') {
                lines.push(...edit.lines.map(line => '+ ' + line));
            }
        }
        return lines;
    },
    calDiff() {
        let depth = Math.min(this.maxSearchDepth, this.srcLines.length + this.dstLines.length);
        for (let d = 0; d <= depth; d++) {
            if (this.foundBestSteps && !this.findAllSteps) {
                break;
            }
            this.calAndAddPositions(d);
        }
        return this;
    },
    calShortcutLines() {
        var srcPosMapping = {};
        for (let i = 0; i < this.srcLines.length; i++) {
            let line = this.srcLines[i];
            let posList = srcPosMapping[line] || (srcPosMapping[line] = []);
            posList.push(i);
        }
        let shortcutStarts = [];
        let shortcutStartMapping = {};
        let shortcutHeads = {};
        for (let i = 0; i < this.dstLines.length; i++) {
            let line = this.dstLines[i];
            if (srcPosMapping[line]) {
                let points = srcPosMapping[line].map(srcPos => [srcPos, i]);
                for (let point of points) {
                    let key = point.join(',');
                    let prevKey = point.map(v => v - 1).join(',');
                    let nextKey = point.map(v => v + 1).join(',');
                    if (shortcutHeads[key]) {
                        continue;
                    } else if (shortcutHeads[prevKey]) {
                        shortcutHeads[prevKey].push(point);
                        continue;
                    } else if (shortcutHeads[nextKey]) {
                        (shortcutHeads[key] = shortcutHeads[nextKey]).unshift(point);
                        delete shortcutHeads[nextKey];
                        continue;
                    } else {
                        shortcutHeads[key] = [point];
                    }
                }
            }
        }
        return Object.values(shortcutHeads)
            .map(points => {
                points.push(points.slice(-1)[0].map(v => v + 1));
                return points;
            });
    },
    calAndAddPositions(d) {
        for (let k = d; k >= -d; k -= 2) {
            let position = this.calPosition(d, k);
            if (this.addPosition(d, k, position)) {
                this.ensureSubmapping(this.prevStepMapping, d)[k] = position.prevStep;
            }
            if (this.foundBestSteps && !this.findAllSteps) {
                return;
            }
        }
    },
    calPosition(d, k) {
        if (d <=0) {
            let x = 0, y = 0;
            while (x < this.srcLines.length && y < this.dstLines.length
                    && this.srcLines[x] == this.dstLines[y]) {
                x++;
                y++;
            }
            return {x, y};
        }
        let d0 = d - 1;
        let positions = [k - 1, k + 1].map(k0 => {
            if (k0 < -d0 || k0 > d0) {
                return this.NOT_EXIST_POSITION;
            }
            let prevPosition = this.getPosition(d0, k0);
            if (prevPosition == this.NOT_EXIST_POSITION) {
                return this.NOT_EXIST_POSITION;
            }
            let {x, y} = prevPosition;
            k > k0 && x++;
            k < k0 && y++;
            if (x > this.srcLines.length || y > this.dstLines.length) {
                return this.NOT_EXIST_POSITION;
            }
            while (x < this.srcLines.length && y < this.dstLines.length
                    && this.srcLines[x] == this.dstLines[y]) {
                x++;
                y++;
            }
            if (x == this.srcLines.length && y == this.dstLines.length) {
                this.finalSteps.push({d, k});
                if (!this.foundBestSteps) {
                    this.foundBestSteps = true;
                    this.bestFinalStep = {d, k};
                }
            }
            return {x, y, prevStep: {d: d0, k: k0}}
        });
        return positions[0].x > positions[1].x ? positions[0] : positions[1];
    }
}).constructor;