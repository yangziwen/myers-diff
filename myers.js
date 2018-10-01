var MyersDiff = Object.assign((function(srcArr, dstArr) {
    this.srcArr = srcArr;
    this.dstArr = dstArr;
    this.mapping = {};  // key is [d][k], value is the matrix position
    this.prevMapping = {}; // key is [d][k], value is the previous d,k
    this.findWholePath = false;
    this.finalStep = null;
}).prototype, {
    NOT_EXIST_POSITION: {x: -1, y: -1},
    getPosition(d, k) {
        with (this) {
            return mapping[d] && mapping[d][k] || NOT_EXIST_POSITION;
        }
    },
    getPrevPosition(d, k) {
        with (this) {
            return prevMapping[d] && prevMapping[d][k] || null;
        }
    },
    addPosition(d, k, position) {
        const submapping = this.mapping[d] || (this.mapping[d] = {});
        const prevPosition = this.getPosition(d, k);
        if (position.x > prevPosition.x) {
            submapping[k] = position;
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
        var steps = [lastStep];
        let {d, k} = lastStep;
        var prev = null;
        while (prev = this.getPrevPosition(d, k)) {
            steps.unshift(prev);
            d = prev.d;
            k = prev.k
        }
        return steps;
    },
    calDiff() {
        with (this) {
            for (let d = 0; d < srcArr.length + dstArr.length; d++) {
                if (findWholePath) {
                    break;
                }
                calAndAddPositions(d);
            }
        }
    },
    calAndAddPositions(d) {
        for (let k = d; k >= -d; k -= 2) {
            let position = this.calPosition(d, k);
            if (this.addPosition(d, k, position)) {
                let submapping = this.prevMapping[d] || (this.prevMapping[d] = {});
                submapping[k] = position.prev;
            }
            if (this.findWholePath) {
                return;
            }
        }
    },
    calPosition(d, k) {
        if (d <=0) {
            return {x: 0, y: 0};
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
            let x0 = prevPosition.x, y0 = prevPosition.y;
            let x = x0, y = y0;
            if (k > k0) {
                x = x0 + 1;
            } else if (k < k0) {
                y = y0 + 1;
            }
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
            return {x, y, prev: {d: d0, k: k0}}
        });
        return positions[0].x > positions[1].x ? positions[0] : positions[1];
    }
}).constructor;