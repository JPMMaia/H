interface Vector<T> {
    size: number;
    elements: T[];
}

interface Variant<Type_enum, T> {
    type: Type_enum;
    value: T;
}

enum Fundamental_type {
    Bool = "Bool",
    Byte = "Byte",
    Float16 = "Float16",
    Float32 = "Float32",
    Float64 = "Float64",
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

enum Variable_expression_type {
    Function_argument = "Function_argument",
    Local_variable = "Local_variable",
    Temporary = "Temporary",
}

enum Binary_operation {
    Add = "Add",
    Subtract = "Subtract",
    Multiply = "Multiply",
    Signed_divide = "Signed_divide",
    Unsigned_divide = "Unsigned_divide",
    Less_than = "Less_than",
}

enum Linkage {
    External = "External",
    Private = "Private",
}

enum Type_reference_enum {
    Alias_type_reference = "Alias_type_reference",
    Builtin_type_reference = "Builtin_type_reference",
    Constant_array_type = "Constant_array_type",
    Enum_type_reference = "Enum_type_reference",
    Fundamental_type = "Fundamental_type",
    Function_type = "Function_type",
    Integer_type = "Integer_type",
    Pointer_type = "Pointer_type",
    Struct_type_reference = "Struct_type_reference",
}

enum Expression_enum {
    Binary_expression = "Binary_expression",
    Call_expression = "Call_expression",
    Constant_expression = "Constant_expression",
    Return_expression = "Return_expression",
    Variable_expression = "Variable_expression",
}

interface Integer_type {
    number_of_bits: number;
    is_signed: boolean;
}

interface Builtin_type_reference {
    value: string;
}

interface Function_type {
    return_types: Vector<Type_reference>;
    parameter_types: Vector<Type_reference>;
    is_variadic: boolean;
}

interface Pointer_type {
    element_type: Vector<Type_reference>;
    is_mutable: boolean;
}

interface Module_reference {
    name: string;
}

interface Alias_type_reference {
    module_reference: Module_reference;
    id: number;
}

interface Constant_array_type {
    value_type: Vector<Type_reference>;
    size: number;
}

interface Enum_type_reference {
    module_reference: Module_reference;
    id: number;
}

interface Struct_type_reference {
    module_reference: Module_reference;
    id: number;
}

interface Type_reference {
    data: Variant<Type_reference_enum, Alias_type_reference | Builtin_type_reference | Constant_array_type | Enum_type_reference | Fundamental_type | Function_type | Integer_type | Pointer_type | Struct_type_reference>;
}

interface Alias_type_declaration {
    id: number;
    name: string;
    type: Vector<Type_reference>;
}

interface Enum_value {
    name: string;
    value: number;
}

interface Enum_declaration {
    id: number;
    name: string;
    values: Vector<Enum_value>;
}

interface Struct_declaration {
    id: number;
    name: string;
    member_types: Vector<Type_reference>;
    member_names: Vector<string>;
    is_packed: boolean;
    is_literal: boolean;
}

interface Variable_expression {
    type: Variable_expression_type;
    id: number;
}

interface Binary_expression {
    left_hand_side: Variable_expression;
    right_hand_side: Variable_expression;
    operation: Binary_operation;
}

interface Call_expression {
    function_name: string;
    arguments: Vector<Variable_expression>;
}

interface Constant_expression {
    type: Fundamental_type;
    data: string;
}

interface Return_expression {
    variable: Variable_expression;
}

interface Expression {
    data: Variant<Expression_enum, Binary_expression | Call_expression | Constant_expression | Return_expression | Variable_expression>;
}

interface Statement {
    id: number;
    name: string;
    expressions: Vector<Expression>;
}

interface Function_declaration {
    id: number;
    name: string;
    type: Function_type;
    parameter_ids: Vector<number>;
    parameter_names: Vector<string>;
    linkage: Linkage;
}

interface Function_definition {
    id: number;
    statements: Vector<Statement>;
}

interface Language_version {
    major: number;
    minor: number;
    patch: number;
}

interface Module_declarations {
    alias_type_declarations: Vector<Alias_type_declaration>;
    enum_declarations: Vector<Enum_declaration>;
    struct_declarations: Vector<Struct_declaration>;
    function_declarations: Vector<Function_declaration>;
}

interface Module_definitions {
    function_definitions: Vector<Function_definition>;
}

interface Module {
    language_version: Language_version;
    name: string;
    export_declarations: Module_declarations;
    internal_declarations: Module_declarations;
    definitions: Module_definitions;
}

