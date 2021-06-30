import { DISPLAY_COLOR, DISPLAY_TYPE, DISPLAY_X, DISPLAY_Y } from "./compiler.js";
import * as AST from "./parser/types/AST.js";
export const builtinFunctions = [{
        type: AST.NodeType.functionDef,
        name: "rand",
        args: [{
                type: AST.NodeType.varDeclare,
                name: "val",
                valType: "num",
                value: { type: AST.NodeType.value, value: 0 },
                isArray: false
            }],
        inside: null,
        call() {
            const value = this.frame.scope.getVar("val");
            this.move(value.idx, this.frame.ret);
            this.goto(this.frame.ret);
            this.code += '*';
        }
    }, {
        type: AST.NodeType.functionDef,
        name: "point",
        args: [{
                type: AST.NodeType.varDeclare,
                name: "x",
                valType: "num",
                value: { type: AST.NodeType.value, value: 0 },
                isArray: false
            }, {
                type: AST.NodeType.varDeclare,
                name: "y",
                valType: "num",
                value: { type: AST.NodeType.value, value: 0 },
                isArray: false
            }, {
                type: AST.NodeType.varDeclare,
                name: "color",
                valType: "num",
                value: { type: AST.NodeType.value, value: 0 },
                isArray: false
            }],
        inside: null,
        call() {
            const x = this.frame.scope.getVar("x");
            const y = this.frame.scope.getVar("y");
            const color = this.frame.scope.getVar("color");
            this.move(x.idx, DISPLAY_X);
            this.move(y.idx, DISPLAY_Y);
            this.move(color.idx, DISPLAY_COLOR);
            this.goto(DISPLAY_TYPE);
            this.makeValue(1);
            this.code += "%";
        }
    }];
