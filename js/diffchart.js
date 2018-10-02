var PositionChart = Object.assign((function(echarts, el) {
    this.chart = echarts.init(el);
}).prototype, {
    refresh(positions) {
        let originData = positions.map(pos => [pos.x, pos.y]);
        let prevPos = [0, 0];
        let data = [prevPos];
        for (let pos of originData) {
            let [x, y] = pos;
            let [x0, y0] = prevPos;
            let stepX = x - x0;
            let stepY = y - y0;
            if (stepX > stepY) {
                data.push([++x0, y0]);
            } else if (stepX < stepY) {
                data.push([x0, ++y0]);
            }
            let commonStep = Math.min(stepX, stepY);
            for (let i = 1; i <= commonStep; i++) {
                data.push([x0 + i, y0 + i]);
            }
            prevPos = pos;
        }
        this.chart.setOption({
            title: {},
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderColor: '#ccc',
                borderWidth: 1,
                textStyle: {
                    color: '#666'
                },
                formatter(params) {
                    return params.map(param => {
                        let [x, y] = param.data;
                        return `pos: (x=${x}, y=${y})`
                    }).join('<br/>');;
                }
            },
            animation: false,
            grid: {
                left: 35,
                right: 20,
                top: 35,
                bottom: 20
            },
            dataZoom: {
                type: 'inside',
                zoomOnMouseWheel: 'ctrl'
            },
            xAxis: {
                name: 'x',
                position: 'top',
                nameLocation: 'middle',
                type: 'value',
                min: 'dataMin',
                max: 'dataMax'
            },
            yAxis: {
                name: 'y',
                nameLocation: 'middle',
                type: 'value',
                min: 'dataMin',
                max: 'dataMax',
                inverse: true
            },
            series: [{
                type: 'line',
                showSymbol: false,
                data: data
            }]
        }, true);
    }
}).constructor;

var StepChart = Object.assign((function(echarts, el, clickCallback) {
    this.chart = echarts.init(el);
    this.chart.on('click', params => clickCallback(params, this.diff));
}).prototype, {
    refresh(diff) {
        this.diff = diff;
        let stepSet = new Set();
        let series = [];
        for (let finalStep of diff.getFinalSteps()) {
            let data = this._generateDataByLastStep(diff, finalStep, stepSet);
            if (data.length <= 1) {
                continue;
            }
            series.push({type: 'line', data});
        }
        for (let d of Object.keys(diff.prevStepMapping).reverse()) {
            for (let k of Object.keys(diff.prevStepMapping[d])) {
                let data = this._generateDataByLastStep(diff, {d, k}, stepSet);
                if (data.length <= 1) {
                    continue;
                }
                series.push({
                    type: 'line',
                    lineStyle: {
                        normal: {
                            type: 'dashed'
                        }
                    },
                    data
                });
            }
        }
        this.chart.setOption({
            title: {
                text: '',
                x: 'center'
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderColor: '#ccc',
                borderWidth: 1,
                textStyle: {
                    color: '#666'
                },
                formatter(params) {
                    let [d, k] = params.data;
                    let pos = diff.getPosition(d, k);
                    return [
                        `pos: (x=${pos.x}, y=${pos.y})`,
                        `step: (d=${d}, k=${k})`
                    ].join('<br/>')
                }
            },
            animation: false,
            grid: {
                left: 35,
                right: 20,
                top: 20,
                bottom: 35
            },
            dataZoom: {
                type: 'inside',
                zoomOnMouseWheel: 'ctrl'
            },
            xAxis: {
                name: 'd',
                nameLocation: 'middle',
                type: 'value',
                min: 'dataMin',
                max: 'dataMax'
            },
            yAxis: {
                name: 'k = x - y',
                nameLocation: 'middle',
                type: 'value',
                min: 'dataMin',
                max: 'dataMax'
            },
            series: series
        }, true);
    },
    _generateDataByLastStep(diff, lastStep, stepSet) {
        let steps = diff.getSteps(lastStep).map(step => {
            step.key = step.d + ',' + step.k;
            return step;
        });
        let data = [];
        for (let step of steps.reverse()) {
            data.unshift([step.d, step.k]);
            if (stepSet.has(step.key)) {
                break;
            }
            stepSet.add(step.key);
        }
        return data;
    }
}).constructor;