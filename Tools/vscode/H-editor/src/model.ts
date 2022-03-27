export interface Integer_type {
	precision: number;
}

export interface Float_type {
	precision: number;
}

export enum Type_type {
	Integer_type = "integer_type",
	Float_type = "float_type",
}

export interface Type {
	type: Type_type;
	data: Integer_type | Float_type;
}

export enum Variable_expression_type {
	Function_argument = "function_argument",
	Local_variable = "local_variable",
	Temporary = "temporary",
}

export interface Variable_expression {
	type: Variable_expression_type;
	id: number;
}

export enum Binary_expression_operation {
	Add = "add",
	Subtract = "subtract",
	Multiply = "multiply",
	Signed_divide = "signed_divide",
	Unsigned_divide = "unsigned_divide",
	Less_tha = "less_than"
}

export interface Binary_expression {
	left_hand_side: Variable_expression;
	right_hand_side: Variable_expression;
	operation: Binary_expression_operation;
}

export interface Call_expression {
	function_name: string;
	arguments: Variable_expression[];
}

export interface Integer_constant {
	number_of_bits: number;
	is_signed: boolean;
	value: number;
}

export interface Half_constant {
	value: number;
}

export interface Float_constant {
	value: number;
}

export interface Double_constant {
	value: number;
}

export interface Constant_expression {
	type: Type;
	data: Integer_constant | Half_constant | Float_constant | Double_constant;
}

export interface Return_expression {
	variable: Variable_expression;
}

export enum Expression_type {
	Binary_expression = "binary_expression",
	Call_expression = "call_expression",
	Constant_expression = "constant_expression",
	Return_expression = "return_expression",
	Variable_expression = "variable_expression",
}

export interface Expression {
	type: Expression_type;
	data: Binary_expression | Call_expression | Constant_expression | Return_expression | Variable_expression;
}

export interface Statement {
	id: number;
	statement_name: string;
	expressions: Expression[];
}

export interface Function_type {
	return_type: Type;
	parameter_types: Type[];
}

export enum Linkage {
	External = "external",
	Private = "private",
}

export interface H_function {
	type: Function_type;
	function_name: string;
	argument_ids: number[];
	argument_names: string[];
	linkage: Linkage;
	statements: Statement[];
}

export interface H_module {
	functions: H_function[];
}
