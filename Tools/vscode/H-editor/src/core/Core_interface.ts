export interface Vector<T> {
    size: number;
    elements: T[];
}

export interface Variant<Type_enum, T> {
    type: Type_enum;
    value: T;
}

export enum Fundamental_type {
    Bool = "Bool",
    Byte = "Byte",
    Float16 = "Float16",
    Float32 = "Float32",
    Float64 = "Float64",
    String = "String",
    Any_type = "Any_type",
    C_bool = "C_bool",
    C_char = "C_char",
    C_schar = "C_schar",
    C_uchar = "C_uchar",
    C_short = "C_short",
    C_ushort = "C_ushort",
    C_int = "C_int",
    C_uint = "C_uint",
    C_long = "C_long",
    C_ulong = "C_ulong",
    C_longlong = "C_longlong",
    C_ulonglong = "C_ulonglong",
}

export enum Binary_operation {
    Add = "Add",
    Subtract = "Subtract",
    Multiply = "Multiply",
    Signed_divide = "Signed_divide",
    Unsigned_divide = "Unsigned_divide",
    Less_than = "Less_than",
}

export enum Linkage {
    External = "External",
    Private = "Private",
}

export enum Expression_enum {
    Binary_expression = "Binary_expression",
    Call_expression = "Call_expression",
    Constant_expression = "Constant_expression",
    Invalid_expression = "Invalid_expression",
    Return_expression = "Return_expression",
    Struct_member_expression = "Struct_member_expression",
    Variable_expression = "Variable_expression",
}

export enum Type_reference_enum {
    Builtin_type_reference = "Builtin_type_reference",
    Constant_array_type = "Constant_array_type",
    Custom_type_reference = "Custom_type_reference",
    Fundamental_type = "Fundamental_type",
    Function_type = "Function_type",
    Integer_type = "Integer_type",
    Pointer_type = "Pointer_type",
}

export interface Integer_type {
    number_of_bits: number;
    is_signed: boolean;
}

export interface Builtin_type_reference {
    value: string;
}

export interface Function_type {
    input_parameter_types: Vector<Type_reference>;
    output_parameter_types: Vector<Type_reference>;
    is_variadic: boolean;
}

export interface Pointer_type {
    element_type: Vector<Type_reference>;
    is_mutable: boolean;
}

export interface Module_reference {
    name: string;
}

export interface Constant_array_type {
    value_type: Vector<Type_reference>;
    size: number;
}

export interface Custom_type_reference {
    module_reference: Module_reference;
    name: string;
}

export interface Type_reference {
    data: Variant<Type_reference_enum, Builtin_type_reference | Constant_array_type | Custom_type_reference | Fundamental_type | Function_type | Integer_type | Pointer_type>;
}

export interface Alias_type_declaration {
    name: string;
    type: Vector<Type_reference>;
}

export interface Enum_value {
    name: string;
    value: number;
}

export interface Enum_declaration {
    name: string;
    values: Vector<Enum_value>;
}

export interface Struct_declaration {
    name: string;
    member_types: Vector<Type_reference>;
    member_names: Vector<string>;
    is_packed: boolean;
    is_literal: boolean;
}

export interface Variable_expression {
    name: string;
}

export interface Expression_index {
    expression_index: number;
}

export interface Binary_expression {
    left_hand_side: Expression_index;
    right_hand_side: Expression_index;
    operation: Binary_operation;
}

export interface Call_expression {
    function_name: string;
    arguments: Vector<Expression_index>;
}

export interface Constant_expression {
    type: Fundamental_type;
    data: string;
}

export interface Invalid_expression {
    value: string;
}

export interface Return_expression {
    expression: Expression_index;
}

export interface Struct_member_expression {
    instance: Expression_index;
    member_name: string;
}

export interface Expression {
    data: Variant<Expression_enum, Binary_expression | Call_expression | Constant_expression | Invalid_expression | Return_expression | Struct_member_expression | Variable_expression>;
}

export interface Statement {
    name: string;
    expressions: Vector<Expression>;
}

export interface Function_declaration {
    name: string;
    type: Function_type;
    input_parameter_names: Vector<string>;
    output_parameter_names: Vector<string>;
    linkage: Linkage;
}

export interface Function_definition {
    name: string;
    statements: Vector<Statement>;
}

export interface Language_version {
    major: number;
    minor: number;
    patch: number;
}

export interface Import_module_with_alias {
    module_name: string;
    alias: string;
}

export interface Module_dependencies {
    alias_imports: Vector<Import_module_with_alias>;
}

export interface Module_declarations {
    alias_type_declarations: Vector<Alias_type_declaration>;
    enum_declarations: Vector<Enum_declaration>;
    struct_declarations: Vector<Struct_declaration>;
    function_declarations: Vector<Function_declaration>;
}

export interface Module_definitions {
    function_definitions: Vector<Function_definition>;
}

export interface Module {
    language_version: Language_version;
    name: string;
    dependencies: Module_dependencies;
    export_declarations: Module_declarations;
    internal_declarations: Module_declarations;
    definitions: Module_definitions;
}

