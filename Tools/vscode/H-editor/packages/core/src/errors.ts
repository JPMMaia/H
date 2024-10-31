//import * as vscode from 'vscode';

export function onThrowError(message: string): void {
    //vscode.window.showErrorMessage(message);

    // Make a breakpoint here to catch exceptions
    console.log(message);
}