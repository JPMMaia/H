import * as H from "./model";
import * as settings from "./settings";

export function getTypeName(type: H.Type, builtinTypeMap: Map<string, settings.BuiltinTypeOptions>): string {

	const key = JSON.stringify(type);
	const typeOptions = builtinTypeMap.get(key);
	if (typeOptions != undefined) {
		return typeOptions.type_name;
	}
	else {
		throw "Type is not recognized!";
	}
}

export function createFunctionParametersHTML(
	parameterNames: string[],
	parameterTypes: H.Type[],
	functionParameterOptions: settings.FunctionParameterOptions,
	builtinTypeMap: Map<string, settings.BuiltinTypeOptions>
): string {

	const formatElements = functionParameterOptions.formatElements;

	const parameters_text: string[] = [];

	for (let parameterIndex = 0; parameterIndex < parameterTypes.length; ++parameterIndex) {
		const parameterName = parameterNames[parameterIndex];
		const parameterType = parameterTypes[parameterIndex];

		const formattedElements = formatElements.map(function (element: settings.FormatElement): string {
			if (element.type == settings.FormatElementType.Keyword && element.keyword != null) {
				const formatKeyword: settings.FormatKeyword = element.keyword;
				if (formatKeyword.type == settings.FormatKeywordType.Parameter_name) {
					return parameterName;
				}
				else if (formatKeyword.type == settings.FormatKeywordType.Parameter_type) {
					return getTypeName(parameterType, builtinTypeMap);
				}
				throw "Format parameter cannot be parsed!";
			}
			else if (element.type == settings.FormatElementType.String && element.text != null) {
				return element.text;
			}
			throw "Format parameter cannot be parsed!";
		});

		const text = formattedElements.join('');
		parameters_text.push(text);
	}

	const separator = functionParameterOptions.separator;
	const html: string = parameters_text.join(separator);

	return html;
}

export function createFunctionDeclarationHTML(
	hFunction: H.H_function,
	functionParameterOptions: settings.FunctionParameterOptions,
	functionDeclarationOptions: settings.FunctionDeclarationOptions,
	builtinTypeMap: Map<string, settings.BuiltinTypeOptions>
): string {

	const parametersHTML = createFunctionParametersHTML(
		hFunction.argument_names,
		hFunction.type.parameter_types,
		functionParameterOptions,
		builtinTypeMap
	);

	const formatElements = functionDeclarationOptions.formatElements;

	const formattedElements = formatElements.map(function (element: settings.FormatElement): string {
		if (element.type == settings.FormatElementType.Keyword && element.keyword != null) {
			const formatKeyword: settings.FormatKeyword = element.keyword;
			if (formatKeyword.type == settings.FormatKeywordType.Function_name) {
				return hFunction.function_name;
			}
			else if (formatKeyword.type == settings.FormatKeywordType.Function_parameters) {
				return parametersHTML;
			}
			else if (formatKeyword.type == settings.FormatKeywordType.Return_type) {
				return getTypeName(hFunction.type.return_type, builtinTypeMap);
			}
			throw "Format parameter cannot be parsed!";
		}
		else if (element.type == settings.FormatElementType.String && element.text != null) {
			return element.text;
		}
		throw "Format parameter cannot be parsed!";
	});

	const html = formattedElements.join('');

	return html;
}

export function createFunctionsListHTML(
	hModule: H.H_module | null,
	functionParameterOptions: settings.FunctionParameterOptions,
	functionDeclarationOptions: settings.FunctionDeclarationOptions,
	builtinTypeMap: Map<string, settings.BuiltinTypeOptions>
): string {

	if (hModule == null) {
		return "This module doesn't contain any functions.";
	}

	const hFunctions = hModule.functions;

	let html = "<ol>";
	for (const hFunction of hFunctions) {
		const declaration = createFunctionDeclarationHTML(
			hFunction,
			functionParameterOptions,
			functionDeclarationOptions,
			builtinTypeMap
		);
		html += "<li>" + declaration + "</li>";
	}
	html += "</ol>";

	return html;
}
