import * as vscode from 'vscode';

export class RangeEx extends vscode.Range {

    public hPosition: any;

    constructor(start: vscode.Position, end: vscode.Position, hPosition: any[]) {
        super(start, end);
        this.hPosition = hPosition;
    }

}
