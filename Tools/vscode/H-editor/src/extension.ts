import * as vscode from 'vscode';
import { HEditorProvider } from './HEditorProvider';

export function activate(context: vscode.ExtensionContext) {
	// Register our custom editor providers
	context.subscriptions.push(HEditorProvider.register(context));
}
