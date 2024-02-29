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
    Divide = "Divide",
    Modulus = "Modulus",
    Equal = "Equal",
    Not_equal = "Not_equal",
    Less_than = "Less_than",
    Less_than_or_equal_to = "Less_than_or_equal_to",
    Greater_than = "Greater_than",
    Greater_than_or_equal_to = "Greater_than_or_equal_to",
    Logical_and = "Logical_and",
    Logical_or = "Logical_or",
    Bitwise_and = "Bitwise_and",
    Bitwise_or = "Bitwise_or",
    Bitwise_xor = "Bitwise_xor",
    Bit_shift_left = "Bit_shift_left",
    Bit_shift_right = "Bit_shift_right",
}

export enum Cast_type {
    Numeric = "Numeric",
    BitCast = "BitCast",
}

export enum Unary_operation {
    Not = "Not",
    Bitwise_not = "Bitwise_not",
    Minus = "Minus",
    Pre_increment = "Pre_increment",
    Post_increment = "Post_increment",
    Pre_decrement = "Pre_decrement",
    Post_decrement = "Post_decrement",
    Indirection = "Indirection",
    Address_of = "Address_of",
}

export enum Linkage {
    External = "External",
    Private = "Private",
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

export enum Expression_enum {
    Assignment_expression = "Assignment_expression",
    Binary_expression = "Binary_expression",
    Call_expression = "Call_expression",
    Cast_expression = "Cast_expression",
    Constant_expression = "Constant_expression",
    Invalid_expression = "Invalid_expression",
    Parenthesis_expression = "Parenthesis_expression",
    Return_expression = "Return_expression",
    Struct_member_expression = "Struct_member_expression",
    Unary_expression = "Unary_expression",
    Variable_declaration_expression = "Variable_declaration_expression",
    Variable_expression = "Variable_expression",
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

export interface Assignment_expression {
    left_hand_side: Expression_index;
    right_hand_side: Expression_index;
    additional_operation?: Binary_operation;
}

export interface Binary_expression {
    left_hand_side: Expression_index;
    right_hand_side: Expression_index;
    operation: Binary_operation;
}

export interface Call_expression {
    module_reference: Module_reference;
    function_name: string;
    arguments: Vector<Expression_index>;
}

export interface Cast_expression {
    source: Expression_index;
    destination_type: Type_reference;
    cast_type: Cast_type;
}

export interface Constant_expression {
    type: Type_reference;
    data: string;
}

export interface Invalid_expression {
    value: string;
}

export interface Parenthesis_expression {
    expression: Expression_index;
}

export interface Return_expression {
    expression: Expression_index;
}

export interface Struct_member_expression {
    instance: Expression_index;
    member_name: string;
}

export interface Unary_expression {
    expression: Expression_index;
    operation: Unary_operation;
}

export interface Variable_declaration_expression {
    name: string;
    is_mutable: boolean;
    right_hand_side: Expression_index;
}

export interface Expression {
    data: Variant<Expression_enum, Assignment_expression | Binary_expression | Call_expression | Cast_expression | Constant_expression | Invalid_expression | Parenthesis_expression | Return_expression | Struct_member_expression | Unary_expression | Variable_declaration_expression | Variable_expression>;
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
    usages: Vector<string>;
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

