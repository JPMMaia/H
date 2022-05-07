import { commands, ExtensionContext } from "vscode";
import { HEditorProvider } from './HEditorProvider';

export function activate(context: ExtensionContext) {
  context.subscriptions.push(HEditorProvider.register(context));
}
