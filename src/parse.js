window.$ = window.jQuery = require('jquery');
// window.$ = window.jQuerySG;
window.esprima = require('esprima');
window.numeral = require('numeral');
require('../libs/jquery.tableparser.js');
require('./array_last.js');
// window.d3 = require('script!../libs/d3.v3.min.js');
// window.vg = require('script!../libs/vega/vega.js');

function env_init(_this, code) {
    var datai = $(_this).attr('datai');
    var env_id = '#env-' + datai;
    var editor_id = `editor-${datai}`;
    if ($(env_id).length) {
        // open existing environment
        $(env_id).toggle();
    } else {
        // create new environment
        var ds_env = `
            <div id="env-${datai}" class="dsjs-env">
                <div class="repl">
                    <!-- <div class="history" id="history-${datai}"></div> -->
                    <div class="inputs">
                        <div id="preview-${datai}" class="preview-panel"></div>
                        <div id="${editor_id}" class="editor">
                        </div>
                        <div class="buttons">
                            <button datai="${datai}" class="run">Run</button>
                            <!-- <button datai="${datai}">Preview</button> -->
                            <button datai="${datai}" class="toggle-sg">Toggle SG</button>
                        </div>
                    </div>
                </div>
                <div class="show-panel">
                    <div id="vis-${datai}" class="vis"></div>
                    <div id="table-area-${datai}" class="table-area"></div>
                    <div id="suggestion-${datai}" class="suggestion-panel"></div>
                </div>
            </div>
            <div style="clear: both"></div>
        `;

        let cur = _this;
        let block_styles = ['block', 'inline-block'];
        while (!block_styles.includes($(cur).css('display'))) {
            cur = $(cur).parent();
        }
        $(cur).after(ds_env);
        var editor = ace.edit(editor_id);
        editor.datai = datai;
        editor.cursor_rowno = 0;
        editor.setTheme("ace/theme/chrome");
        // editor.setBehavioursEnabled(false);
        editor.getSession().setMode("ace/mode/javascript");
        editor.getSession().setUseWrapMode(true);
        editor.setValue(`// This table is denoted as t${datai}`);

        editor.commands.addCommand({
            name: 'preview',
            bindKey: { win: 'Ctrl-B',  mac: 'Command-B' },
            exec: function(_editor) {
                let ast = esprima.parse(_editor.getValue(), { loc: true });
                let row = _editor.getCursorPosition().row;
                let col = _editor.getCursorPosition().column;
                let line = editor.getSession().getLine(row);

                for (let i = 0; i < ast.body.length; i++) {
                    let stmt = ast.body[i];
                    if (row == (stmt.loc.start.line - 1)) {
                        find_and_preview(stmt.expression, _editor, line, row, col, 0, line.length);
                        break;
                    }
                }
            }
        });

        function find_and_preview(expr, editor, line, row, col, cur_start, cur_end) {
            let datai = editor.datai;
            let callee;
            // console.log(expr);
            // console.log(expr.callee.object.name);
            if (expr.type == 'CallExpression' || expr.type == 'AssignmentExpression') {
                if (expr.type == 'CallExpression') {
                    if (expr.arguments) {
                        expr.arguments.forEach(function(arg) {
                            find_and_preview(arg, editor, line, row, col, arg.loc.start.column, arg.loc.end.column);
                        });
                    }
                    callee = expr.callee;
                } else if (expr.type == 'AssignmentExpression') {
                    callee = expr.right.callee;
                }
                let last_callee;
                let callee_level = 0;
                while (callee && ('object' in callee)) {
                    let identifier_name = callee.object.name;
                    let identifier_start = callee.object.loc.start.column;
                    let identifier_end = callee.object.loc.end.column;
                    // console.log(`${identifier_name} ${identifier_start} ${identifier_end} ${col}`);
                    let method_name = callee.property.name;
                    let method_start = callee.loc.end.column - callee.property.name.length;
                    let method_end = callee.loc.end.column;
                    if (between(col, identifier_start, identifier_end) && (eval(`${identifier_name}.__showable__`))) {
                        // here we preview an identifier
                        let all_code = editor.getValue().split('\n');
                        let pre_eval_code = '';
                        for (let i = 0; i < row; i++) {
                            pre_eval_code += all_code[i] + '\n';
                        }
                        refresh_table(datai);
                        eval(pre_eval_code);
                        eval(`${identifier_name}.preview('self()')`);
                        let pos = $(`#env-${datai} .ace_cursor`).position();
                        $(`#env-${datai} .preview-panel`).css({
                            left: pos.left + 50,
                            top: pos.top + 30
                        }).toggle();
                        break;
                    } else if (is_supported_preview(method_name) && between(col, method_start, method_end)) {
                        // here we preview a method call
                        // console.log(`method ${callee.property.name} found`);
                        let method_call;
                        if (callee_level == 0) {
                            method_call = line.slice(method_start, cur_end);
                        } else {
                            let last_method_start = last_callee.loc.end.column - last_callee.property.name.length;
                            method_call = line.slice(method_start, last_method_start - 1);
                        }

                        // console.log(`method_call: ${method_call}`);
                        let all_code = editor.getValue().split('\n');
                        let pre_eval_code = '';
                        for (let i = 0; i < row; i++) {
                            pre_eval_code += all_code[i] + '\n';
                        }
                        let cur_line_partial = line.slice(cur_start, method_start - 1);
                        // console.log(`cur_line_partial: ${cur_line_partial}`);
                        pre_eval_code += cur_line_partial;
                        refresh_table(datai);
                        let partial_result = eval(pre_eval_code);
                        eval(`partial_result.preview(\`${method_call}\`)`);
                        let pos = $(`#env-${datai} .ace_cursor`).position();
                        $(`#env-${datai} .preview-panel`).css({
                            left: pos.left + 50,
                            top: pos.top + 30
                        }).toggle();
                        break;
                    } else {
                        last_callee = callee;
                        callee_level += 1;
                        callee = callee.object.callee;
                    }
                }
            }
        }

        function between(i, start, end) {
            return ((i >= start) && (i <= end))
        }

        function is_supported_preview(func_name) {
            let supported_functions = new Set([
                'with_row',
                'with_rows',
                'with_column',
                'with_columns',
                'select',
                'drop',
                'relabeled',
                'where',
                'sorted',
                'group',
                'groups',
                'pivot',
                'join'
            ]);

            return supported_functions.has(func_name);
        }

        editor.commands.addCommand({
            name: 'hl-preview-methods',
            bindKey: { win: 'Ctrl-G',  mac: 'Command-G' },
            exec: function(_editor) {
                let markers = _editor.getSession().getMarkers();
                Object.keys(markers).forEach(function(mk) {
                    if (markers[mk].clazz == 'preview-hl') {
                        _editor.getSession().removeMarker(mk);
                    }
                });
                let ast = esprima.parse(_editor.getValue(), { loc: true });
                ast.body.forEach(function(stmt) {
                    // console.log(stmt);
                    find_and_mark(stmt.expression, _editor);
                });
            }
        });

        editor.commands.addCommand({
            name: 'show-preview-panel',
            bindKey: { win: 'Ctrl-J',  mac: 'Command-J' },
            exec: function(_editor) {
                // console.log(_editor);
                let datai = _editor.datai;
                let pos = $(`#env-${datai} .ace_cursor`).position();
                // console.log(pos);
                $(`#env-${datai} .preview-panel`).css({
                    left: pos.left + 50,
                    top: pos.top + 30
                }).toggle();
            }
        });

        function find_and_mark(expr, editor) {
            // [TODO] mark-ups are messed-up after we change the code
            // console.log(expr);
            let Range = ace.require('ace/range').Range;
            let callee;
            if (expr.type == 'CallExpression' || expr.type == 'AssignmentExpression') {
                if (expr.type == 'CallExpression') {
                    if (expr.arguments) {
                        expr.arguments.forEach(function(arg) {
                            // console.log(arg);
                            find_and_mark(arg, editor);
                        });
                    }
                    callee = expr.callee;
                } else if (expr.type == 'AssignmentExpression') {
                    callee = expr.right.callee;
                }

                while (callee && ('object' in callee)) {
                    if (is_supported_preview(callee.property.name)) {
                        let r = new Range(callee.loc.start.line - 1, callee.loc.end.column - callee.property.name.length, callee.loc.end.line - 1, callee.loc.end.column);
                        editor.getSession().addMarker(r, "preview-hl", "line");
                    }
                    callee = callee.object.callee;
                }
            }
        }

        editor.on('click', function(e) {
            // let _editor = e.editor;
            // let row = _editor.getCursorPosition().row;
            // let col = _editor.getCursorPosition().column;
            // console.log(`row: ${row} col: ${col}`);
        });

        function refresh_table(_datai) {
            let tname = `t${_datai}`;
            eval(`${tname} = window.table_store['${tname}'].copy()`); // make a new copy of the pre-loaded table
        }

        editor.selection.on('changeCursor', function() {
            let new_rowno = editor.getCursorPosition().row;
            if (new_rowno != editor.cursor_rowno) {
                // cursor changes to a new line, we evaluate the code again
                // and get the result
                editor.cursor_rowno = new_rowno;
                let all_code = editor.getValue().split('\n');
                let code = '';
                for (let i = 0; i <= new_rowno; i++) {
                    code += all_code[i] + '\n';
                }
                refresh_table(editor.datai);
                let res = eval(code);
                cur_line = editor.getSession().getLine(new_rowno);
                if (cur_line.length && res && res.__showable__) {
                    // [TODO] here we should embed the name of the shown table
                    // (it can be an anonymous table returned by functions)
                    let expr = esprima.parse(cur_line, { loc: true }).body[0].expression;
                    // console.log(expr);
                    if (expr.type == 'AssignmentExpression') {
                        res.show(false, cur_line.slice(expr.left.loc.start.column, expr.left.loc.end.column));
                    } else if (expr.type == 'CallExpression') {
                        res.show(false, cur_line.slice(expr.loc.start.column, expr.loc.end.column));
                    }
                }
            }
        });

        editor.session.on('change', function(e) {
            $('.preview-panel').each(function() {
                if ($(this).css('display') != 'none') {
                    $(this).hide();
                }
            });
        });

        let data_link = $(_this).attr('data-link');
        // $(`#history-${datai}`).append(`<b>This table is denoted as t${datai}</b>`);
        window._datai = datai;
        // eval(code); // I used to keep it to run some specialized init code
        $(env_id).toggle();
    }

    $('.run').click(function() {
        var datai = $(this).attr('datai');
        $(`#vis-${datai}`).html('');
        $(`#table-area-${datai}`).html('');
        var editor = ace.edit(`editor-${datai}`);
        var code = editor.getValue();
        // This is the legacy code for storing history code
        // not use it for now
        // $(`#history-${datai}`).append(`<pre>${code}</pre>`);
        window._datai = datai;
        // [TODO] use esprima to detect table variable name
        // [TODO] we should also use the current line to decide which table to show
        let res = eval(code);
        if (res && res.__showable__) {
            res.show();
        }
    });

    $('.table-area').click(function(e) {
        let pos = $(this).position();
        let table_pos = $(this).children('.ds-table').position();
        let width = $(this).children('.ds-table').width();
        let height = $(this).children('.ds-table').height();
        if (e.pageX > (table_pos.left + width) || e.pageY > (table_pos.top + height)) {
            $(this).siblings('.suggestion-panel').hide();
        }
    });

    $('.toggle-sg').click(function() {
        let datai = $(this).attr('datai');
        SelectorGadget.toggle(datai);
    });
}

$(document).ready(function() {
    window.table_store = {};
    // [TODO] consider change it to another name to avoid conflicts
    // with window.datai
    let datai = 0;
    // csv detection
    $('a').each(function(i) {
        let data_link = $(this).attr('href');
        if (data_link && data_link.endsWith('.csv')) {
            $(this).after(`<button datai="${datai}" data-link=${data_link} class="open-dsjs btn btn-primary btn-xs">Toggle ds.js</button>`);
            eval(`
                t${datai} = new Table.Table(null, null, '${data_link}', ${datai});
                window.table_store['t${datai}'] = t${datai}.copy();
            `);
            datai += 1;
        }
    });

    // html table detection
    $('table').each(function(i) {
        $(this).after(`<button datai="${datai}" class="open-dsjs-htable btn btn-primary btn-xs">Toggle ds.js</button>`);
        $(this).addClass(`dsjs-htable-${datai}`);
        eval(`
            t${datai} = new Table.Table(null, null, null, ${datai});
            t${datai}.from_columns($('.dsjs-htable-${datai}').parsetable(true, true));
            window.table_store['t${datai}'] = t${datai}.copy();
        `);
        datai += 1;
    });

    $(".open-dsjs-htable").click(function() {
        let datai = $(this).attr('datai');
        env_init(this, '');
    });

    $(".open-dsjs").click(function() {
        let datai = $(this).attr('datai');
        env_init(this, '');
    });

    window.sg_prediction = function(prediction) {
        window.last_prediction = prediction;
    };
});