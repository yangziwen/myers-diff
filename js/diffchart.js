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
                type: 'value'
            },
            yAxis: {
                name: 'k = x - y',
                nameLocation: 'middle',
                type: 'value'
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