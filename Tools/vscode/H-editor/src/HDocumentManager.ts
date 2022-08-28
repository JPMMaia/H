import * as vscode from 'vscode';
import { HDocument } from './HDocument';
import { onThrowError } from './utilities/errors';

export class HDocumentManager {
    private registeredDocuments = new Map<string, HDocument>();

    public registerDocument(documentUri: vscode.Uri, document: vscode.TextDocument): void {
        if (this.isDocumentRegistered(documentUri)) {
            return;
        }

        const hDocument = new HDocument(document);
        this.registeredDocuments.set(document.uri.path, hDocument);
    }

    public unregisterDocument(documentUri: vscode.Uri): void {
        this.registeredDocuments.delete(documentUri.path);
    }

    public isDocumentRegistered(documentUri: vscode.Uri): boolean {
        return this.registeredDocuments.has(documentUri.path);
    }

    public getRegisteredDocument(documentUri: vscode.Uri): HDocument {
        const document = this.registeredDocuments.get(documentUri.path);
        if (document === undefined) {
            const message = "Document " + documentUri.path + " was not registered!";
            onThrowError(message);
            throw Error(message);
        }
        return document;
    }
}
