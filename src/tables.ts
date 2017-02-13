import * as vgt from './vgtemplates';

declare var d3: any;
declare var $: any;
declare var vg: any;
declare var ace: any;
// declare var _datai: any;
declare var window: any;
declare var esprima: any;
declare var numeral: any;

export class Table {

    private _t: any = [];
    private _labels: any = [];
    private _column_order: any = {};
    private _id: string;

    constructor(t?: Table, l?: any[], url?, datai?) {
        // types of column variables, especially in the cases when we want to do sorting
        if (t != null) {

        }

        if (l != null) {
            this._labels = l.slice();
        }

        if (url != null) {
            this.read_table_csv_sync(url);
        }

        if (datai == undefined) {
            if (window._datai) {
                this._id = window._datai;
            }
        } else {
            this._id = datai;
        }

        this.auto_convert();
    }

    public convert(cast: Function) {
        let _this = this;
        this._t.forEach(function(row) {
            _this._labels.forEach(function(l) {
                row[l] = cast(row[l]);
            });
        });

        return this;
    }

    public converted(cast: Function) {
        let copy = this.copy();
        copy.convert(cast);
        return copy;
    }

    auto_convert() {
        let _this = this;
        this._t.forEach(function(row) {
            _this._labels.forEach(function(l) {
                let n = numeral(row[l]);
                row[l] =  n._value ? n._value : row[l];
            });
        });
    }

    public copy_from(t: Table) {
        return this;
    }

    private table_init() {
        this._labels = d3.keys(this._t[0]);
        this._labels.forEach((item, index) => {
            this._column_order[item] = index;
        });
        // console.log(this._column_order);
    }

    public read_table_csv_async(url: string, callback: any) {
        var _this = this;
        d3.csv(url, function (data) {
            _this._t = data;
            _this.table_init();
            callback();
        });
    }

    public read_table_csv_sync(url: string) {
        var _this = this;
        $.ajax({
            dataType: "text",
            url: url,
            async: false,
            success: function (data) {
                _this._t = d3.csvParse(data);
                _this.table_init();
            }
        });
    }

    public set(column_or_label, f) {
        let l = this._as_label(column_or_label);
        this._t.forEach(function(row) {
            row[l] = f(row[l]);
        });

        return this;
    }

    public elem(row, col) {
        return this._t[row][col];
    }

    public num_rows() {
        return this._t.length;
    }

    public labels() {
        let labels_copy = $.extend([], this._labels);
        return labels_copy;
    }

    public num_columns() {
        return Object.keys(this._t[0]).length;
    }

    public column(index_or_label) {
        var col = [];
        if (typeof index_or_label === 'number') {
            var column_label = this._labels[index_or_label];
            this._t.forEach(function (row) {
                col.push(row[column_label]);
            });
            return col;
        } else if (typeof index_or_label === 'string') {
            this._t.forEach(function (row) {
                col.push(row[index_or_label]);
            });
            return col;
        }
    }

    columns() {
        var _this = this;
        var cols = [];
        this._labels.forEach(function (label) {
            cols.push(_this.column(label));
        });
        return cols;
    }

    row(index: number) {
        return this._t[index];
    }

    // return a view of all rows
    rows() {
        return this._t;
    }

    with_row(row) {
        let copy = this.copy();
        copy._with_row(row);

        return copy;
    }

    _with_row(row) {
        // [TODO] what if row doesn't have enough elements? e.g. lack of values for some columns
        if (row instanceof Array) {
            var o_row = {};
            this._labels.forEach(function (label, index) {
                o_row[label] = row[index];
            });
            this._t.push(o_row);
        } else if (row instanceof Object) {
            this._t.push(row);
        }

        return this;
    }

    _with_rows(rows) {
        var _this = this;
        rows.forEach(function (row) {
            _this._with_row(row);
        });

        return this;
    }

    with_rows(rows) {
        let copy = this.copy();
        copy._with_rows(rows);

        return copy;
    }

    with_column(label, values) {
        // [TODO] what if label is already in _labels?
        let copy = this.copy();
        copy._with_column(label, values);

        return copy;
    }

    _with_column(label, values) {
        if ((values.length == 1) && (this._t.length != 0)) {
            // insert a new column with all the same values
            for (var i = 0; i < this._t.length; i++) {
                this._t[i][label] = values[0];
            }
        } else if (this._t.length != 0 && values.length == this._t.length) {
            // values is a complete column, and the current table is not empty
            for (var i = 0; i < this._t.length; i++) {
                this._t[i][label] = values[i];
            }
        } else if (this._t.length == 0) {
            // current table is empty
            for (var i = 0; i < values.length; i++) {
                this._t.push({ [label]: values[i] });
            }
        }

        if (!this._labels.includes(label)) {
            this._labels.push(label);
        }

        return this;
    }

    with_columns(...labels_and_values: any[]) {
        let copy = this.copy();
        copy._with_columns(labels_and_values);
        console.log(copy);
        return copy;
    }

    _with_columns(...labels_and_values: any[]) {
        if (labels_and_values[0] instanceof Array) {
            labels_and_values = labels_and_values[0];
        }

        if (labels_and_values.length % 2 == 0) {
            for (var i = 0; i < labels_and_values.length / 2; i++) {
                this._with_column(labels_and_values[i * 2], labels_and_values[i * 2 + 1]);
            }
        }

        return this;
    }

    from_columns(columns: any[]) {
        let _this = this;
        columns.forEach(function(column) {
            column.forEach(function(s, i) {
                let node = document.createElement('div');
                node.innerHTML = s;
                column[i] = node.textContent || node.innerText || '';
                let n = numeral(column[i]);
                column[i] = n._value ? n._value : column[i];
            });
            _this._with_column(column[0], column.slice(1, column.length));
        });

        return this;
    }

    relabel(label, new_label) {
        label = this._as_label(label);
        var index = this._labels.indexOf(label);
        if (index != -1) {
            this._labels[index] = new_label;
            this._t.forEach(function (row) {
                var val = row[label];
                delete row[label];
                row[new_label] = val;
            });
        }

        return this;
    }

    relabeled(label, new_label) {
        var copy = $.extend(true, {}, this);
        copy.relabel(label, new_label);
        return copy;
    }

    copy() {
        return $.extend(true, {}, this);
    }

    select(...column_label_or_labels: any[]) {
        // /console.log(column_label_or_labels);
        var _this = this;
        column_label_or_labels = this._as_labels(column_label_or_labels);
        var table = new Table();
        table._id = this._id;
        for (var i = 0; i < this._t.length; i++) {
            table.with_row({});
        }
        column_label_or_labels.forEach(function (label) {
            table = table.with_column(label, _this.column(label));
        });
        // console.log(table);

        return table;
    }

    private _as_labels(label_list) {
        var new_labels = [];
        var _this = this;
        label_list.forEach(function (l) {
            new_labels.push(_this._as_label(l));
        });

        return new_labels;
    }

    private _as_label_indices(...label_list) {
        if (label_list[0] instanceof Array) {
            label_list = label_list[0];
        }
        let indices = [];
        let _this = this;
        label_list.forEach(function(l) {
            indices.push(_this._as_label_index(l));
        });
        indices.sort((a, b) => (a - b));

        return indices;
    }

    private _as_label_index(label) {
        if (typeof label === 'number') {
            return label;
        } else if (typeof label === 'string') {
            return this._labels.indexOf(label);
        }
    }

    private _as_label(label) {
        if (typeof label === 'number') {
            return this._labels[label];
        } else if (typeof label === 'string') {
            return label;
        }
    }

    drop(...column_label_or_labels: any[]) {
        var left_columns = this._labels.filter(function (c) {
            return column_label_or_labels.indexOf(c) == -1;
        });

        return this.select.apply(this, left_columns);
    }

    where(column_or_label, value_or_predicate) {
        return this._where(column_or_label, value_or_predicate, false);
    }

    iwhere(column_or_label, value_or_predicate) {
        return this._where(column_or_label, value_or_predicate, true);
    }

    _where(column_or_label, value_or_predicate, keep_index: boolean) {
        let table = new Table(null, this.labels(), null, this._id);
        let indices = [];
        let predicate;
        if (value_or_predicate instanceof Function) {
            predicate = value_or_predicate;
        } else {
            predicate = function (a) { return a == value_or_predicate; };
        }
        this._t.forEach(function (row, i) {
            if (predicate(row[column_or_label])) {
                table._with_row(row);
                indices.push(i);
            }
        });

        return keep_index ? { table: table, index: indices, label: this._as_label_index(column_or_label) } : table;
    }

    sort(column_or_label, descending = false, distinct = false) {
        var compare = function (a, b) {
            if (a[column_or_label] > b[column_or_label]) {
                return 1;
            } else if (a[column_or_label] < b[column_or_label]) {
                return -1;
            } else {
                return 0;
            }
        };

        if (descending) {
            this._t.sort(function (a, b) {
                return -compare(a, b);
            });
        } else {
            this._t.sort(function (a, b) {
                return compare(a, b);
            });
        }

        return this;
    }

    sorted(column_or_label, descending = false, distinct = false) {
        let copy = this.copy();
        copy.sort(column_or_label, descending, distinct);
        return copy;
    }



    group(column_or_label: any, collect?) {
        let label = this._as_label(column_or_label);
        let group_t = {};
        this._t.forEach(function (row) {
            if (row[label] in group_t) {
                group_t[row[label]].push(row);
            } else {
                group_t[row[label]] = [row];
            }
        });

        let keys = Object.keys(group_t);
        keys.sort();
        let grouped;
        if (collect) {
            let old_labels = this.labels();
            old_labels.splice(old_labels.indexOf(label), 1);
            grouped = new Table(null, [label].concat(old_labels), null, this._id);
            keys.forEach(function(k) {
                let row = { [label]: k };
                old_labels.forEach(function(l) {
                    row[l] = collect(group_t[k].map(x => x[l]));
                });
                grouped._with_row(row);
            });
        } else {
            grouped = new Table(null, [label, 'count'], null, this._id);
            keys.forEach(function (key) {
                grouped._with_row({ [label]: key, 'count': group_t[key].length });
            });
        }

        // console.log(grouped);
        return grouped;
    }

    groups(columns_or_labels: any[], collect?) {
        let labels = this._as_labels(columns_or_labels);
        // console.log(labels);
        let group_t = {};
        let key_combinations = {};
        this._t.forEach(function (row) {
            var key = [];
            labels.forEach(function (label) {
                key.push(row[label]);
            });
            let skey = String(key);
            if (skey in group_t) {
                group_t[skey].push(row);
            } else {
                group_t[skey] = [row];
            }

            if (!(skey in key_combinations)) {
                key_combinations[skey] = key;
            }
        });
        let grouped;
        if (collect) {
            let old_labels = this.labels();
            labels.forEach(function(l) {
                old_labels.splice(old_labels.indexOf(l), 1);
            });
            grouped = new Table(null, labels.concat(old_labels), null, this._id);
            Object.keys(key_combinations).forEach(function(skey) {
                let row = {};
                labels.forEach(function (l, i) {
                    row[l] = key_combinations[skey][i];
                });
                old_labels.forEach(function(l) {
                    row[l] = collect(group_t[skey].map(x => x[l]));
                });
                grouped._with_row(row);
            });
        } else {
            grouped = new Table(null, labels.concat(['count']));
            Object.keys(key_combinations).forEach(function (skey) {
                let row = {};
                labels.forEach(function (l, i) {
                    row[l] = key_combinations[skey][i];
                });
                row['count'] = group_t[skey].length;
                grouped._with_row(row);
            });
        }

        // console.log(grouped);
        return grouped;
    }

    pivot(columns, rows, values, collect?, zero?) {
        // [TODO] implement more optional arguments
        let column_labels = new Set();
        let row_labels = new Set();
        this._t.forEach(function (row) {
            column_labels.add(row[columns]);
            row_labels.add(row[rows]);
        });

        let pivot_t = {};
        this._t.forEach(function (row) {
            if (row[rows] in pivot_t) {
                if (row[columns] in pivot_t[row[rows]]) {
                    pivot_t[row[rows]][row[columns]].push(row[values]);
                } else {
                    pivot_t[row[rows]][row[columns]] = [row[values]];
                }
            } else {
                pivot_t[row[rows]] = {};
                pivot_t[row[rows]][row[columns]] = [row[values]];
            }
        });

        var pivoted = new Table(null, [rows].concat(Array.from(column_labels)), null, this._id);

        row_labels.forEach(function (row_label: any) {
            var pivot_row = { [rows]: row_label };
            column_labels.forEach(function (column_label: any) {
                // console.log(`${row_label} | ${column_label}`);
                let l = pivot_t[row_label][column_label] ? pivot_t[row_label][column_label] : [];
                pivot_row[column_label] = collect ? collect(l) : l.length;
            });
            pivoted._with_row(pivot_row);
        });

        // console.log(pivoted);
        return pivoted;
    }

    private index_by(label) {
        let column = this.column(label);
        var indexed = {};
        let _this = this;
        column.forEach(function (c, i) {
            if (c in indexed) {
                indexed[c].push(_this.row(i));
            } else {
                indexed[c] = [_this.row(i)];
            }
        });

        return indexed;
    }

    private _unused_label(label) {
        let original = label;
        let existing = this.labels();
        let i = 2;
        while (existing.indexOf(label) != -1) {
            label = `${original}_${i}`;
            i += 1;
        }

        return label;
    }

    join(column_label, other: Table, other_label?) {
        // console.log('this'); console.log(this);
        // console.log('other'); console.log(other);

        let _this = this;

        if (!other_label) {
            other_label = column_label;
        }

        column_label = this._as_label(column_label);
        let this_rows = this.index_by(column_label);
        let other_rows = other.index_by(other_label);
        let joined_rows = [];
        Object.keys(this_rows).forEach(function (l) {
            if (l in other_rows) {
                let other_row = other_rows[l][0];
                this_rows[l].forEach(function (row) {
                    let new_row = Object.assign({}, row);
                    Object.keys(other_row).forEach(function (l) {
                        if (column_label != other_label) {
                            new_row[_this._unused_label(l)] = other_row[l];
                        } else {
                            new_row[l] = other_row[l];
                        }
                    });
                    joined_rows.push(new_row);
                });
            }
        });

        let joined_labels = this.labels();
        other.labels().forEach(function (l) {
            if (l != other_label) {
                joined_labels.push(_this._unused_label(l));
            }
        });

        let joined = new Table(null, joined_labels, null, this._id);
        joined._with_rows(joined_rows);

        // console.log('joined table');
        // console.log(joined);

        return joined;
    }

    stats() {
        let _this = this;
        let stats_table = new Table(null, ['statistics'].concat(this._labels));
        let min_row = { 'statistics': 'min' };
        let max_row = { 'statistics': 'max' };
        let median_row = { 'statistics': 'median' };
        let sum_row = { 'statistics': 'sum' };
        this._labels.forEach(function (l) {
            min_row[l] = d3.min(_this.column(l));
            max_row[l] = d3.max(_this.column(l));
            median_row[l] = d3.median(_this.column(l));
            sum_row[l] = d3.sum(_this.column(l));
        });
        stats_table.with_row(min_row);
        stats_table.with_row(max_row);
        stats_table.with_row(median_row);
        stats_table.with_row(sum_row);

        return stats_table;
    }

    percentile(p) {
        let pt = new Table(null, this._labels);
        let _this = this;
        let prow = {};
        this._labels.forEach(function (l) {
            let c = _this.column(l);
            c.sort();
            prow[l] = c[Math.ceil(c.length * p) - 1];
        });
        pt.with_row(prow);

        return pt;
    }

    sample(k) {
        let sampled = new Table(null, this._labels);
        let n = this._t.length;
        for (let i = 0; i < k; i++) {
            sampled.with_row(this.row(Math.ceil(Math.random() * (n - 1))));
        }

        return sampled;
    }

    sample_from_distribution() {

    }


    split(k) {
        let shuffled_indices = d3.shuffle(d3.range(this._t.length));
        let first = new Table(null, this._labels);
        let rest = new Table(null, this._labels);
        for (let i = 0; i < k; i++) {
            first.with_row(this.row(shuffled_indices[i]));
        }
        for (let i = k; i < this._t.length; i++) {
            rest.with_row(this.row(shuffled_indices[i]));
        }

        return { 'first': first, 'rest': rest };
    }

    // @deprecated
    _show() {
        var _this = this;
        var s = `<table class="ds-table">`;
        s += "<tr>";
        this._labels.forEach(function (label) {
            s += "<th>";
            s += label;
            s += "</th>";
        });
        s += "</tr>";
        this._t.forEach(function (row) {
            s += "<tr>";
            // console.log(row);
            _this._labels.forEach(function (label) {
                s += "<td>";
                s += row[label];
                s += "</td>";
            });
            s += "</tr>";
        });
        s += `</table>`;

        console.log(`#table-area-${this._id}`);
        $(`#table-area-${this._id}`).html(s);
    }

    show(hide = false) {
        let raw_components = this.construct_table_components();
        $(`#table-area-${this._id}`).html(this.construct_html_table(raw_components, hide, hide));
    }

    peek() {
        this.show(true);
    }

    plot(xlabel, ylabel) {
        let id = this._id;
        let values = [];
        this._t.forEach(function (row) {
            values.push({ 'x': row[xlabel], 'y': row[ylabel] });
        });
        let templates = new vgt.VGTemplate();
        vg.parse.spec(templates.plot(values, xlabel, ylabel), function (chart) { chart({ "el": `#vis-${id}` }).update(); });
    }

    bar(xlabel, ylabel) {
        let id = this._id;
        let templates = new vgt.VGTemplate();
        let values = [];
        this._t.forEach(function (row) {
            values.push({ 'x': row[xlabel], 'y': row[ylabel] });
        });
        vg.parse.spec(templates.bar(values, xlabel, ylabel), function (chart) { chart({ "el": `#vis-${id}` }).update(); });
    }

    scatter(xlabel, ylabel) {
        let id = this._id;
        let values = [];
        this._t.forEach(function (row) {
            values.push({ 'x': row[xlabel], 'y': row[ylabel] });
        });
        let templates = new vgt.VGTemplate();
        vg.parse.spec(templates.scatter(values, xlabel, ylabel), function (chart) { chart({ "el": `#vis-${id}` }).update(); });
    }

    scatter_d3(xlabel, ylabel) {
        let id = this._id;
        let values = [];
        this._t.forEach(function (row) {
            values.push({ 'x': row[xlabel], 'y': row[ylabel] });
        });

        var margin = { top: 20, right: 15, bottom: 60, left: 60 }
            , width = 400 - margin.left - margin.right
            , height = 400 - margin.top - margin.bottom;

        var x = d3.scale.linear()
            .domain([0, d3.max(values, function (d) { return d.x; })])
            .range([0, width]);

        var y = d3.scale.linear()
            .domain([0, d3.max(values, function (d) { return d.y; })])
            .range([height, 0]);

        var chart = d3.select(`#vis-${id}`)
            .append('svg:svg')
            .attr('width', width + margin.right + margin.left)
            .attr('height', height + margin.top + margin.bottom)
            .attr('class', 'chart')

        var main = chart.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
            .attr('width', width)
            .attr('height', height)
            .attr('class', 'main')

        // draw the x axis
        var xAxis = d3.svg.axis()
            .scale(x)
            .orient('bottom');

        main.append('g')
            .attr('transform', 'translate(0,' + height + ')')
            .attr('class', 'main axis date')
            .call(xAxis);

        // draw the y axis
        var yAxis = d3.svg.axis()
            .scale(y)
            .orient('left');

        main.append('g')
            .attr('transform', 'translate(0,0)')
            .attr('class', 'main axis date')
            .call(yAxis);

        var g = main.append("svg:g");

        g.selectAll("scatter-dots")
            .data(values)
            .enter().append("svg:circle")
            .attr("cx", function (d, i) { return x(d.x); })
            .attr("cy", function (d) { return y(d.y); })
            .attr("r", 8);
    }

    hist(column: string) {
        var bins = {};
        this._t.forEach(function (row) {
            var elem = row[column];
            if (elem.length != 0) {
                if (elem in bins) {
                    bins[elem] += 1;
                } else {
                    bins[elem] = 1;
                }
            }
        });
        var data = [];
        var xs = Object.keys(bins);
        xs.sort((a, b) => parseInt(a) - parseInt(b));
        // console.log(xs);
        xs.forEach(function (x) {
            data.push({ 'x': x, 'y': bins[x] });
        });
        // console.log(data);
        var templates = new vgt.VGTemplate();
        var id = this._id;
        vg.parse.spec(templates.bar(data, '', ''), function (error, chart) {
            chart({ el: `#vis-${id}` }).update();
        });
    }

    vhist(column: string) {
        var templates = new vgt.VGTemplate();
        var id = this._id;
        vg.parse.spec(templates.vbar(this._t), function (error, chart) {
            chart({ el: `#vis-${id}` }).update();
        });
    }

    boxplot() {
        let id = this._id;
        let templates = new vgt.VGTemplate();
        let values = [];
        let _this = this;
        this._t.forEach(function(row) {
            _this._labels.forEach(function(l, i) {
                values.push({
                    'x': l,
                    'y2': 0,
                    'group': 1,
                    'y': row[l]
                });
            });
        });
        vg.parse.spec(templates.boxplot(values), function (error, chart) {
            chart({ el: `#vis-${id}` }).update();
        });
    }

    construct_table_components() {
        let components = [];
        let _this = this;
        let ths = [];
        _this._labels.forEach(function(label) {
            ths.push(`<th>${label}</th>`);
        });
        components.push(ths);

        _this._t.forEach(function(row) {
            let tds = [];
            _this._labels.forEach(function(label) {
                tds.push(`<td>${row[label]}</td>`);
            });
            components.push(tds);
        });

        return components;
    }

    construct_html_table(raw_components, hide_row = false, hide_col = false, kept_cols?: any[]) {
        let s = '<table class="ds-table">';
        let dot_counts;
        if (raw_components.length > 10 && hide_row) {
            for (let i = 0; i < 5; i++) {
                s += '<tr>';
                let row = this.construct_html_row(raw_components[i], hide_col, kept_cols);
                dot_counts = row.length;
                s += row.join('');
                s += '</tr>';
            }

            s += '<tr class="blank">';
            let blank_row_cols_count;
            if (hide_col && (raw_components[0].length > 10)) {
                blank_row_cols_count = kept_cols ? dot_counts : 11;
            } else {
                blank_row_cols_count = kept_cols ? dot_counts : raw_components[0].length;
            }

            for (let i = 0; i < blank_row_cols_count; i++) {
                s += `<td>...</td>`;
            }
            s += '</tr>';

            for (let i = raw_components.length - 5; i < raw_components.length; i++) {
                s += '<tr>';
                s += this.construct_html_row(raw_components[i], hide_col, kept_cols).join('');
                s += '</tr>';
            }
        } else {
            for (let i = 0; i < raw_components.length; i++) {
                s += '<tr>';
                s += this.construct_html_row(raw_components[i], hide_col, kept_cols).join('');
                s += '</tr>';
            }
        }

        s += '</table>';

        return s;
    }

    construct_html_table_peek(raw_components, peek_indices, label, hide_col, kept_cols?: any[]) {
        let s = '<table class="ds-table">';
        let rown = peek_indices.length > 5 ? 5 : peek_indices.length;
        // console.log('raw_components.length = ' + raw_components.length);
        // console.log('peek_indices.length = ' + peek_indices.length);
        if (raw_components.length <= peek_indices.length) {
            rown = raw_components.length - 1;
        }

        let table_head = this.construct_html_row(raw_components[0], hide_col, kept_cols);
        s += '<tr>' + table_head.join('') + '</tr>';
        if (peek_indices[0] > 0) {
            s += this.construct_blank_row(table_head.length);
        }
        for (let i = 0; i < rown; i++) {
            s += '<tr>' + this.construct_html_row(raw_components[peek_indices[i] + 1], hide_col, kept_cols).join('') + '</tr>';
        }
        s += this.construct_blank_row(table_head.length);
        s += '</table>';
        return s;
    }

    construct_blank_row(n) {
        let s = '<tr>';
        for (let i = 0; i < n; i++) {
            s += '<td>...</td>';
        }
        s += '</tr>';
        return s;
    }

    construct_html_row(components, hide_col, kept_cols?: any[]) {
        // [TODO] hide-show buttons for hidden columns
        let row = [];
        if (kept_cols) {
            if (kept_cols[0] > 0) {
                row.push('<td class="blank">...</td>');
            }

            for (let i = 0; i < kept_cols.length - 1; i++) {
                row.push(components[kept_cols[i]]);
                if (kept_cols[i] + 1 != kept_cols[i + 1]) {
                    row.push('<td class="blank">...</td>');
                }
            }

            row.push(components[kept_cols[kept_cols.length - 1]]);
            if (kept_cols[kept_cols.length - 1] < (this._labels.length - 1)) {
                row.push('<td class="blank">...</td>');
            }

            return row;
        } else {
            if (components.length > 10 && hide_col) {
                for (let i = 0; i < 5; i++) {
                    row.push(components[i]);
                }

                row.push('<td class="blank">...</td>');

                for (let i = components.length - 5; i < components.length; i++) {
                    row.push(components[i]);
                }

                return row;
            } else {
                return components;
            }
        }
    }

    _as_args(...args) {
        return args;
    }

    // basic procedures for previewing
    // 1 call the actual mutation functions
    // 2 construct html partial tags
    // 3 do customization, use jquery if necessary
    // 4 combine them into the real table
    // 5 show the table
    // this will also affect the actual show function
    // change impure (e.g. with_row) functions to pure functions
    preview(method_call) {
        let method_name = method_call.slice(0, method_call.indexOf('('));
        let args = method_call.slice(method_call.indexOf('(') + 1, method_call.lastIndexOf(')'));

        console.log(`method_call: ${method_call}, method_name: ${method_name}, args: ${args}`);

        if (method_name == 'with_row' || method_name == 'with_rows') {
            let new_table = eval(`this.${method_name}(${args})`);
            args = method_name == 'with_row' ? [eval(`this._as_args(${args})`)] : eval(`this._as_args(${args})`)[0];
            let raw_components = new_table.construct_table_components();
            for (let row = 1; row <= args.length; row++) {
                for (let i = 0; i < raw_components[0].length; i++) {
                    raw_components[raw_components.length - row][i] = $(raw_components[raw_components.length - row][i]).attr('class', 'preview').prop('outerHTML');
                }
            }

            $(`#preview-${this._id}`).html(new_table.construct_html_table(raw_components, true, true));
        } else if (method_name == 'with_column' || method_name == 'with_columns') {
            let new_table = eval(`this.${method_name}(${args})`);
            args = eval(`this._as_args(${args})`);
            let raw_components = new_table.construct_table_components();
            for (let col = 1; col <= args.length / 2; col++) {
                for (let i = 0; i < raw_components.length; i++) {
                    raw_components[i][raw_components[i].length - col] = $(raw_components[i][raw_components[i].length - col]).attr('class', 'preview').prop('outerHTML');
                }
            }

            $(`#preview-${this._id}`).html(new_table.construct_html_table(raw_components, true, true));
        } else if (method_name == 'select' || method_name == 'drop') {
            // [bug] what if we do t.drop('1', '2', '3').drop('1') - we should get an error?
            let raw_components = this.construct_table_components();
            let label_locs = eval(`this._as_label_indices(${args})`);
            for (let i = 0; i < raw_components.length; i++) {
                label_locs.forEach(function(loc) {
                    raw_components[i][loc] = $(raw_components[i][loc]).attr('class', method_name == 'select' ? 'preview' : 'preview-del').prop('outerHTML');
                });
            }

            $(`#preview-${this._id}`).html(this.construct_html_table(raw_components, true, true, label_locs));
        } else if (method_name == 'relabeled') {
            // [bug] what if we give it a non-existing label name?
            args = eval(`this._as_args(${args})`);
            let raw_components = this.construct_table_components();
            let label_loc = this._as_label_index(args[0]);
            raw_components[0][label_loc] = $(raw_components[0][label_loc]).html(`<span class="preview-del">${args[0]}</span> <span class="preview-select">${args[1]}</span>`).attr('class', 'preview').prop('outerHTML');

            $(`#preview-${this._id}`).html(this.construct_html_table(raw_components, true, true, [label_loc]));
        } else if (method_name == 'where') {
            // [TODO] hide_col strategies on this
            let res = eval(`this.iwhere(${args})`);
            let raw_components = this.construct_table_components();
            raw_components[0][res.label] = $(raw_components[0][res.label]).attr('class', 'preview-select').prop('outerHTML');
            res.index.forEach(function(i) {
                for (let j = 0; j < raw_components[i + 1].length; j++) {
                    raw_components[i + 1][j] = $(raw_components[i + 1][j]).attr('class', 'preview').prop('outerHTML');
                }
            });

            $(`#preview-${this._id}`).html(this.construct_html_table_peek(raw_components, res.index, res.label, false));
        } else if (method_name == 'sorted') {
            let sorted_table = eval(`this.sorted(${args})`);
            args = eval(`this._as_args(${args})`);
            let raw_components = sorted_table.construct_table_components();
            let label_loc = sorted_table._as_label_index(args[0]);
            // raw_components[0] is the table header
            raw_components[0][label_loc] = $(raw_components[0][label_loc]).html(`${args[0]} sorted`).attr('class', 'preview-select').prop('outerHTML');
            for (let i = 1; i < raw_components.length; i++) {
                raw_components[i][label_loc] = $(raw_components[i][label_loc]).attr('class', 'preview').prop('outerHTML');
            }
            $(`#preview-${this._id}`).html(sorted_table.construct_html_table(raw_components, true, true, [label_loc]));
        } else if (method_name == 'group' || method_name == 'groups') {
            let grouped_table = eval(`this.${method_name}(${args})`);
            args = eval(`this._as_args(${args})`);
            let group_labels = method_name == 'group' ? [args[0]] : args[0];
            let left_group_indices = this._as_label_indices(group_labels);
            let left_raw_components = this.construct_table_components();
            for (let i = 0; i < left_raw_components.length; i++) {
                left_group_indices.forEach(function(lgi) {
                    left_raw_components[i][lgi] = $(left_raw_components[i][lgi]).attr('class', i == 0 ? 'preview-select' : 'preview').prop('outerHTML');
                });
            }
            let left_table = this.construct_html_table(left_raw_components, true, true, left_group_indices);

            let right_group_indices = grouped_table._as_label_indices(group_labels);
            let right_raw_components = grouped_table.construct_table_components();
            for (let i = 0; i < right_raw_components.length; i++) {
                right_group_indices.forEach(function(rgi) {
                    right_raw_components[i][rgi] = $(right_raw_components[i][rgi]).attr('class', i == 0 ? 'preview-select' : 'preview').prop('outerHTML');
                });
            }
            let right_table = grouped_table.construct_html_table_peek(right_raw_components, [0, 1, 2, 3, 4], null, false);

            let template = `
                <div class="multi-table-preview">
                    <div class="left">${left_table}</div>
                    <div class="arrow">=></div>
                    <div class="right">${right_table}</div>
                </div>
                <div style="clear: both"></div>
            `;

            $(`#preview-${this._id}`).html(template);
        } else if (method_name == 'pivot') {
            let pivoted_table = eval(`this.pivot(${args})`);
            args = eval(`this._as_args(${args})`);
            let left_pivot_indices = this._as_label_indices(args[0], args[1], args[2]);
            let left_raw_components = this.construct_table_components();
            for (let i = 1; i < left_raw_components.length; i++) {
                left_raw_components[i][left_pivot_indices[0]] = $(left_raw_components[i][left_pivot_indices[0]]).attr('class', 'preview').prop('outerHTML');
            }
            left_raw_components[0][left_pivot_indices[1]] = $(left_raw_components[0][left_pivot_indices[1]]).attr('class', 'preview-select').prop('outerHTML');
            let left_table = this.construct_html_table(left_raw_components, true, true, left_pivot_indices);

            let right_raw_components = pivoted_table.construct_table_components();
            right_raw_components[0][0] = $(right_raw_components[0][0]).attr('class', 'preview-select').prop('outerHTML');
            for (let i = 1; i < right_raw_components[0].length; i++) {
                right_raw_components[0][i] = $(right_raw_components[0][i]).attr('class', 'preview').prop('outerHTML');
            }
            let right_table = pivoted_table.construct_html_table_peek(right_raw_components, [0, 1, 2, 3, 4], null, true);

            let template = `
                <div class="multi-table-preview">
                    <div class="left">${left_table}</div>
                    <div class="arrow">=></div>
                    <div class="right">${right_table}</div>
                </div>
            `;

            $(`#preview-${this._id}`).html(template);
        } else if (method_name == 'join') {
            let joined_table = eval(`this.join(${args})`);
            args = eval(`this._as_args(${args})`);
            let left_raw_components = this.construct_table_components();
            let left_join_index = this._as_label_index(args[0]);
            left_raw_components[0][left_join_index] = $(left_raw_components[0][left_join_index]).attr('class', 'preview-select').prop('outerHTML');
            for (let i = 1; i < left_raw_components.length; i++) {
                left_raw_components[i][left_join_index] = $(left_raw_components[i][left_join_index]).attr('class', 'preview').prop('outerHTML');
            }
            let left_table = this.construct_html_table(left_raw_components, true, true, [left_join_index]);

            let middle_raw_components = args[1].construct_table_components();
            let middle_join_index = args[1]._as_label_index(args.length == 3 ? args[2] : args[0]);
            middle_raw_components[0][middle_join_index] = $(middle_raw_components[0][middle_join_index]).attr('class', 'preview-select').prop('outerHTML');
            for (let i = 1; i < middle_raw_components.length; i++) {
                middle_raw_components[i][middle_join_index] = $(middle_raw_components[i][middle_join_index]).attr('class', 'preview').prop('outerHTML');
            }
            let middle_table = args[1].construct_html_table(middle_raw_components, true, true, [middle_join_index]);

            let right_raw_components = joined_table.construct_table_components();
            let right_join_index = joined_table._as_label_index(args[0]);
            right_raw_components[0][right_join_index] = $(right_raw_components[0][right_join_index]).html(`${args[0]} - ${args.length == 3 ? args[2] : args[0]}`).attr('class', 'preview-select').prop('outerHTML');
            for (let i = 1; i < right_raw_components.length; i++) {
                right_raw_components[i][right_join_index] = $(right_raw_components[i][right_join_index]).attr('class', 'preview').prop('outerHTML');
            }
            let right_table = joined_table.construct_html_table_peek(right_raw_components, [0, 1, 2, 3, 4], null, true);

            let template = `
                <div class="multi-table-preview">
                    <div class="left">${left_table}</div>
                    <div class="arrow">join</div>
                    <div class="left">${middle_table}</div>
                    <div class="arrow">=></div>
                    <div class="right">${right_table}</div>
                </div>
                <div style="clear: both"></div>
            `;

            $(`#preview-${this._id}`).html(template);
        } else {
            console.warn('Method call not supported: ${method_call}');
        }
    }
}