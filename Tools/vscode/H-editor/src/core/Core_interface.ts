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

export enum Access_type {
    Read = "Read",
    Write = "Write",
    Read_write = "Read_write",
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
    Has = "Has",
}

export enum Cast_type {
    Numeric = "Numeric",
    BitCast = "BitCast",
}

export enum Instantiate_expression_type {
    Default = "Default",
    Explicit = "Explicit",
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
    Access_expression = "Access_expression",
    Assignment_expression = "Assignment_expression",
    Binary_expression = "Binary_expression",
    Block_expression = "Block_expression",
    Break_expression = "Break_expression",
    Call_expression = "Call_expression",
    Cast_expression = "Cast_expression",
    Comment_expression = "Comment_expression",
    Constant_expression = "Constant_expression",
    Constant_array_expression = "Constant_array_expression",
    Continue_expression = "Continue_expression",
    For_loop_expression = "For_loop_expression",
    If_expression = "If_expression",
    Instantiate_expression = "Instantiate_expression",
    Invalid_expression = "Invalid_expression",
    Null_pointer_expression = "Null_pointer_expression",
    Parenthesis_expression = "Parenthesis_expression",
    Return_expression = "Return_expression",
    Switch_expression = "Switch_expression",
    Ternary_condition_expression = "Ternary_condition_expression",
    Unary_expression = "Unary_expression",
    Variable_declaration_expression = "Variable_declaration_expression",
    Variable_declaration_with_type_expression = "Variable_declaration_with_type_expression",
    Variable_expression = "Variable_expression",
    While_loop_expression = "While_loop_expression",
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

export interface Indexed_comment {
    index: number;
    comment: string;
}

export interface Statement {
    expressions: Vector<Expression>;
    newlines_after?: number;
}

export interface Alias_type_declaration {
    name: string;
    unique_name?: string;
    type: Vector<Type_reference>;
    comment?: string;
}

export interface Enum_value {
    name: string;
    value?: Statement;
    comment?: string;
}

export interface Enum_declaration {
    name: string;
    unique_name?: string;
    values: Vector<Enum_value>;
    comment?: string;
}

export interface Struct_declaration {
    name: string;
    unique_name?: string;
    member_types: Vector<Type_reference>;
    member_names: Vector<string>;
    member_default_values: Vector<Statement>;
    is_packed: boolean;
    is_literal: boolean;
    comment?: string;
    member_comments: Vector<Indexed_comment>;
}

export interface Union_declaration {
    name: string;
    unique_name?: string;
    member_types: Vector<Type_reference>;
    member_names: Vector<string>;
    comment?: string;
    member_comments: Vector<Indexed_comment>;
}

export interface Variable_expression {
    name: string;
    access_type: Access_type;
}

export interface Expression_index {
    expression_index: number;
}

export interface Access_expression {
    expression: Expression_index;
    member_name: string;
    access_type: Access_type;
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

export interface Block_expression {
    statements: Vector<Statement>;
}

export interface Break_expression {
    loop_count: number;
}

export interface Call_expression {
    expression: Expression_index;
    arguments: Vector<Expression_index>;
}

export interface Cast_expression {
    source: Expression_index;
    destination_type: Type_reference;
    cast_type: Cast_type;
}

export interface Comment_expression {
    comment: string;
}

export interface Constant_expression {
    type: Type_reference;
    data: string;
}

export interface Constant_array_expression {
    type: Type_reference;
    array_data: Vector<Statement>;
}

export interface Continue_expression {
}

export interface For_loop_expression {
    variable_name: string;
    range_begin: Expression_index;
    range_end: Statement;
    range_comparison_operation: Binary_operation;
    step_by?: Expression_index;
    then_statements: Vector<Statement>;
}

export interface Condition_statement_pair {
    condition?: Statement;
    then_statements: Vector<Statement>;
}

export interface If_expression {
    series: Vector<Condition_statement_pair>;
}

export interface Instantiate_member_value_pair {
    member_name: string;
    value: Statement;
}

export interface Instantiate_expression {
    type: Instantiate_expression_type;
    members: Vector<Instantiate_member_value_pair>;
}

export interface Invalid_expression {
    value: string;
}

export interface Null_pointer_expression {
}

export interface Parenthesis_expression {
    expression: Expression_index;
}

export interface Return_expression {
    expression: Expression_index;
}

export interface Switch_case_expression_pair {
    case_value?: Expression_index;
    statements: Vector<Statement>;
}

export interface Switch_expression {
    value: Expression_index;
    cases: Vector<Switch_case_expression_pair>;
}

export interface Ternary_condition_expression {
    condition: Expression_index;
    then_statement: Statement;
    else_statement: Statement;
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

export interface Variable_declaration_with_type_expression {
    name: string;
    is_mutable: boolean;
    type: Type_reference;
    right_hand_side: Statement;
}

export interface While_loop_expression {
    condition: Statement;
    then_statements: Vector<Statement>;
}

export interface Expression {
    data: Variant<Expression_enum, Access_expression | Assignment_expression | Binary_expression | Block_expression | Break_expression | Call_expression | Cast_expression | Comment_expression | Constant_expression | Constant_array_expression | Continue_expression | For_loop_expression | If_expression | Instantiate_expression | Invalid_expression | Null_pointer_expression | Parenthesis_expression | Return_expression | Switch_expression | Ternary_condition_expression | Unary_expression | Variable_declaration_expression | Variable_declaration_with_type_expression | Variable_expression | While_loop_expression>;
}

export interface Function_declaration {
    name: string;
    unique_name?: string;
    type: Function_type;
    input_parameter_names: Vector<string>;
    output_parameter_names: Vector<string>;
    linkage: Linkage;
    comment?: string;
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
    union_declarations: Vector<Union_declaration>;
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
    comment?: string;
}

