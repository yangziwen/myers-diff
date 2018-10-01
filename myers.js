var MyersDiff = Object.assign((function(srcArr, dstArr) {
    this.srcArr = srcArr;
    this.dstArr = dstArr;
    this.mapping = {};  // key is [d][k], value is the matrix position
    this.prevStepMapping = {}; // key is [d][k], value is the previous d,k
    this.findWholePath = false;
    this.finalStep = null;
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
    getWholeSteps() {
        return this.getSteps(this.finalStep);
    },
    getWholePositions() {
        return this.getWholeSteps(this.finalStep).map(step => {
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
    showDiff() {
        let prevPosition = {x: 0, y: 0};
        let positions = this.getWholePositions();
        for (let position of positions) {
            let {x, y} = prevPosition;
            let stepX = position.x - prevPosition.x;
            let stepY = position.y - prevPosition.y;
            let noChangeStep = Math.min(stepX, stepY);
            if (stepX > stepY) {
                console.log('- ' + this.srcArr[prevPosition.x]);
                x++;
            } else if (stepX < stepY) {
                console.log('+ ' + this.dstArr[prevPosition.y]);
                y++;
            }
            if (noChangeStep > 0) {
                this.srcArr.slice(x, x + noChangeStep).forEach(value => {
                    console.log('  ' + value);
                });
            }
            prevPosition = position;
        }
    },
    calDiff() {
        for (let d = 0; d < this.srcArr.length + this.dstArr.length; d++) {
            if (this.findWholePath) {
                break;
            }
            this.calAndAddPositions(d);
        }
    },
    calAndAddPositions(d) {
        for (let k = d; k >= -d; k -= 2) {
            let position = this.calPosition(d, k);
            if (this.addPosition(d, k, position)) {
                this.ensureSubmapping(this.prevStepMapping, d)[k] = position.prevStep;
            }
            if (this.findWholePath) {
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
                this.findWholePath = true;
                this.finalStep = {d, k};
            }
            return {x, y, prevStep: {d: d0, k: k0}}
        });
        return positions[0].x > positions[1].x ? positions[0] : positions[1];
    }
}).constructor;