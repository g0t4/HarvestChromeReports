require(['knockout'], function (ko) {
    ko.bindingHandlers.pieChart = {
        update: function (element, valueAccessor, allBindingsAccessor) {
            // First get the latest data that we're bound to
            var value = valueAccessor(), allBindings = allBindingsAccessor();

            // Next, whether or not the supplied model property is observable, get its current value
            var valueUnwrapped = ko.utils.unwrapObservable(value);
            if (!valueUnwrapped) {
                return;
            }

            var options = {
                chart: {
                    renderTo: element,
                    plotBackgroundColor: null,
                    plotBorderWidth: null,
                    plotShadow: false
                },
                title: {
                    text: ko.utils.unwrapObservable(valueUnwrapped.title)
                },
                tooltip: {
                    formatter: function () {
                        return '<b>' + this.point.name + '</b>: ' + Math.round(this.percentage) + ' %';
                    }
                },
                plotOptions: {
                    pie: {
                        allowPointSelect: true,
                        cursor: 'pointer',
                        dataLabels: {
                            enabled: true,
                            color: '#000000',
                            connectorColor: '#000000',
                            formatter: function () {
                                var name = (this.point.name || '').substr(0, 10);
                                return '<b>' + name + '</b>: ' + Math.round(this.percentage) + ' %';
                            }
                        }
                    }
                },
                series: [
                    {
                        type: 'pie',
                        name: valueUnwrapped.name || '',
                        data: ko.utils.unwrapObservable(valueUnwrapped.data)
                    }
                ]
            };
            new Highcharts.Chart(options);
        }
    };
});