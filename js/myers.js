var MyersDiff = Object.assign((function(options) {
    this.srcArr = options.srcArr;
    this.dstArr = options.dstArr;
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
                currentEdit.lines.push(this.srcArr[prevPosition.x]);
                x++;
            } else if (newEditType == 'add') {
                currentEdit.lines.push(this.dstArr[prevPosition.y]);
                y++;
            }
            if (noChangeStep > 0) {
                if (currentEdit.type != 'common') {
                    currentEdit = {type: 'common', lines:[], fromOffset: x, toOffset: y};
                    edits.push(currentEdit);
                }
                currentEdit.lines.push(...this.srcArr.slice(x, x + noChangeStep));
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
        !unified && unified !== 0 && (unified = 3);
        let currentBlock = {edits: [edits[0]]}
        let blocks = [currentBlock];
        let lastEdit = edits.slice(-1)[0];
        for (let i = 1; i < edits.length; i++) {
            let edit = edits[i];
            if (['delete', 'add'].includes(edit.type)) {
                currentBlock.edits.push(edit);
                continue;
            }
            if (edit.type == 'common') {
                currentBlock.edits.push(edit);
                if (edit.lines.length > 2 * unified && edit !== lastEdit) {
                    currentBlock = {edits: [edit]};
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
                block.fromLineCount = lastEdit.fromOffset - block.fromOffset + lastEdit.lines.length;
                block.toLineCount = lastEdit.toOffset - block.toOffset + lastEdit.lines.length;
                lastEditLines.push(...lastEdit.lines);
            }
            let lines = [`@@ -${block.fromOffset + 1},${block.fromLineCount} +${block.toOffset + 1},${block.toLineCount} @@`];
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
            lines.push(...lastEditLines.map(line => getPrefix(lastEdit.type) + line));
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
    showSimpleDiff(lastStep) {
        this.getSimpleDiff(lastStep).forEach(line => console.log(line));
    },
    calDiff() {
        let depth = Math.min(this.maxSearchDepth, this.srcArr.length + this.dstArr.length);
        for (let d = 0; d <= depth; d++) {
            if (this.foundBestSteps && !this.findAllSteps) {
                break;
            }
            this.calAndAddPositions(d);
        }
        return this;
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
            while (x < this.srcArr.length && y < this.dstArr.length
                    && this.srcArr[x] == this.dstArr[y]) {
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
            if (x > this.srcArr.length || y > this.dstArr.length) {
                return this.NOT_EXIST_POSITION;
            }
            while (x < this.srcArr.length && y < this.dstArr.length 
                    && this.srcArr[x] == this.dstArr[y]) {
                x++;
                y++;
            }
            if (x == this.srcArr.length && y == this.dstArr.length) {
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