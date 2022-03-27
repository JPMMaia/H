import * as H from "./model";

export enum FormatKeywordType {
	Function_name = "function_name",
	Function_parameters = "function_parameters",
	Parameter_type = "parameter_type",
	Parameter_name = "parameter_name",
	Return_type = "return_type",
}

export interface FormatKeyword {
	type: FormatKeywordType;
	index: number;
}

export enum FormatElementType {
	Keyword,
	String
}

export interface FormatElement {
	type: FormatElementType;
	text: string | null;
	keyword: FormatKeyword | null;
}

export interface FunctionParameterOptions {
	formatElements: FormatElement[]
	separator: string;
}

export interface FunctionDeclarationOptions {
	formatElements: FormatElement[]
}

export interface BuiltinTypeOptions {
	type_name: string;
}

export interface EditorOptions {
	functionParameterOptions: FunctionParameterOptions;
	functionDeclarationOptions: FunctionDeclarationOptions;
	builtinTypeMap: Map<string, BuiltinTypeOptions>;
}

export function parseFormat(format: string): FormatElement[] {

	function findDollarCharacter(format: string): number[] {

		const dollarIndices: number[] = [];

		for (let index = 0; index < format.length; ++index) {

			const character = format[index];
			if (character == '$') {
				dollarIndices.push(index);
			}
		}

		return dollarIndices;
	}

	const dollarIndices = findDollarCharacter(format);

	const startKeywordIndices = dollarIndices.filter(function (index: number): boolean {

		if ((index + 1) == format.length)
			return false;

		const nextCharacter = format[index + 1];
		return (nextCharacter == '<');
	});

	const endKeywordIndicesPlusInvalids = startKeywordIndices.map(
		function (startIndex: number): number {

			for (let index = startIndex + 2; index < format.length; ++index) {
				if (format[index] == '>')
					return index + 1;
			}

			return -1;
		});

	const startEndKeywordIndicesPlusInvalids = startKeywordIndices.map(
		function (startIndex: number, i: number): [number, number] {
			return [startIndex, endKeywordIndicesPlusInvalids[i]];
		}
	);

	const startEndKeywordIndices = startEndKeywordIndicesPlusInvalids.filter(
		function (pair: [number, number]): boolean {

			return pair[1] != -1;
		});

	function createStringElement(indices: [number, number]): FormatElement {
		const element: FormatElement = {
			type: FormatElementType.String,
			text: format.substring(indices[0], indices[1]),
			keyword: null,
		};
		return element;
	}

	function isNumber(value: string | number): boolean {
		return ((value != null) &&
			(value !== '') &&
			!isNaN(Number(value.toString())));
	}

	function createKeywordElement(indices: [number, number]): FormatElement {
		const keywordName: string = format.substring(indices[0] + 2, indices[1] - 1);
		const startKeywordIndex = keywordName.lastIndexOf('_');
		const keywordNumberString = keywordName.substring(startKeywordIndex + 1, keywordName.length);

		if (startKeywordIndex != -1 && isNumber(keywordNumberString)) {
			const keywordNameRoot = keywordName.substring(0, startKeywordIndex);
			const keywordIndex = Number(keywordNumberString);
			const keywordType: FormatKeywordType = FormatKeywordType[keywordNameRoot as keyof typeof FormatKeywordType];

			const keyword: FormatKeyword = {
				type: keywordType,
				index: keywordIndex
			};
			const element: FormatElement = {
				type: FormatElementType.Keyword,
				text: null,
				keyword: keyword,
			};
			return element;
		}
		else {
			const keywordType: FormatKeywordType = <FormatKeywordType>keywordName;
			const keyword: FormatKeyword = {
				type: keywordType,
				index: 0
			};
			const element: FormatElement = {
				type: FormatElementType.Keyword,
				text: null,
				keyword: keyword,
			};
			return element;
		}
	}

	const formatElements: FormatElement[] = [];

	{
		let characterIndex = 0;

		while (characterIndex < format.length) {

			if (startEndKeywordIndices.length != 0) {
				const nextKeywordRange = startEndKeywordIndices[0]; // get front
				const startKeywordIndex = nextKeywordRange[0];
				if (characterIndex == startKeywordIndex) {
					const element = createKeywordElement(nextKeywordRange);
					formatElements.push(element);

					startEndKeywordIndices.shift(); // pop front

					characterIndex = nextKeywordRange[1];
				}
				else {
					const range: [number, number] = [characterIndex, startKeywordIndex];
					const element = createStringElement(range);
					formatElements.push(element);

					characterIndex = startKeywordIndex;
				}
			}
			else {
				const range: [number, number] = [characterIndex, format.length];
				const element = createStringElement(range);
				formatElements.push(element);

				characterIndex = format.length;
			}
		}
	}

	return formatElements;
}

export function createDefaultBultinTypeMap(): Map<string, BuiltinTypeOptions> {

	const builtinTypeMap = new Map<string, BuiltinTypeOptions>(
		[
			[
				JSON.stringify(
					{
						type: H.Type_type.Float_type,
						data: { precision: 16 },
					}
				),
				{
					type_name: 'f16',
				}
			],
			[
				JSON.stringify(
					{
						type: H.Type_type.Float_type,
						data: { precision: 32 },
					}
				),
				{
					type_name: 'f32',
				}
			],
			[
				JSON.stringify(
					{
						type: H.Type_type.Float_type,
						data: { precision: 64 },
					}
				),
				{
					type_name: 'f64',
				}
			],
			[
				JSON.stringify(
					{
						type: H.Type_type.Integer_type,
						data: { precision: 8 },
					}
				),
				{
					type_name: 'i8',
				}
			],
			[
				JSON.stringify(
					{
						type: H.Type_type.Integer_type,
						data: { precision: 16 },
					}
				),
				{
					type_name: 'i16',
				}
			],
			[
				JSON.stringify(
					{
						type: H.Type_type.Integer_type,
						data: { precision: 32 },
					}
				),
				{
					type_name: 'i32',
				}
			],
			[
				JSON.stringify(
					{
						type: H.Type_type.Integer_type,
						data: { precision: 64 },
					}
				),
				{
					type_name: 'i64',
				}
			],
		]
	);

	return builtinTypeMap;
}

export function createDefaultEditorOptions(): EditorOptions {

	const functionParametersFormatString = '$<parameter_type> $<parameter_name>';
	const separator = ', ';
	const functionDeclarationFormatString = '$<return_type> $<function_name>($<function_parameters>);';

	const functionParameterOptions: FunctionParameterOptions = {
		formatElements: parseFormat(functionParametersFormatString),
		separator: separator
	};

	const functionDeclarationOptions: FunctionDeclarationOptions = {
		formatElements: parseFormat(functionDeclarationFormatString)
	};

	const builtinTypeMap = createDefaultBultinTypeMap();

	const editorOptions: EditorOptions = {
		functionParameterOptions: functionParameterOptions,
		functionDeclarationOptions: functionDeclarationOptions,
		builtinTypeMap: builtinTypeMap
	};

	return editorOptions;
}
