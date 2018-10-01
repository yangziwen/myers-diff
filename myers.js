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
    getSimpleDiff(lastStep) {
        lastStep || (lastStep = this.getBestFinalStep());
        if (!lastStep) {
            return [];
        }
        var lines = [];
        let prevPosition = {x: 0, y: 0};
        let positions = this.getPositions(lastStep);
        for (let position of positions) {
            let {x, y} = prevPosition;
            let stepX = position.x - prevPosition.x;
            let stepY = position.y - prevPosition.y;
            let noChangeStep = Math.min(stepX, stepY);
            if (stepX > stepY) {
                lines.push('- ' + this.srcArr[prevPosition.x]);
                x++;
            } else if (stepX < stepY) {
                lines.push('+ ' + this.dstArr[prevPosition.y]);
                y++;
            }
            if (noChangeStep > 0) {
                this.srcArr.slice(x, x + noChangeStep).forEach(value => {
                    lines.push('  ' + value);
                });
            }
            prevPosition = position;
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