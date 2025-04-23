
import * as Core from "./Core_interface";

export interface Variant<Type_enum, T> {
    type: Type_enum;
    value: T;
}

export interface Module {
    name: string;
    imports: Import_module_with_alias[];
    declarations: Declaration[];
    comment?: string;
    source_file_path?: string;
}

export function create_intermediate_representation(core_module: Core.Module): Module {

    const imports = core_module.dependencies.alias_imports.elements.map(value => core_to_intermediate_import_module_with_alias(value));
    const declarations = create_declarations(core_module);

    return {
        name: core_module.name,
        imports: imports,
        declarations: declarations,
        comment: core_module.comment,
        source_file_path: core_module.source_file_path
    };
}

export function create_core_module(module: Module, language_version: Core.Language_version): Core.Module {

    const alias_imports = module.imports.map(value => intermediate_to_core_import_module_with_alias(value));

    const export_alias: Core.Alias_type_declaration[] = [];
    const internal_alias: Core.Alias_type_declaration[] = [];
    const export_enums: Core.Enum_declaration[] = [];
    const internal_enums: Core.Enum_declaration[] = [];
    const export_functions: Core.Function_declaration[] = [];
    const internal_functions: Core.Function_declaration[] = [];
    const export_function_constructors: Core.Function_constructor[] = [];
    const internal_function_constructors: Core.Function_constructor[] = [];
    const export_global_variables: Core.Global_variable_declaration[] = [];
    const internal_global_variables: Core.Global_variable_declaration[] = [];
    const export_structs: Core.Struct_declaration[] = [];
    const internal_structs: Core.Struct_declaration[] = [];
    const export_type_constructors: Core.Type_constructor[] = [];
    const internal_type_constructors: Core.Type_constructor[] = [];
    const export_unions: Core.Union_declaration[] = [];
    const internal_unions: Core.Union_declaration[] = [];
    const function_definitions: Core.Function_definition[] = [];

    for (const declaration of module.declarations) {
        switch (declaration.type) {
            case Declaration_type.Alias: {
                const array = declaration.is_export ? export_alias : internal_alias;
                array.push(intermediate_to_core_alias_type_declaration(declaration.value as Alias_type_declaration));
                break;
            }
            case Declaration_type.Enum: {
                const array = declaration.is_export ? export_enums : internal_enums;
                array.push(intermediate_to_core_enum_declaration(declaration.value as Enum_declaration));
                break;
            }
            case Declaration_type.Function: {
                const array = declaration.is_export ? export_functions : internal_functions;
                const function_value = declaration.value as Function;
                array.push(intermediate_to_core_function_declaration(function_value.declaration));
                if (function_value.definition !== undefined) {
                    function_definitions.push(intermediate_to_core_function_definition(function_value.definition));
                }
                break;
            }
            case Declaration_type.Function_constructor: {
                const array = declaration.is_export ? export_function_constructors : internal_function_constructors;
                array.push(intermediate_to_core_function_constructor(declaration.value as Function_constructor));
                break;
            }
            case Declaration_type.Global_variable: {
                const array = declaration.is_export ? export_global_variables : internal_global_variables;
                array.push(intermediate_to_core_global_variable_declaration(declaration.value as Global_variable_declaration));
                break;
            }
            case Declaration_type.Struct: {
                const array = declaration.is_export ? export_structs : internal_structs;
                array.push(intermediate_to_core_struct_declaration(declaration.value as Struct_declaration));
                break;
            }
            case Declaration_type.Type_constructor: {
                const array = declaration.is_export ? export_type_constructors : internal_type_constructors;
                array.push(intermediate_to_core_type_constructor(declaration.value as Type_constructor));
                break;
            }
            case Declaration_type.Union: {
                const array = declaration.is_export ? export_unions : internal_unions;
                array.push(intermediate_to_core_union_declaration(declaration.value as Union_declaration));
                break;
            }
        }
    }

    return {
        language_version: language_version,
        name: module.name,
        dependencies: {
            alias_imports: {
                size: alias_imports.length,
                elements: alias_imports
            }
        },
        export_declarations: {
            alias_type_declarations: {
                size: export_alias.length,
                elements: export_alias
            },
            enum_declarations: {
                size: export_enums.length,
                elements: export_enums
            },
            function_constructors: {
                size: export_function_constructors.length,
                elements: export_function_constructors
            },
            function_declarations: {
                size: export_functions.length,
                elements: export_functions
            },
            global_variable_declarations: {
                size: export_global_variables.length,
                elements: export_global_variables,
            },
            struct_declarations: {
                size: export_structs.length,
                elements: export_structs
            },
            type_constructors: {
                size: export_type_constructors.length,
                elements: export_type_constructors
            },
            union_declarations: {
                size: export_unions.length,
                elements: export_unions
            }
        },
        internal_declarations: {
            alias_type_declarations: {
                size: internal_alias.length,
                elements: internal_alias
            },
            enum_declarations: {
                size: internal_enums.length,
                elements: internal_enums
            },
            function_constructors: {
                size: export_function_constructors.length,
                elements: export_function_constructors
            },
            function_declarations: {
                size: internal_functions.length,
                elements: internal_functions
            },
            global_variable_declarations: {
                size: internal_global_variables.length,
                elements: internal_global_variables,
            },
            struct_declarations: {
                size: internal_structs.length,
                elements: internal_structs
            },
            type_constructors: {
                size: internal_type_constructors.length,
                elements: internal_type_constructors
            },
            union_declarations: {
                size: internal_unions.length,
                elements: internal_unions
            }
        },
        definitions: {
            function_definitions: {
                size: function_definitions.length,
                elements: function_definitions
            }
        },
        comment: module.comment,
        source_file_path: module.source_file_path
    };
}

export enum Declaration_type {
    Alias,
    Enum,
    Function,
    Function_constructor,
    Global_variable,
    Struct,
    Type_constructor,
    Union
}

export interface Declaration {
    name: string;
    type: Declaration_type;
    is_export: boolean;
    value: Alias_type_declaration | Enum_declaration | Function | Function_constructor | Global_variable_declaration | Struct_declaration | Type_constructor | Union_declaration
}

function create_declarations(module: Core.Module): Declaration[] {

    const declarations: Declaration[] = [
        ...module.export_declarations.alias_type_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Alias, is_export: true, value: core_to_intermediate_alias_type_declaration(value) }; }),
        ...module.export_declarations.enum_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Enum, is_export: true, value: core_to_intermediate_enum_declaration(value) }; }),
        ...module.export_declarations.function_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Function, is_export: true, value: core_to_intermediate_function(module, value) }; }),
        ...module.export_declarations.function_constructors.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Function_constructor, is_export: true, value: core_to_intermediate_function_constructor(value) }; }),
        ...module.export_declarations.global_variable_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Global_variable, is_export: true, value: core_to_intermediate_global_variable_declaration(value) }; }),
        ...module.export_declarations.struct_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Struct, is_export: true, value: core_to_intermediate_struct_declaration(value) }; }),
        ...module.export_declarations.type_constructors.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Type_constructor, is_export: true, value: core_to_intermediate_type_constructor(value) }; }),
        ...module.export_declarations.union_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Union, is_export: true, value: core_to_intermediate_union_declaration(value) }; }),
        ...module.internal_declarations.alias_type_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Alias, is_export: false, value: core_to_intermediate_alias_type_declaration(value) }; }),
        ...module.internal_declarations.enum_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Enum, is_export: false, value: core_to_intermediate_enum_declaration(value) }; }),
        ...module.internal_declarations.function_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Function, is_export: false, value: core_to_intermediate_function(module, value) }; }),
        ...module.internal_declarations.function_constructors.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Function_constructor, is_export: false, value: core_to_intermediate_function_constructor(value) }; }),
        ...module.internal_declarations.global_variable_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Global_variable, is_export: false, value: core_to_intermediate_global_variable_declaration(value) }; }),
        ...module.internal_declarations.struct_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Struct, is_export: false, value: core_to_intermediate_struct_declaration(value) }; }),
        ...module.internal_declarations.type_constructors.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Type_constructor, is_export: false, value: core_to_intermediate_type_constructor(value) }; }),
        ...module.internal_declarations.union_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Union, is_export: false, value: core_to_intermediate_union_declaration(value) }; }),
    ];

    return declarations;
}

export interface Function {
    declaration: Function_declaration;
    definition: Function_definition | undefined;
}

function core_to_intermediate_function(module: Core.Module, declaration: Core.Function_declaration): Function {

    const definition_index = module.definitions.function_definitions.elements.findIndex(value => value.name === declaration.name);
    const definition = definition_index !== -1 ? module.definitions.function_definitions.elements[definition_index] : undefined;

    const value: Function = {
        declaration: core_to_intermediate_function_declaration(declaration),
        definition: definition !== undefined ? core_to_intermediate_function_definition(definition) : undefined
    };

    return value;
}

export interface Statement {
    expression: Expression;

}

function core_to_intermediate_statement(core_value: Core.Statement): Statement {
    return {
        expression: core_to_intermediate_expression(core_value.expressions.elements[0], core_value)
    };
}

function intermediate_to_core_statement(intermediate_value: Statement): Core.Statement {

    const expressions: Core.Expression[] = [];
    intermediate_to_core_expression(intermediate_value.expression, expressions);

    return {
        expressions: {
            size: expressions.length,
            elements: expressions
        }
    };
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
    C_longdouble = "C_longdouble",
}

export enum Linkage {
    External = "External",
    Private = "Private",
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

export enum Type_reference_enum {
    Builtin_type_reference = "Builtin_type_reference",
    Constant_array_type = "Constant_array_type",
    Custom_type_reference = "Custom_type_reference",
    Fundamental_type = "Fundamental_type",
    Function_pointer_type = "Function_pointer_type",
    Integer_type = "Integer_type",
    Null_pointer_type = "Null_pointer_type",
    Parameter_type = "Parameter_type",
    Pointer_type = "Pointer_type",
    Type_instance = "Type_instance",
}

export enum Expression_enum {
    Access_expression = "Access_expression",
    Access_array_expression = "Access_array_expression",
    Assert_expression = "Assert_expression",
    Assignment_expression = "Assignment_expression",
    Binary_expression = "Binary_expression",
    Block_expression = "Block_expression",
    Break_expression = "Break_expression",
    Call_expression = "Call_expression",
    Cast_expression = "Cast_expression",
    Comment_expression = "Comment_expression",
    Compile_time_expression = "Compile_time_expression",
    Constant_expression = "Constant_expression",
    Constant_array_expression = "Constant_array_expression",
    Continue_expression = "Continue_expression",
    Defer_expression = "Defer_expression",
    Dereference_and_access_expression = "Dereference_and_access_expression",
    For_loop_expression = "For_loop_expression",
    Function_expression = "Function_expression",
    Instance_call_expression = "Instance_call_expression",
    If_expression = "If_expression",
    Instantiate_expression = "Instantiate_expression",
    Invalid_expression = "Invalid_expression",
    Null_pointer_expression = "Null_pointer_expression",
    Parenthesis_expression = "Parenthesis_expression",
    Reflection_expression = "Reflection_expression",
    Return_expression = "Return_expression",
    Struct_expression = "Struct_expression",
    Switch_expression = "Switch_expression",
    Ternary_condition_expression = "Ternary_condition_expression",
    Type_expression = "Type_expression",
    Unary_expression = "Unary_expression",
    Union_expression = "Union_expression",
    Variable_declaration_expression = "Variable_declaration_expression",
    Variable_declaration_with_type_expression = "Variable_declaration_with_type_expression",
    Variable_expression = "Variable_expression",
    While_loop_expression = "While_loop_expression",
}

export interface Source_location {
    file_path?: string;
    line: number;
    column: number;
}

function core_to_intermediate_source_location(core_value: Core.Source_location): Source_location {
    return {
        file_path: core_value.file_path,
        line: core_value.line,
        column: core_value.column,
    };
}

function intermediate_to_core_source_location(intermediate_value: Source_location): Core.Source_location {
    return {
        file_path: intermediate_value.file_path,
        line: intermediate_value.line,
        column: intermediate_value.column,
    };
}

export interface Source_position {
    line: number;
    column: number;
}

function core_to_intermediate_source_position(core_value: Core.Source_position): Source_position {
    return {
        line: core_value.line,
        column: core_value.column,
    };
}

function intermediate_to_core_source_position(intermediate_value: Source_position): Core.Source_position {
    return {
        line: intermediate_value.line,
        column: intermediate_value.column,
    };
}

export interface Integer_type {
    number_of_bits: number;
    is_signed: boolean;
}

function core_to_intermediate_integer_type(core_value: Core.Integer_type): Integer_type {
    return {
        number_of_bits: core_value.number_of_bits,
        is_signed: core_value.is_signed,
    };
}

function intermediate_to_core_integer_type(intermediate_value: Integer_type): Core.Integer_type {
    return {
        number_of_bits: intermediate_value.number_of_bits,
        is_signed: intermediate_value.is_signed,
    };
}

export interface Builtin_type_reference {
    value: string;
}

function core_to_intermediate_builtin_type_reference(core_value: Core.Builtin_type_reference): Builtin_type_reference {
    return {
        value: core_value.value,
    };
}

function intermediate_to_core_builtin_type_reference(intermediate_value: Builtin_type_reference): Core.Builtin_type_reference {
    return {
        value: intermediate_value.value,
    };
}

export interface Function_type {
    input_parameter_types: Type_reference[];
    output_parameter_types: Type_reference[];
    is_variadic: boolean;
}

function core_to_intermediate_function_type(core_value: Core.Function_type): Function_type {
    return {
        input_parameter_types: core_value.input_parameter_types.elements.map(value => core_to_intermediate_type_reference(value)),
        output_parameter_types: core_value.output_parameter_types.elements.map(value => core_to_intermediate_type_reference(value)),
        is_variadic: core_value.is_variadic,
    };
}

function intermediate_to_core_function_type(intermediate_value: Function_type): Core.Function_type {
    return {
        input_parameter_types: {
            size: intermediate_value.input_parameter_types.length,
            elements: intermediate_value.input_parameter_types.map(value => intermediate_to_core_type_reference(value)),
        },
        output_parameter_types: {
            size: intermediate_value.output_parameter_types.length,
            elements: intermediate_value.output_parameter_types.map(value => intermediate_to_core_type_reference(value)),
        },
        is_variadic: intermediate_value.is_variadic,
    };
}

export interface Function_pointer_type {
    type: Function_type;
    input_parameter_names: string[];
    output_parameter_names: string[];
}

function core_to_intermediate_function_pointer_type(core_value: Core.Function_pointer_type): Function_pointer_type {
    return {
        type: core_to_intermediate_function_type(core_value.type),
        input_parameter_names: core_value.input_parameter_names.elements,
        output_parameter_names: core_value.output_parameter_names.elements,
    };
}

function intermediate_to_core_function_pointer_type(intermediate_value: Function_pointer_type): Core.Function_pointer_type {
    return {
        type: intermediate_to_core_function_type(intermediate_value.type),
        input_parameter_names: {
            size: intermediate_value.input_parameter_names.length,
            elements: intermediate_value.input_parameter_names,
        },
        output_parameter_names: {
            size: intermediate_value.output_parameter_names.length,
            elements: intermediate_value.output_parameter_names,
        },
    };
}

export interface Null_pointer_type {
}

function core_to_intermediate_null_pointer_type(core_value: Core.Null_pointer_type): Null_pointer_type {
    return {
    };
}

function intermediate_to_core_null_pointer_type(intermediate_value: Null_pointer_type): Core.Null_pointer_type {
    return {
    };
}

export interface Pointer_type {
    element_type: Type_reference[];
    is_mutable: boolean;
}

function core_to_intermediate_pointer_type(core_value: Core.Pointer_type): Pointer_type {
    return {
        element_type: core_value.element_type.elements.map(value => core_to_intermediate_type_reference(value)),
        is_mutable: core_value.is_mutable,
    };
}

function intermediate_to_core_pointer_type(intermediate_value: Pointer_type): Core.Pointer_type {
    return {
        element_type: {
            size: intermediate_value.element_type.length,
            elements: intermediate_value.element_type.map(value => intermediate_to_core_type_reference(value)),
        },
        is_mutable: intermediate_value.is_mutable,
    };
}

export interface Module_reference {
    name: string;
}

function core_to_intermediate_module_reference(core_value: Core.Module_reference): Module_reference {
    return {
        name: core_value.name,
    };
}

function intermediate_to_core_module_reference(intermediate_value: Module_reference): Core.Module_reference {
    return {
        name: intermediate_value.name,
    };
}

export interface Constant_array_type {
    value_type: Type_reference[];
    size: number;
}

function core_to_intermediate_constant_array_type(core_value: Core.Constant_array_type): Constant_array_type {
    return {
        value_type: core_value.value_type.elements.map(value => core_to_intermediate_type_reference(value)),
        size: core_value.size,
    };
}

function intermediate_to_core_constant_array_type(intermediate_value: Constant_array_type): Core.Constant_array_type {
    return {
        value_type: {
            size: intermediate_value.value_type.length,
            elements: intermediate_value.value_type.map(value => intermediate_to_core_type_reference(value)),
        },
        size: intermediate_value.size,
    };
}

export interface Custom_type_reference {
    module_reference: Module_reference;
    name: string;
}

function core_to_intermediate_custom_type_reference(core_value: Core.Custom_type_reference): Custom_type_reference {
    return {
        module_reference: core_to_intermediate_module_reference(core_value.module_reference),
        name: core_value.name,
    };
}

function intermediate_to_core_custom_type_reference(intermediate_value: Custom_type_reference): Core.Custom_type_reference {
    return {
        module_reference: intermediate_to_core_module_reference(intermediate_value.module_reference),
        name: intermediate_value.name,
    };
}

export interface Type_instance {
    type_constructor: Custom_type_reference;
    arguments: Statement[];
}

function core_to_intermediate_type_instance(core_value: Core.Type_instance): Type_instance {
    return {
        type_constructor: core_to_intermediate_custom_type_reference(core_value.type_constructor),
        arguments: core_value.arguments.elements.map(value => core_to_intermediate_statement(value)),
    };
}

function intermediate_to_core_type_instance(intermediate_value: Type_instance): Core.Type_instance {
    return {
        type_constructor: intermediate_to_core_custom_type_reference(intermediate_value.type_constructor),
        arguments: {
            size: intermediate_value.arguments.length,
            elements: intermediate_value.arguments.map(value => intermediate_to_core_statement(value)),
        },
    };
}

export interface Parameter_type {
    name: string;
}

function core_to_intermediate_parameter_type(core_value: Core.Parameter_type): Parameter_type {
    return {
        name: core_value.name,
    };
}

function intermediate_to_core_parameter_type(intermediate_value: Parameter_type): Core.Parameter_type {
    return {
        name: intermediate_value.name,
    };
}

export interface Type_reference {
    data: Variant<Type_reference_enum, Builtin_type_reference | Constant_array_type | Custom_type_reference | Fundamental_type | Function_pointer_type | Integer_type | Null_pointer_type | Parameter_type | Pointer_type | Type_instance>;
}

function core_to_intermediate_type_reference(core_value: Core.Type_reference): Type_reference {
    return {
        data: (() => {
            switch (core_value.data.type) {
                case Core.Type_reference_enum.Builtin_type_reference: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_builtin_type_reference(core_value.data.value as Core.Builtin_type_reference)
                    };
                }
                case Core.Type_reference_enum.Constant_array_type: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_constant_array_type(core_value.data.value as Core.Constant_array_type)
                    };
                }
                case Core.Type_reference_enum.Custom_type_reference: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_custom_type_reference(core_value.data.value as Core.Custom_type_reference)
                    };
                }
                case Core.Type_reference_enum.Fundamental_type: {
                    return {
                        type: core_value.data.type,
                        value: core_value.data.value as Fundamental_type
                    };
                }
                case Core.Type_reference_enum.Function_pointer_type: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_function_pointer_type(core_value.data.value as Core.Function_pointer_type)
                    };
                }
                case Core.Type_reference_enum.Integer_type: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_integer_type(core_value.data.value as Core.Integer_type)
                    };
                }
                case Core.Type_reference_enum.Null_pointer_type: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_null_pointer_type(core_value.data.value as Core.Null_pointer_type)
                    };
                }
                case Core.Type_reference_enum.Parameter_type: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_parameter_type(core_value.data.value as Core.Parameter_type)
                    };
                }
                case Core.Type_reference_enum.Pointer_type: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_pointer_type(core_value.data.value as Core.Pointer_type)
                    };
                }
                case Core.Type_reference_enum.Type_instance: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_type_instance(core_value.data.value as Core.Type_instance)
                    };
                }
            }
        })(),
    };
}

function intermediate_to_core_type_reference(intermediate_value: Type_reference): Core.Type_reference {
    switch (intermediate_value.data.type) {
        case Type_reference_enum.Builtin_type_reference: {
            return {
                data: {
                    type: intermediate_value.data.type,
                    value: intermediate_to_core_builtin_type_reference(intermediate_value.data.value as Builtin_type_reference)
                }
            };
        }
        case Type_reference_enum.Constant_array_type: {
            return {
                data: {
                    type: intermediate_value.data.type,
                    value: intermediate_to_core_constant_array_type(intermediate_value.data.value as Constant_array_type)
                }
            };
        }
        case Type_reference_enum.Custom_type_reference: {
            return {
                data: {
                    type: intermediate_value.data.type,
                    value: intermediate_to_core_custom_type_reference(intermediate_value.data.value as Custom_type_reference)
                }
            };
        }
        case Type_reference_enum.Fundamental_type: {
            return {
                data: {
                    type: intermediate_value.data.type,
                    value: intermediate_value.data.value as Fundamental_type
                }
            };
        }
        case Type_reference_enum.Function_pointer_type: {
            return {
                data: {
                    type: intermediate_value.data.type,
                    value: intermediate_to_core_function_pointer_type(intermediate_value.data.value as Function_pointer_type)
                }
            };
        }
        case Type_reference_enum.Integer_type: {
            return {
                data: {
                    type: intermediate_value.data.type,
                    value: intermediate_to_core_integer_type(intermediate_value.data.value as Integer_type)
                }
            };
        }
        case Type_reference_enum.Null_pointer_type: {
            return {
                data: {
                    type: intermediate_value.data.type,
                    value: intermediate_to_core_null_pointer_type(intermediate_value.data.value as Null_pointer_type)
                }
            };
        }
        case Type_reference_enum.Parameter_type: {
            return {
                data: {
                    type: intermediate_value.data.type,
                    value: intermediate_to_core_parameter_type(intermediate_value.data.value as Parameter_type)
                }
            };
        }
        case Type_reference_enum.Pointer_type: {
            return {
                data: {
                    type: intermediate_value.data.type,
                    value: intermediate_to_core_pointer_type(intermediate_value.data.value as Pointer_type)
                }
            };
        }
        case Type_reference_enum.Type_instance: {
            return {
                data: {
                    type: intermediate_value.data.type,
                    value: intermediate_to_core_type_instance(intermediate_value.data.value as Type_instance)
                }
            };
        }
    }
}

export interface Indexed_comment {
    index: number;
    comment: string;
}

function core_to_intermediate_indexed_comment(core_value: Core.Indexed_comment): Indexed_comment {
    return {
        index: core_value.index,
        comment: core_value.comment,
    };
}

function intermediate_to_core_indexed_comment(intermediate_value: Indexed_comment): Core.Indexed_comment {
    return {
        index: intermediate_value.index,
        comment: intermediate_value.comment,
    };
}

export interface Global_variable_declaration {
    name: string;
    unique_name?: string;
    type?: Type_reference;
    initial_value: Statement;
    is_mutable: boolean;
    comment?: string;
    source_location?: Source_location;
}

function core_to_intermediate_global_variable_declaration(core_value: Core.Global_variable_declaration): Global_variable_declaration {
    return {
        name: core_value.name,
        unique_name: core_value.unique_name,
        type: core_value.type !== undefined ? core_to_intermediate_type_reference(core_value.type) : undefined,
        initial_value: core_to_intermediate_statement(core_value.initial_value),
        is_mutable: core_value.is_mutable,
        comment: core_value.comment,
        source_location: core_value.source_location !== undefined ? core_to_intermediate_source_location(core_value.source_location) : undefined,
    };
}

function intermediate_to_core_global_variable_declaration(intermediate_value: Global_variable_declaration): Core.Global_variable_declaration {
    return {
        name: intermediate_value.name,
        unique_name: intermediate_value.unique_name,
        type: intermediate_value.type !== undefined ? intermediate_to_core_type_reference(intermediate_value.type) : undefined,
        initial_value: intermediate_to_core_statement(intermediate_value.initial_value),
        is_mutable: intermediate_value.is_mutable,
        comment: intermediate_value.comment,
        source_location: intermediate_value.source_location !== undefined ? intermediate_to_core_source_location(intermediate_value.source_location) : undefined,
    };
}

export interface Alias_type_declaration {
    name: string;
    unique_name?: string;
    type: Type_reference[];
    comment?: string;
    source_location?: Source_location;
}

function core_to_intermediate_alias_type_declaration(core_value: Core.Alias_type_declaration): Alias_type_declaration {
    return {
        name: core_value.name,
        unique_name: core_value.unique_name,
        type: core_value.type.elements.map(value => core_to_intermediate_type_reference(value)),
        comment: core_value.comment,
        source_location: core_value.source_location !== undefined ? core_to_intermediate_source_location(core_value.source_location) : undefined,
    };
}

function intermediate_to_core_alias_type_declaration(intermediate_value: Alias_type_declaration): Core.Alias_type_declaration {
    return {
        name: intermediate_value.name,
        unique_name: intermediate_value.unique_name,
        type: {
            size: intermediate_value.type.length,
            elements: intermediate_value.type.map(value => intermediate_to_core_type_reference(value)),
        },
        comment: intermediate_value.comment,
        source_location: intermediate_value.source_location !== undefined ? intermediate_to_core_source_location(intermediate_value.source_location) : undefined,
    };
}

export interface Enum_value {
    name: string;
    value?: Statement;
    comment?: string;
    source_location?: Source_location;
}

function core_to_intermediate_enum_value(core_value: Core.Enum_value): Enum_value {
    return {
        name: core_value.name,
        value: core_value.value !== undefined ? core_to_intermediate_statement(core_value.value) : undefined,
        comment: core_value.comment,
        source_location: core_value.source_location !== undefined ? core_to_intermediate_source_location(core_value.source_location) : undefined,
    };
}

function intermediate_to_core_enum_value(intermediate_value: Enum_value): Core.Enum_value {
    return {
        name: intermediate_value.name,
        value: intermediate_value.value !== undefined ? intermediate_to_core_statement(intermediate_value.value) : undefined,
        comment: intermediate_value.comment,
        source_location: intermediate_value.source_location !== undefined ? intermediate_to_core_source_location(intermediate_value.source_location) : undefined,
    };
}

export interface Enum_declaration {
    name: string;
    unique_name?: string;
    values: Enum_value[];
    comment?: string;
    source_location?: Source_location;
}

function core_to_intermediate_enum_declaration(core_value: Core.Enum_declaration): Enum_declaration {
    return {
        name: core_value.name,
        unique_name: core_value.unique_name,
        values: core_value.values.elements.map(value => core_to_intermediate_enum_value(value)),
        comment: core_value.comment,
        source_location: core_value.source_location !== undefined ? core_to_intermediate_source_location(core_value.source_location) : undefined,
    };
}

function intermediate_to_core_enum_declaration(intermediate_value: Enum_declaration): Core.Enum_declaration {
    return {
        name: intermediate_value.name,
        unique_name: intermediate_value.unique_name,
        values: {
            size: intermediate_value.values.length,
            elements: intermediate_value.values.map(value => intermediate_to_core_enum_value(value)),
        },
        comment: intermediate_value.comment,
        source_location: intermediate_value.source_location !== undefined ? intermediate_to_core_source_location(intermediate_value.source_location) : undefined,
    };
}

export interface Struct_declaration {
    name: string;
    unique_name?: string;
    member_types: Type_reference[];
    member_names: string[];
    member_default_values: Statement[];
    is_packed: boolean;
    is_literal: boolean;
    comment?: string;
    member_comments: Indexed_comment[];
    source_location?: Source_location;
    member_source_positions?: Source_position[];
}

function core_to_intermediate_struct_declaration(core_value: Core.Struct_declaration): Struct_declaration {
    return {
        name: core_value.name,
        unique_name: core_value.unique_name,
        member_types: core_value.member_types.elements.map(value => core_to_intermediate_type_reference(value)),
        member_names: core_value.member_names.elements,
        member_default_values: core_value.member_default_values.elements.map(value => core_to_intermediate_statement(value)),
        is_packed: core_value.is_packed,
        is_literal: core_value.is_literal,
        comment: core_value.comment,
        member_comments: core_value.member_comments.elements.map(value => core_to_intermediate_indexed_comment(value)),
        source_location: core_value.source_location !== undefined ? core_to_intermediate_source_location(core_value.source_location) : undefined,
        member_source_positions: core_value.member_source_positions !== undefined ? core_value.member_source_positions.elements.map(value => core_to_intermediate_source_position(value)) : undefined,
    };
}

function intermediate_to_core_struct_declaration(intermediate_value: Struct_declaration): Core.Struct_declaration {
    return {
        name: intermediate_value.name,
        unique_name: intermediate_value.unique_name,
        member_types: {
            size: intermediate_value.member_types.length,
            elements: intermediate_value.member_types.map(value => intermediate_to_core_type_reference(value)),
        },
        member_names: {
            size: intermediate_value.member_names.length,
            elements: intermediate_value.member_names,
        },
        member_default_values: {
            size: intermediate_value.member_default_values.length,
            elements: intermediate_value.member_default_values.map(value => intermediate_to_core_statement(value)),
        },
        is_packed: intermediate_value.is_packed,
        is_literal: intermediate_value.is_literal,
        comment: intermediate_value.comment,
        member_comments: {
            size: intermediate_value.member_comments.length,
            elements: intermediate_value.member_comments.map(value => intermediate_to_core_indexed_comment(value)),
        },
        source_location: intermediate_value.source_location !== undefined ? intermediate_to_core_source_location(intermediate_value.source_location) : undefined,
        member_source_positions: intermediate_value.member_source_positions !== undefined ? { size: intermediate_value.member_source_positions.length, elements : intermediate_value.member_source_positions } : undefined,
    };
}

export interface Union_declaration {
    name: string;
    unique_name?: string;
    member_types: Type_reference[];
    member_names: string[];
    comment?: string;
    member_comments: Indexed_comment[];
    source_location?: Source_location;
    member_source_positions?: Source_position[];
}

function core_to_intermediate_union_declaration(core_value: Core.Union_declaration): Union_declaration {
    return {
        name: core_value.name,
        unique_name: core_value.unique_name,
        member_types: core_value.member_types.elements.map(value => core_to_intermediate_type_reference(value)),
        member_names: core_value.member_names.elements,
        comment: core_value.comment,
        member_comments: core_value.member_comments.elements.map(value => core_to_intermediate_indexed_comment(value)),
        source_location: core_value.source_location !== undefined ? core_to_intermediate_source_location(core_value.source_location) : undefined,
        member_source_positions: core_value.member_source_positions !== undefined ? core_value.member_source_positions.elements.map(value => core_to_intermediate_source_position(value)) : undefined,
    };
}

function intermediate_to_core_union_declaration(intermediate_value: Union_declaration): Core.Union_declaration {
    return {
        name: intermediate_value.name,
        unique_name: intermediate_value.unique_name,
        member_types: {
            size: intermediate_value.member_types.length,
            elements: intermediate_value.member_types.map(value => intermediate_to_core_type_reference(value)),
        },
        member_names: {
            size: intermediate_value.member_names.length,
            elements: intermediate_value.member_names,
        },
        comment: intermediate_value.comment,
        member_comments: {
            size: intermediate_value.member_comments.length,
            elements: intermediate_value.member_comments.map(value => intermediate_to_core_indexed_comment(value)),
        },
        source_location: intermediate_value.source_location !== undefined ? intermediate_to_core_source_location(intermediate_value.source_location) : undefined,
        member_source_positions: intermediate_value.member_source_positions !== undefined ? { size: intermediate_value.member_source_positions.length, elements : intermediate_value.member_source_positions } : undefined,
    };
}

export interface Function_condition {
    description: string;
    condition: Statement;
}

function core_to_intermediate_function_condition(core_value: Core.Function_condition): Function_condition {
    return {
        description: core_value.description,
        condition: core_to_intermediate_statement(core_value.condition),
    };
}

function intermediate_to_core_function_condition(intermediate_value: Function_condition): Core.Function_condition {
    return {
        description: intermediate_value.description,
        condition: intermediate_to_core_statement(intermediate_value.condition),
    };
}

export interface Function_declaration {
    name: string;
    unique_name?: string;
    type: Function_type;
    input_parameter_names: string[];
    output_parameter_names: string[];
    linkage: Linkage;
    preconditions: Function_condition[];
    postconditions: Function_condition[];
    comment?: string;
    source_location?: Source_location;
    input_parameter_source_positions?: Source_position[];
    output_parameter_source_positions?: Source_position[];
}

function core_to_intermediate_function_declaration(core_value: Core.Function_declaration): Function_declaration {
    return {
        name: core_value.name,
        unique_name: core_value.unique_name,
        type: core_to_intermediate_function_type(core_value.type),
        input_parameter_names: core_value.input_parameter_names.elements,
        output_parameter_names: core_value.output_parameter_names.elements,
        linkage: core_value.linkage,
        preconditions: core_value.preconditions.elements.map(value => core_to_intermediate_function_condition(value)),
        postconditions: core_value.postconditions.elements.map(value => core_to_intermediate_function_condition(value)),
        comment: core_value.comment,
        source_location: core_value.source_location !== undefined ? core_to_intermediate_source_location(core_value.source_location) : undefined,
        input_parameter_source_positions: core_value.input_parameter_source_positions !== undefined ? core_value.input_parameter_source_positions.elements.map(value => core_to_intermediate_source_position(value)) : undefined,
        output_parameter_source_positions: core_value.output_parameter_source_positions !== undefined ? core_value.output_parameter_source_positions.elements.map(value => core_to_intermediate_source_position(value)) : undefined,
    };
}

function intermediate_to_core_function_declaration(intermediate_value: Function_declaration): Core.Function_declaration {
    return {
        name: intermediate_value.name,
        unique_name: intermediate_value.unique_name,
        type: intermediate_to_core_function_type(intermediate_value.type),
        input_parameter_names: {
            size: intermediate_value.input_parameter_names.length,
            elements: intermediate_value.input_parameter_names,
        },
        output_parameter_names: {
            size: intermediate_value.output_parameter_names.length,
            elements: intermediate_value.output_parameter_names,
        },
        linkage: intermediate_value.linkage,
        preconditions: {
            size: intermediate_value.preconditions.length,
            elements: intermediate_value.preconditions.map(value => intermediate_to_core_function_condition(value)),
        },
        postconditions: {
            size: intermediate_value.postconditions.length,
            elements: intermediate_value.postconditions.map(value => intermediate_to_core_function_condition(value)),
        },
        comment: intermediate_value.comment,
        source_location: intermediate_value.source_location !== undefined ? intermediate_to_core_source_location(intermediate_value.source_location) : undefined,
        input_parameter_source_positions: intermediate_value.input_parameter_source_positions !== undefined ? { size: intermediate_value.input_parameter_source_positions.length, elements : intermediate_value.input_parameter_source_positions } : undefined,
        output_parameter_source_positions: intermediate_value.output_parameter_source_positions !== undefined ? { size: intermediate_value.output_parameter_source_positions.length, elements : intermediate_value.output_parameter_source_positions } : undefined,
    };
}

export interface Function_definition {
    name: string;
    statements: Statement[];
    source_location?: Source_location;
}

function core_to_intermediate_function_definition(core_value: Core.Function_definition): Function_definition {
    return {
        name: core_value.name,
        statements: core_value.statements.elements.map(value => core_to_intermediate_statement(value)),
        source_location: core_value.source_location !== undefined ? core_to_intermediate_source_location(core_value.source_location) : undefined,
    };
}

function intermediate_to_core_function_definition(intermediate_value: Function_definition): Core.Function_definition {
    return {
        name: intermediate_value.name,
        statements: {
            size: intermediate_value.statements.length,
            elements: intermediate_value.statements.map(value => intermediate_to_core_statement(value)),
        },
        source_location: intermediate_value.source_location !== undefined ? intermediate_to_core_source_location(intermediate_value.source_location) : undefined,
    };
}

export interface Variable_expression {
    name: string;
    access_type: Access_type;
}

function core_to_intermediate_variable_expression(core_value: Core.Variable_expression, statement: Core.Statement): Variable_expression {
    return {
        name: core_value.name,
        access_type: core_value.access_type,
    };
}

function intermediate_to_core_variable_expression(intermediate_value: Variable_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Variable_expression,
            value: {
                name: intermediate_value.name,
                access_type: intermediate_value.access_type,
            }
        }
    };

    expressions[index] = core_value;
}

export function create_variable_expression(name: string, access_type: Access_type): Expression {
    const variable_expression: Variable_expression = {
        name: name,
        access_type: access_type,
    };
    return {
        data: {
            type: Expression_enum.Variable_expression,
            value: variable_expression
        }
    };
}
export interface Access_expression {
    expression: Expression;
    member_name: string;
    access_type: Access_type;
}

function core_to_intermediate_access_expression(core_value: Core.Access_expression, statement: Core.Statement): Access_expression {
    return {
        expression: core_to_intermediate_expression(statement.expressions.elements[core_value.expression.expression_index], statement),
        member_name: core_value.member_name,
        access_type: core_value.access_type,
    };
}

function intermediate_to_core_access_expression(intermediate_value: Access_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Access_expression,
            value: {
                expression: {
                    expression_index: -1
                },
                member_name: intermediate_value.member_name,
                access_type: intermediate_value.access_type,
            }
        }
    };

    expressions[index] = core_value;

    (core_value.data.value as Core.Access_expression).expression.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.expression, expressions);
}

export function create_access_expression(expression: Expression, member_name: string, access_type: Access_type): Expression {
    const access_expression: Access_expression = {
        expression: expression,
        member_name: member_name,
        access_type: access_type,
    };
    return {
        data: {
            type: Expression_enum.Access_expression,
            value: access_expression
        }
    };
}
export interface Access_array_expression {
    expression: Expression;
    index: Expression;
}

function core_to_intermediate_access_array_expression(core_value: Core.Access_array_expression, statement: Core.Statement): Access_array_expression {
    return {
        expression: core_to_intermediate_expression(statement.expressions.elements[core_value.expression.expression_index], statement),
        index: core_to_intermediate_expression(statement.expressions.elements[core_value.index.expression_index], statement),
    };
}

function intermediate_to_core_access_array_expression(intermediate_value: Access_array_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Access_array_expression,
            value: {
                expression: {
                    expression_index: -1
                },
                index: {
                    expression_index: -1
                },
            }
        }
    };

    expressions[index] = core_value;

    (core_value.data.value as Core.Access_array_expression).expression.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.expression, expressions);

    (core_value.data.value as Core.Access_array_expression).index.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.index, expressions);
}

export function create_access_array_expression(expression: Expression, index: Expression): Expression {
    const access_array_expression: Access_array_expression = {
        expression: expression,
        index: index,
    };
    return {
        data: {
            type: Expression_enum.Access_array_expression,
            value: access_array_expression
        }
    };
}
export interface Assert_expression {
    message?: string;
    statement: Statement;
}

function core_to_intermediate_assert_expression(core_value: Core.Assert_expression, statement: Core.Statement): Assert_expression {
    return {
        message: core_value.message,
        statement: core_to_intermediate_statement(core_value.statement),
    };
}

function intermediate_to_core_assert_expression(intermediate_value: Assert_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Assert_expression,
            value: {
                message: intermediate_value.message,
                statement: intermediate_to_core_statement(intermediate_value.statement),
            }
        }
    };

    expressions[index] = core_value;
}

export function create_assert_expression(message: string | undefined, statement: Statement): Expression {
    const assert_expression: Assert_expression = {
        message: message,
        statement: statement,
    };
    return {
        data: {
            type: Expression_enum.Assert_expression,
            value: assert_expression
        }
    };
}
export interface Assignment_expression {
    left_hand_side: Expression;
    right_hand_side: Expression;
    additional_operation?: Binary_operation;
}

function core_to_intermediate_assignment_expression(core_value: Core.Assignment_expression, statement: Core.Statement): Assignment_expression {
    return {
        left_hand_side: core_to_intermediate_expression(statement.expressions.elements[core_value.left_hand_side.expression_index], statement),
        right_hand_side: core_to_intermediate_expression(statement.expressions.elements[core_value.right_hand_side.expression_index], statement),
        additional_operation: core_value.additional_operation,
    };
}

function intermediate_to_core_assignment_expression(intermediate_value: Assignment_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Assignment_expression,
            value: {
                left_hand_side: {
                    expression_index: -1
                },
                right_hand_side: {
                    expression_index: -1
                },
                additional_operation: intermediate_value.additional_operation,
            }
        }
    };

    expressions[index] = core_value;

    (core_value.data.value as Core.Assignment_expression).left_hand_side.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.left_hand_side, expressions);

    (core_value.data.value as Core.Assignment_expression).right_hand_side.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.right_hand_side, expressions);
}

export function create_assignment_expression(left_hand_side: Expression, right_hand_side: Expression, additional_operation: Binary_operation | undefined): Expression {
    const assignment_expression: Assignment_expression = {
        left_hand_side: left_hand_side,
        right_hand_side: right_hand_side,
        additional_operation: additional_operation,
    };
    return {
        data: {
            type: Expression_enum.Assignment_expression,
            value: assignment_expression
        }
    };
}
export interface Binary_expression {
    left_hand_side: Expression;
    right_hand_side: Expression;
    operation: Binary_operation;
}

function core_to_intermediate_binary_expression(core_value: Core.Binary_expression, statement: Core.Statement): Binary_expression {
    return {
        left_hand_side: core_to_intermediate_expression(statement.expressions.elements[core_value.left_hand_side.expression_index], statement),
        right_hand_side: core_to_intermediate_expression(statement.expressions.elements[core_value.right_hand_side.expression_index], statement),
        operation: core_value.operation,
    };
}

function intermediate_to_core_binary_expression(intermediate_value: Binary_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Binary_expression,
            value: {
                left_hand_side: {
                    expression_index: -1
                },
                right_hand_side: {
                    expression_index: -1
                },
                operation: intermediate_value.operation,
            }
        }
    };

    expressions[index] = core_value;

    (core_value.data.value as Core.Binary_expression).left_hand_side.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.left_hand_side, expressions);

    (core_value.data.value as Core.Binary_expression).right_hand_side.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.right_hand_side, expressions);
}

export function create_binary_expression(left_hand_side: Expression, right_hand_side: Expression, operation: Binary_operation): Expression {
    const binary_expression: Binary_expression = {
        left_hand_side: left_hand_side,
        right_hand_side: right_hand_side,
        operation: operation,
    };
    return {
        data: {
            type: Expression_enum.Binary_expression,
            value: binary_expression
        }
    };
}
export interface Block_expression {
    statements: Statement[];
}

function core_to_intermediate_block_expression(core_value: Core.Block_expression, statement: Core.Statement): Block_expression {
    return {
        statements: core_value.statements.elements.map(value => core_to_intermediate_statement(value)),
    };
}

function intermediate_to_core_block_expression(intermediate_value: Block_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Block_expression,
            value: {
                statements: {
                    size: intermediate_value.statements.length,
                    elements: intermediate_value.statements.map(value => intermediate_to_core_statement(value))
                },
            }
        }
    };

    expressions[index] = core_value;
}

export function create_block_expression(statements: Statement[]): Expression {
    const block_expression: Block_expression = {
        statements: statements,
    };
    return {
        data: {
            type: Expression_enum.Block_expression,
            value: block_expression
        }
    };
}
export interface Break_expression {
    loop_count: number;
}

function core_to_intermediate_break_expression(core_value: Core.Break_expression, statement: Core.Statement): Break_expression {
    return {
        loop_count: core_value.loop_count,
    };
}

function intermediate_to_core_break_expression(intermediate_value: Break_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Break_expression,
            value: {
                loop_count: intermediate_value.loop_count,
            }
        }
    };

    expressions[index] = core_value;
}

export function create_break_expression(loop_count: number): Expression {
    const break_expression: Break_expression = {
        loop_count: loop_count,
    };
    return {
        data: {
            type: Expression_enum.Break_expression,
            value: break_expression
        }
    };
}
export interface Call_expression {
    expression: Expression;
    arguments: Expression[];
}

function core_to_intermediate_call_expression(core_value: Core.Call_expression, statement: Core.Statement): Call_expression {
    return {
        expression: core_to_intermediate_expression(statement.expressions.elements[core_value.expression.expression_index], statement),
        arguments: core_value.arguments.elements.map(value => core_to_intermediate_expression(statement.expressions.elements[value.expression_index], statement)),
    };
}

function intermediate_to_core_call_expression(intermediate_value: Call_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Call_expression,
            value: {
                expression: {
                    expression_index: -1
                },
                arguments: {
                    size: 0,
                    elements: []
                }
            }
        }
    };

    expressions[index] = core_value;

    (core_value.data.value as Core.Call_expression).expression.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.expression, expressions);

    for (const element of intermediate_value.arguments) {
        (core_value.data.value as Core.Call_expression).arguments.elements.push({ expression_index: expressions.length });
        intermediate_to_core_expression(element, expressions);
    }
    (core_value.data.value as Core.Call_expression).arguments.size = (core_value.data.value as Core.Call_expression).arguments.elements.length;
}

export function create_call_expression(expression: Expression, args: Expression[]): Expression {
    const call_expression: Call_expression = {
        expression: expression,
        arguments: args,
    };
    return {
        data: {
            type: Expression_enum.Call_expression,
            value: call_expression
        }
    };
}
export interface Cast_expression {
    source: Expression;
    destination_type: Type_reference;
    cast_type: Cast_type;
}

function core_to_intermediate_cast_expression(core_value: Core.Cast_expression, statement: Core.Statement): Cast_expression {
    return {
        source: core_to_intermediate_expression(statement.expressions.elements[core_value.source.expression_index], statement),
        destination_type: core_to_intermediate_type_reference(core_value.destination_type),
        cast_type: core_value.cast_type,
    };
}

function intermediate_to_core_cast_expression(intermediate_value: Cast_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Cast_expression,
            value: {
                source: {
                    expression_index: -1
                },
                destination_type: intermediate_to_core_type_reference(intermediate_value.destination_type),
                cast_type: intermediate_value.cast_type,
            }
        }
    };

    expressions[index] = core_value;

    (core_value.data.value as Core.Cast_expression).source.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.source, expressions);
}

export function create_cast_expression(source: Expression, destination_type: Type_reference, cast_type: Cast_type): Expression {
    const cast_expression: Cast_expression = {
        source: source,
        destination_type: destination_type,
        cast_type: cast_type,
    };
    return {
        data: {
            type: Expression_enum.Cast_expression,
            value: cast_expression
        }
    };
}
export interface Comment_expression {
    comment: string;
}

function core_to_intermediate_comment_expression(core_value: Core.Comment_expression, statement: Core.Statement): Comment_expression {
    return {
        comment: core_value.comment,
    };
}

function intermediate_to_core_comment_expression(intermediate_value: Comment_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Comment_expression,
            value: {
                comment: intermediate_value.comment,
            }
        }
    };

    expressions[index] = core_value;
}

export function create_comment_expression(comment: string): Expression {
    const comment_expression: Comment_expression = {
        comment: comment,
    };
    return {
        data: {
            type: Expression_enum.Comment_expression,
            value: comment_expression
        }
    };
}
export interface Compile_time_expression {
    expression: Expression;
}

function core_to_intermediate_compile_time_expression(core_value: Core.Compile_time_expression, statement: Core.Statement): Compile_time_expression {
    return {
        expression: core_to_intermediate_expression(statement.expressions.elements[core_value.expression.expression_index], statement),
    };
}

function intermediate_to_core_compile_time_expression(intermediate_value: Compile_time_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Compile_time_expression,
            value: {
                expression: {
                    expression_index: -1
                },
            }
        }
    };

    expressions[index] = core_value;

    (core_value.data.value as Core.Compile_time_expression).expression.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.expression, expressions);
}

export function create_compile_time_expression(expression: Expression): Expression {
    const compile_time_expression: Compile_time_expression = {
        expression: expression,
    };
    return {
        data: {
            type: Expression_enum.Compile_time_expression,
            value: compile_time_expression
        }
    };
}
export interface Constant_expression {
    type: Type_reference;
    data: string;
}

function core_to_intermediate_constant_expression(core_value: Core.Constant_expression, statement: Core.Statement): Constant_expression {
    return {
        type: core_to_intermediate_type_reference(core_value.type),
        data: core_value.data,
    };
}

function intermediate_to_core_constant_expression(intermediate_value: Constant_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Constant_expression,
            value: {
                type: intermediate_to_core_type_reference(intermediate_value.type),
                data: intermediate_value.data,
            }
        }
    };

    expressions[index] = core_value;
}

export function create_constant_expression(type: Type_reference, data: string): Expression {
    const constant_expression: Constant_expression = {
        type: type,
        data: data,
    };
    return {
        data: {
            type: Expression_enum.Constant_expression,
            value: constant_expression
        }
    };
}
export interface Constant_array_expression {
    array_data: Statement[];
}

function core_to_intermediate_constant_array_expression(core_value: Core.Constant_array_expression, statement: Core.Statement): Constant_array_expression {
    return {
        array_data: core_value.array_data.elements.map(value => core_to_intermediate_statement(value)),
    };
}

function intermediate_to_core_constant_array_expression(intermediate_value: Constant_array_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Constant_array_expression,
            value: {
                array_data: {
                    size: intermediate_value.array_data.length,
                    elements: intermediate_value.array_data.map(value => intermediate_to_core_statement(value))
                },
            }
        }
    };

    expressions[index] = core_value;
}

export function create_constant_array_expression(array_data: Statement[]): Expression {
    const constant_array_expression: Constant_array_expression = {
        array_data: array_data,
    };
    return {
        data: {
            type: Expression_enum.Constant_array_expression,
            value: constant_array_expression
        }
    };
}
export interface Continue_expression {
}

function core_to_intermediate_continue_expression(core_value: Core.Continue_expression, statement: Core.Statement): Continue_expression {
    return {
    };
}

function intermediate_to_core_continue_expression(intermediate_value: Continue_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Continue_expression,
            value: {
            }
        }
    };

    expressions[index] = core_value;
}

export function create_continue_expression(): Expression {
    const continue_expression: Continue_expression = {
    };
    return {
        data: {
            type: Expression_enum.Continue_expression,
            value: continue_expression
        }
    };
}
export interface Defer_expression {
    expression_to_defer: Expression;
}

function core_to_intermediate_defer_expression(core_value: Core.Defer_expression, statement: Core.Statement): Defer_expression {
    return {
        expression_to_defer: core_to_intermediate_expression(statement.expressions.elements[core_value.expression_to_defer.expression_index], statement),
    };
}

function intermediate_to_core_defer_expression(intermediate_value: Defer_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Defer_expression,
            value: {
                expression_to_defer: {
                    expression_index: -1
                },
            }
        }
    };

    expressions[index] = core_value;

    (core_value.data.value as Core.Defer_expression).expression_to_defer.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.expression_to_defer, expressions);
}

export function create_defer_expression(expression_to_defer: Expression): Expression {
    const defer_expression: Defer_expression = {
        expression_to_defer: expression_to_defer,
    };
    return {
        data: {
            type: Expression_enum.Defer_expression,
            value: defer_expression
        }
    };
}
export interface Dereference_and_access_expression {
    expression: Expression;
    member_name: string;
}

function core_to_intermediate_dereference_and_access_expression(core_value: Core.Dereference_and_access_expression, statement: Core.Statement): Dereference_and_access_expression {
    return {
        expression: core_to_intermediate_expression(statement.expressions.elements[core_value.expression.expression_index], statement),
        member_name: core_value.member_name,
    };
}

function intermediate_to_core_dereference_and_access_expression(intermediate_value: Dereference_and_access_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Dereference_and_access_expression,
            value: {
                expression: {
                    expression_index: -1
                },
                member_name: intermediate_value.member_name,
            }
        }
    };

    expressions[index] = core_value;

    (core_value.data.value as Core.Dereference_and_access_expression).expression.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.expression, expressions);
}

export function create_dereference_and_access_expression(expression: Expression, member_name: string): Expression {
    const dereference_and_access_expression: Dereference_and_access_expression = {
        expression: expression,
        member_name: member_name,
    };
    return {
        data: {
            type: Expression_enum.Dereference_and_access_expression,
            value: dereference_and_access_expression
        }
    };
}
export interface For_loop_expression {
    variable_name: string;
    range_begin: Expression;
    range_end: Statement;
    range_comparison_operation: Binary_operation;
    step_by?: Expression;
    then_statements: Statement[];
}

function core_to_intermediate_for_loop_expression(core_value: Core.For_loop_expression, statement: Core.Statement): For_loop_expression {
    return {
        variable_name: core_value.variable_name,
        range_begin: core_to_intermediate_expression(statement.expressions.elements[core_value.range_begin.expression_index], statement),
        range_end: core_to_intermediate_statement(core_value.range_end),
        range_comparison_operation: core_value.range_comparison_operation,
        step_by: core_value.step_by !== undefined ? core_to_intermediate_expression(statement.expressions.elements[core_value.step_by.expression_index], statement) : undefined,
        then_statements: core_value.then_statements.elements.map(value => core_to_intermediate_statement(value)),
    };
}

function intermediate_to_core_for_loop_expression(intermediate_value: For_loop_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.For_loop_expression,
            value: {
                variable_name: intermediate_value.variable_name,
                range_begin: {
                    expression_index: -1
                },
                range_end: intermediate_to_core_statement(intermediate_value.range_end),
                range_comparison_operation: intermediate_value.range_comparison_operation,
                step_by: intermediate_value.step_by !== undefined ? { expression_index: -1 } : undefined,
                then_statements: {
                    size: intermediate_value.then_statements.length,
                    elements: intermediate_value.then_statements.map(value => intermediate_to_core_statement(value))
                },
            }
        }
    };

    expressions[index] = core_value;

    (core_value.data.value as Core.For_loop_expression).range_begin.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.range_begin, expressions);

    if (intermediate_value.step_by !== undefined) {
        (core_value.data.value as Core.For_loop_expression).step_by = { expression_index: expressions.length };
        intermediate_to_core_expression(intermediate_value.step_by, expressions);
    }
}

export function create_for_loop_expression(variable_name: string, range_begin: Expression, range_end: Statement, range_comparison_operation: Binary_operation, step_by: Expression | undefined, then_statements: Statement[]): Expression {
    const for_loop_expression: For_loop_expression = {
        variable_name: variable_name,
        range_begin: range_begin,
        range_end: range_end,
        range_comparison_operation: range_comparison_operation,
        step_by: step_by,
        then_statements: then_statements,
    };
    return {
        data: {
            type: Expression_enum.For_loop_expression,
            value: for_loop_expression
        }
    };
}
export interface Function_expression {
    declaration: Function_declaration;
    definition: Function_definition;
}

function core_to_intermediate_function_expression(core_value: Core.Function_expression, statement: Core.Statement): Function_expression {
    return {
        declaration: core_to_intermediate_function_declaration(core_value.declaration),
        definition: core_to_intermediate_function_definition(core_value.definition),
    };
}

function intermediate_to_core_function_expression(intermediate_value: Function_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Function_expression,
            value: {
                declaration: intermediate_to_core_function_declaration(intermediate_value.declaration),
                definition: intermediate_to_core_function_definition(intermediate_value.definition),
            }
        }
    };

    expressions[index] = core_value;
}

export function create_function_expression(declaration: Function_declaration, definition: Function_definition): Expression {
    const function_expression: Function_expression = {
        declaration: declaration,
        definition: definition,
    };
    return {
        data: {
            type: Expression_enum.Function_expression,
            value: function_expression
        }
    };
}
export interface Instance_call_expression {
    left_hand_side: Expression;
    arguments: Statement[];
}

function core_to_intermediate_instance_call_expression(core_value: Core.Instance_call_expression, statement: Core.Statement): Instance_call_expression {
    return {
        left_hand_side: core_to_intermediate_expression(statement.expressions.elements[core_value.left_hand_side.expression_index], statement),
        arguments: core_value.arguments.elements.map(value => core_to_intermediate_statement(value)),
    };
}

function intermediate_to_core_instance_call_expression(intermediate_value: Instance_call_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Instance_call_expression,
            value: {
                left_hand_side: {
                    expression_index: -1
                },
                arguments: {
                    size: intermediate_value.arguments.length,
                    elements: intermediate_value.arguments.map(value => intermediate_to_core_statement(value))
                },
            }
        }
    };

    expressions[index] = core_value;

    (core_value.data.value as Core.Instance_call_expression).left_hand_side.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.left_hand_side, expressions);
}

export function create_instance_call_expression(left_hand_side: Expression, args: Statement[]): Expression {
    const instance_call_expression: Instance_call_expression = {
        left_hand_side: left_hand_side,
        arguments: args,
    };
    return {
        data: {
            type: Expression_enum.Instance_call_expression,
            value: instance_call_expression
        }
    };
}
export interface Instance_call_key {
    module_name: string;
    function_constructor_name: string;
    arguments: Statement[];
}

function core_to_intermediate_instance_call_key(core_value: Core.Instance_call_key): Instance_call_key {
    return {
        module_name: core_value.module_name,
        function_constructor_name: core_value.function_constructor_name,
        arguments: core_value.arguments.elements.map(value => core_to_intermediate_statement(value)),
    };
}

function intermediate_to_core_instance_call_key(intermediate_value: Instance_call_key): Core.Instance_call_key {
    return {
        module_name: intermediate_value.module_name,
        function_constructor_name: intermediate_value.function_constructor_name,
        arguments: {
            size: intermediate_value.arguments.length,
            elements: intermediate_value.arguments.map(value => intermediate_to_core_statement(value)),
        },
    };
}

export interface Condition_statement_pair {
    condition?: Statement;
    then_statements: Statement[];
    block_source_position?: Source_position;
}

function core_to_intermediate_condition_statement_pair(core_value: Core.Condition_statement_pair): Condition_statement_pair {
    return {
        condition: core_value.condition !== undefined ? core_to_intermediate_statement(core_value.condition) : undefined,
        then_statements: core_value.then_statements.elements.map(value => core_to_intermediate_statement(value)),
        block_source_position: core_value.block_source_position !== undefined ? core_to_intermediate_source_position(core_value.block_source_position) : undefined,
    };
}

function intermediate_to_core_condition_statement_pair(intermediate_value: Condition_statement_pair): Core.Condition_statement_pair {
    return {
        condition: intermediate_value.condition !== undefined ? intermediate_to_core_statement(intermediate_value.condition) : undefined,
        then_statements: {
            size: intermediate_value.then_statements.length,
            elements: intermediate_value.then_statements.map(value => intermediate_to_core_statement(value)),
        },
        block_source_position: intermediate_value.block_source_position !== undefined ? intermediate_to_core_source_position(intermediate_value.block_source_position) : undefined,
    };
}

export interface If_expression {
    series: Condition_statement_pair[];
}

function core_to_intermediate_if_expression(core_value: Core.If_expression, statement: Core.Statement): If_expression {
    return {
        series: core_value.series.elements.map(value => core_to_intermediate_condition_statement_pair(value)),
    };
}

function intermediate_to_core_if_expression(intermediate_value: If_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.If_expression,
            value: {
                series: {
                    size: intermediate_value.series.length,
                    elements: intermediate_value.series.map(value => intermediate_to_core_condition_statement_pair(value))
                },
            }
        }
    };

    expressions[index] = core_value;
}

export function create_if_expression(series: Condition_statement_pair[]): Expression {
    const if_expression: If_expression = {
        series: series,
    };
    return {
        data: {
            type: Expression_enum.If_expression,
            value: if_expression
        }
    };
}
export interface Instantiate_member_value_pair {
    member_name: string;
    value: Statement;
}

function core_to_intermediate_instantiate_member_value_pair(core_value: Core.Instantiate_member_value_pair): Instantiate_member_value_pair {
    return {
        member_name: core_value.member_name,
        value: core_to_intermediate_statement(core_value.value),
    };
}

function intermediate_to_core_instantiate_member_value_pair(intermediate_value: Instantiate_member_value_pair): Core.Instantiate_member_value_pair {
    return {
        member_name: intermediate_value.member_name,
        value: intermediate_to_core_statement(intermediate_value.value),
    };
}

export interface Instantiate_expression {
    type: Instantiate_expression_type;
    members: Instantiate_member_value_pair[];
}

function core_to_intermediate_instantiate_expression(core_value: Core.Instantiate_expression, statement: Core.Statement): Instantiate_expression {
    return {
        type: core_value.type,
        members: core_value.members.elements.map(value => core_to_intermediate_instantiate_member_value_pair(value)),
    };
}

function intermediate_to_core_instantiate_expression(intermediate_value: Instantiate_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Instantiate_expression,
            value: {
                type: intermediate_value.type,
                members: {
                    size: intermediate_value.members.length,
                    elements: intermediate_value.members.map(value => intermediate_to_core_instantiate_member_value_pair(value))
                },
            }
        }
    };

    expressions[index] = core_value;
}

export function create_instantiate_expression(type: Instantiate_expression_type, members: Instantiate_member_value_pair[]): Expression {
    const instantiate_expression: Instantiate_expression = {
        type: type,
        members: members,
    };
    return {
        data: {
            type: Expression_enum.Instantiate_expression,
            value: instantiate_expression
        }
    };
}
export interface Invalid_expression {
    value: string;
}

function core_to_intermediate_invalid_expression(core_value: Core.Invalid_expression, statement: Core.Statement): Invalid_expression {
    return {
        value: core_value.value,
    };
}

function intermediate_to_core_invalid_expression(intermediate_value: Invalid_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Invalid_expression,
            value: {
                value: intermediate_value.value,
            }
        }
    };

    expressions[index] = core_value;
}

export function create_invalid_expression(value: string): Expression {
    const invalid_expression: Invalid_expression = {
        value: value,
    };
    return {
        data: {
            type: Expression_enum.Invalid_expression,
            value: invalid_expression
        }
    };
}
export interface Null_pointer_expression {
}

function core_to_intermediate_null_pointer_expression(core_value: Core.Null_pointer_expression, statement: Core.Statement): Null_pointer_expression {
    return {
    };
}

function intermediate_to_core_null_pointer_expression(intermediate_value: Null_pointer_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Null_pointer_expression,
            value: {
            }
        }
    };

    expressions[index] = core_value;
}

export function create_null_pointer_expression(): Expression {
    const null_pointer_expression: Null_pointer_expression = {
    };
    return {
        data: {
            type: Expression_enum.Null_pointer_expression,
            value: null_pointer_expression
        }
    };
}
export interface Parenthesis_expression {
    expression: Expression;
}

function core_to_intermediate_parenthesis_expression(core_value: Core.Parenthesis_expression, statement: Core.Statement): Parenthesis_expression {
    return {
        expression: core_to_intermediate_expression(statement.expressions.elements[core_value.expression.expression_index], statement),
    };
}

function intermediate_to_core_parenthesis_expression(intermediate_value: Parenthesis_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Parenthesis_expression,
            value: {
                expression: {
                    expression_index: -1
                },
            }
        }
    };

    expressions[index] = core_value;

    (core_value.data.value as Core.Parenthesis_expression).expression.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.expression, expressions);
}

export function create_parenthesis_expression(expression: Expression): Expression {
    const parenthesis_expression: Parenthesis_expression = {
        expression: expression,
    };
    return {
        data: {
            type: Expression_enum.Parenthesis_expression,
            value: parenthesis_expression
        }
    };
}
export interface Reflection_expression {
    name: string;
    arguments: Expression[];
}

function core_to_intermediate_reflection_expression(core_value: Core.Reflection_expression, statement: Core.Statement): Reflection_expression {
    return {
        name: core_value.name,
        arguments: core_value.arguments.elements.map(value => core_to_intermediate_expression(statement.expressions.elements[value.expression_index], statement)),
    };
}

function intermediate_to_core_reflection_expression(intermediate_value: Reflection_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Reflection_expression,
            value: {
                name: intermediate_value.name,
                arguments: {
                    size: 0,
                    elements: []
                }
            }
        }
    };

    expressions[index] = core_value;

    for (const element of intermediate_value.arguments) {
        (core_value.data.value as Core.Reflection_expression).arguments.elements.push({ expression_index: expressions.length });
        intermediate_to_core_expression(element, expressions);
    }
    (core_value.data.value as Core.Reflection_expression).arguments.size = (core_value.data.value as Core.Reflection_expression).arguments.elements.length;
}

export function create_reflection_expression(name: string, args: Expression[]): Expression {
    const reflection_expression: Reflection_expression = {
        name: name,
        arguments: args,
    };
    return {
        data: {
            type: Expression_enum.Reflection_expression,
            value: reflection_expression
        }
    };
}
export interface Return_expression {
    expression?: Expression;
}

function core_to_intermediate_return_expression(core_value: Core.Return_expression, statement: Core.Statement): Return_expression {
    return {
        expression: core_value.expression !== undefined ? core_to_intermediate_expression(statement.expressions.elements[core_value.expression.expression_index], statement) : undefined,
    };
}

function intermediate_to_core_return_expression(intermediate_value: Return_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Return_expression,
            value: {
                expression: intermediate_value.expression !== undefined ? { expression_index: -1 } : undefined,
            }
        }
    };

    expressions[index] = core_value;

    if (intermediate_value.expression !== undefined) {
        (core_value.data.value as Core.Return_expression).expression = { expression_index: expressions.length };
        intermediate_to_core_expression(intermediate_value.expression, expressions);
    }
}

export function create_return_expression(expression: Expression | undefined): Expression {
    const return_expression: Return_expression = {
        expression: expression,
    };
    return {
        data: {
            type: Expression_enum.Return_expression,
            value: return_expression
        }
    };
}
export interface Struct_expression {
    declaration: Struct_declaration;
}

function core_to_intermediate_struct_expression(core_value: Core.Struct_expression, statement: Core.Statement): Struct_expression {
    return {
        declaration: core_to_intermediate_struct_declaration(core_value.declaration),
    };
}

function intermediate_to_core_struct_expression(intermediate_value: Struct_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Struct_expression,
            value: {
                declaration: intermediate_to_core_struct_declaration(intermediate_value.declaration),
            }
        }
    };

    expressions[index] = core_value;
}

export function create_struct_expression(declaration: Struct_declaration): Expression {
    const struct_expression: Struct_expression = {
        declaration: declaration,
    };
    return {
        data: {
            type: Expression_enum.Struct_expression,
            value: struct_expression
        }
    };
}
export interface Switch_case_expression_pair {
    case_value?: Expression;
    statements: Statement[];
}

function core_to_intermediate_switch_case_expression_pair(core_value: Core.Switch_case_expression_pair, statement: Core.Statement): Switch_case_expression_pair {
    return {
        case_value: core_value.case_value !== undefined ? core_to_intermediate_expression(statement.expressions.elements[core_value.case_value.expression_index], statement) : undefined,
        statements: core_value.statements.elements.map(value => core_to_intermediate_statement(value)),
    };
}

function intermediate_to_core_switch_case_expression_pair(intermediate_value: Switch_case_expression_pair, expressions: Core.Expression[]): Core.Switch_case_expression_pair {
    const core_value: Core.Switch_case_expression_pair = {
        case_value: intermediate_value.case_value !== undefined ? { expression_index: -1 } : undefined,
        statements: {
            size: intermediate_value.statements.length,
            elements: intermediate_value.statements.map(value => intermediate_to_core_statement(value))
        },
    };

    if (intermediate_value.case_value !== undefined) {
        core_value.case_value = { expression_index: expressions.length };
        intermediate_to_core_expression(intermediate_value.case_value, expressions);
    }

    return core_value;
}

export interface Switch_expression {
    value: Expression;
    cases: Switch_case_expression_pair[];
}

function core_to_intermediate_switch_expression(core_value: Core.Switch_expression, statement: Core.Statement): Switch_expression {
    return {
        value: core_to_intermediate_expression(statement.expressions.elements[core_value.value.expression_index], statement),
        cases: core_value.cases.elements.map(value => core_to_intermediate_switch_case_expression_pair(value, statement)),
    };
}

function intermediate_to_core_switch_expression(intermediate_value: Switch_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Switch_expression,
            value: {
                value: {
                    expression_index: -1
                },
                cases: {
                    size: intermediate_value.cases.length,
                    elements: intermediate_value.cases.map(value => intermediate_to_core_switch_case_expression_pair(value, expressions))
                },
            }
        }
    };

    expressions[index] = core_value;

    (core_value.data.value as Core.Switch_expression).value.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.value, expressions);
}

export function create_switch_expression(value: Expression, cases: Switch_case_expression_pair[]): Expression {
    const switch_expression: Switch_expression = {
        value: value,
        cases: cases,
    };
    return {
        data: {
            type: Expression_enum.Switch_expression,
            value: switch_expression
        }
    };
}
export interface Ternary_condition_expression {
    condition: Expression;
    then_statement: Statement;
    else_statement: Statement;
}

function core_to_intermediate_ternary_condition_expression(core_value: Core.Ternary_condition_expression, statement: Core.Statement): Ternary_condition_expression {
    return {
        condition: core_to_intermediate_expression(statement.expressions.elements[core_value.condition.expression_index], statement),
        then_statement: core_to_intermediate_statement(core_value.then_statement),
        else_statement: core_to_intermediate_statement(core_value.else_statement),
    };
}

function intermediate_to_core_ternary_condition_expression(intermediate_value: Ternary_condition_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Ternary_condition_expression,
            value: {
                condition: {
                    expression_index: -1
                },
                then_statement: intermediate_to_core_statement(intermediate_value.then_statement),
                else_statement: intermediate_to_core_statement(intermediate_value.else_statement),
            }
        }
    };

    expressions[index] = core_value;

    (core_value.data.value as Core.Ternary_condition_expression).condition.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.condition, expressions);
}

export function create_ternary_condition_expression(condition: Expression, then_statement: Statement, else_statement: Statement): Expression {
    const ternary_condition_expression: Ternary_condition_expression = {
        condition: condition,
        then_statement: then_statement,
        else_statement: else_statement,
    };
    return {
        data: {
            type: Expression_enum.Ternary_condition_expression,
            value: ternary_condition_expression
        }
    };
}
export interface Type_expression {
    type: Type_reference;
}

function core_to_intermediate_type_expression(core_value: Core.Type_expression, statement: Core.Statement): Type_expression {
    return {
        type: core_to_intermediate_type_reference(core_value.type),
    };
}

function intermediate_to_core_type_expression(intermediate_value: Type_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Type_expression,
            value: {
                type: intermediate_to_core_type_reference(intermediate_value.type),
            }
        }
    };

    expressions[index] = core_value;
}

export function create_type_expression(type: Type_reference): Expression {
    const type_expression: Type_expression = {
        type: type,
    };
    return {
        data: {
            type: Expression_enum.Type_expression,
            value: type_expression
        }
    };
}
export interface Unary_expression {
    expression: Expression;
    operation: Unary_operation;
}

function core_to_intermediate_unary_expression(core_value: Core.Unary_expression, statement: Core.Statement): Unary_expression {
    return {
        expression: core_to_intermediate_expression(statement.expressions.elements[core_value.expression.expression_index], statement),
        operation: core_value.operation,
    };
}

function intermediate_to_core_unary_expression(intermediate_value: Unary_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Unary_expression,
            value: {
                expression: {
                    expression_index: -1
                },
                operation: intermediate_value.operation,
            }
        }
    };

    expressions[index] = core_value;

    (core_value.data.value as Core.Unary_expression).expression.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.expression, expressions);
}

export function create_unary_expression(expression: Expression, operation: Unary_operation): Expression {
    const unary_expression: Unary_expression = {
        expression: expression,
        operation: operation,
    };
    return {
        data: {
            type: Expression_enum.Unary_expression,
            value: unary_expression
        }
    };
}
export interface Union_expression {
    declaration: Union_declaration;
}

function core_to_intermediate_union_expression(core_value: Core.Union_expression, statement: Core.Statement): Union_expression {
    return {
        declaration: core_to_intermediate_union_declaration(core_value.declaration),
    };
}

function intermediate_to_core_union_expression(intermediate_value: Union_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Union_expression,
            value: {
                declaration: intermediate_to_core_union_declaration(intermediate_value.declaration),
            }
        }
    };

    expressions[index] = core_value;
}

export function create_union_expression(declaration: Union_declaration): Expression {
    const union_expression: Union_expression = {
        declaration: declaration,
    };
    return {
        data: {
            type: Expression_enum.Union_expression,
            value: union_expression
        }
    };
}
export interface Variable_declaration_expression {
    name: string;
    is_mutable: boolean;
    right_hand_side: Expression;
}

function core_to_intermediate_variable_declaration_expression(core_value: Core.Variable_declaration_expression, statement: Core.Statement): Variable_declaration_expression {
    return {
        name: core_value.name,
        is_mutable: core_value.is_mutable,
        right_hand_side: core_to_intermediate_expression(statement.expressions.elements[core_value.right_hand_side.expression_index], statement),
    };
}

function intermediate_to_core_variable_declaration_expression(intermediate_value: Variable_declaration_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Variable_declaration_expression,
            value: {
                name: intermediate_value.name,
                is_mutable: intermediate_value.is_mutable,
                right_hand_side: {
                    expression_index: -1
                },
            }
        }
    };

    expressions[index] = core_value;

    (core_value.data.value as Core.Variable_declaration_expression).right_hand_side.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.right_hand_side, expressions);
}

export function create_variable_declaration_expression(name: string, is_mutable: boolean, right_hand_side: Expression): Expression {
    const variable_declaration_expression: Variable_declaration_expression = {
        name: name,
        is_mutable: is_mutable,
        right_hand_side: right_hand_side,
    };
    return {
        data: {
            type: Expression_enum.Variable_declaration_expression,
            value: variable_declaration_expression
        }
    };
}
export interface Variable_declaration_with_type_expression {
    name: string;
    is_mutable: boolean;
    type: Type_reference;
    right_hand_side: Statement;
}

function core_to_intermediate_variable_declaration_with_type_expression(core_value: Core.Variable_declaration_with_type_expression, statement: Core.Statement): Variable_declaration_with_type_expression {
    return {
        name: core_value.name,
        is_mutable: core_value.is_mutable,
        type: core_to_intermediate_type_reference(core_value.type),
        right_hand_side: core_to_intermediate_statement(core_value.right_hand_side),
    };
}

function intermediate_to_core_variable_declaration_with_type_expression(intermediate_value: Variable_declaration_with_type_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Variable_declaration_with_type_expression,
            value: {
                name: intermediate_value.name,
                is_mutable: intermediate_value.is_mutable,
                type: intermediate_to_core_type_reference(intermediate_value.type),
                right_hand_side: intermediate_to_core_statement(intermediate_value.right_hand_side),
            }
        }
    };

    expressions[index] = core_value;
}

export function create_variable_declaration_with_type_expression(name: string, is_mutable: boolean, type: Type_reference, right_hand_side: Statement): Expression {
    const variable_declaration_with_type_expression: Variable_declaration_with_type_expression = {
        name: name,
        is_mutable: is_mutable,
        type: type,
        right_hand_side: right_hand_side,
    };
    return {
        data: {
            type: Expression_enum.Variable_declaration_with_type_expression,
            value: variable_declaration_with_type_expression
        }
    };
}
export interface While_loop_expression {
    condition: Statement;
    then_statements: Statement[];
}

function core_to_intermediate_while_loop_expression(core_value: Core.While_loop_expression, statement: Core.Statement): While_loop_expression {
    return {
        condition: core_to_intermediate_statement(core_value.condition),
        then_statements: core_value.then_statements.elements.map(value => core_to_intermediate_statement(value)),
    };
}

function intermediate_to_core_while_loop_expression(intermediate_value: While_loop_expression, expressions: Core.Expression[]): void {
    const index = expressions.length;
    expressions.push({} as Core.Expression);
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.While_loop_expression,
            value: {
                condition: intermediate_to_core_statement(intermediate_value.condition),
                then_statements: {
                    size: intermediate_value.then_statements.length,
                    elements: intermediate_value.then_statements.map(value => intermediate_to_core_statement(value))
                },
            }
        }
    };

    expressions[index] = core_value;
}

export function create_while_loop_expression(condition: Statement, then_statements: Statement[]): Expression {
    const while_loop_expression: While_loop_expression = {
        condition: condition,
        then_statements: then_statements,
    };
    return {
        data: {
            type: Expression_enum.While_loop_expression,
            value: while_loop_expression
        }
    };
}
export interface Expression {
    data: Variant<Expression_enum, Access_expression | Access_array_expression | Assert_expression | Assignment_expression | Binary_expression | Block_expression | Break_expression | Call_expression | Cast_expression | Comment_expression | Compile_time_expression | Constant_expression | Constant_array_expression | Continue_expression | Defer_expression | Dereference_and_access_expression | For_loop_expression | Function_expression | Instance_call_expression | If_expression | Instantiate_expression | Invalid_expression | Null_pointer_expression | Parenthesis_expression | Reflection_expression | Return_expression | Struct_expression | Switch_expression | Ternary_condition_expression | Type_expression | Unary_expression | Union_expression | Variable_declaration_expression | Variable_declaration_with_type_expression | Variable_expression | While_loop_expression>;
    source_position?: Source_position;
}

function core_to_intermediate_expression(core_value: Core.Expression, statement: Core.Statement): Expression {
    return {
        data: (() => {
            switch (core_value.data.type) {
                case Core.Expression_enum.Access_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_access_expression(core_value.data.value as Core.Access_expression, statement)
                    };
                }
                case Core.Expression_enum.Access_array_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_access_array_expression(core_value.data.value as Core.Access_array_expression, statement)
                    };
                }
                case Core.Expression_enum.Assert_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_assert_expression(core_value.data.value as Core.Assert_expression, statement)
                    };
                }
                case Core.Expression_enum.Assignment_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_assignment_expression(core_value.data.value as Core.Assignment_expression, statement)
                    };
                }
                case Core.Expression_enum.Binary_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_binary_expression(core_value.data.value as Core.Binary_expression, statement)
                    };
                }
                case Core.Expression_enum.Block_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_block_expression(core_value.data.value as Core.Block_expression, statement)
                    };
                }
                case Core.Expression_enum.Break_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_break_expression(core_value.data.value as Core.Break_expression, statement)
                    };
                }
                case Core.Expression_enum.Call_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_call_expression(core_value.data.value as Core.Call_expression, statement)
                    };
                }
                case Core.Expression_enum.Cast_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_cast_expression(core_value.data.value as Core.Cast_expression, statement)
                    };
                }
                case Core.Expression_enum.Comment_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_comment_expression(core_value.data.value as Core.Comment_expression, statement)
                    };
                }
                case Core.Expression_enum.Compile_time_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_compile_time_expression(core_value.data.value as Core.Compile_time_expression, statement)
                    };
                }
                case Core.Expression_enum.Constant_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_constant_expression(core_value.data.value as Core.Constant_expression, statement)
                    };
                }
                case Core.Expression_enum.Constant_array_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_constant_array_expression(core_value.data.value as Core.Constant_array_expression, statement)
                    };
                }
                case Core.Expression_enum.Continue_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_continue_expression(core_value.data.value as Core.Continue_expression, statement)
                    };
                }
                case Core.Expression_enum.Defer_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_defer_expression(core_value.data.value as Core.Defer_expression, statement)
                    };
                }
                case Core.Expression_enum.Dereference_and_access_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_dereference_and_access_expression(core_value.data.value as Core.Dereference_and_access_expression, statement)
                    };
                }
                case Core.Expression_enum.For_loop_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_for_loop_expression(core_value.data.value as Core.For_loop_expression, statement)
                    };
                }
                case Core.Expression_enum.Function_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_function_expression(core_value.data.value as Core.Function_expression, statement)
                    };
                }
                case Core.Expression_enum.Instance_call_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_instance_call_expression(core_value.data.value as Core.Instance_call_expression, statement)
                    };
                }
                case Core.Expression_enum.If_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_if_expression(core_value.data.value as Core.If_expression, statement)
                    };
                }
                case Core.Expression_enum.Instantiate_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_instantiate_expression(core_value.data.value as Core.Instantiate_expression, statement)
                    };
                }
                case Core.Expression_enum.Invalid_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_invalid_expression(core_value.data.value as Core.Invalid_expression, statement)
                    };
                }
                case Core.Expression_enum.Null_pointer_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_null_pointer_expression(core_value.data.value as Core.Null_pointer_expression, statement)
                    };
                }
                case Core.Expression_enum.Parenthesis_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_parenthesis_expression(core_value.data.value as Core.Parenthesis_expression, statement)
                    };
                }
                case Core.Expression_enum.Reflection_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_reflection_expression(core_value.data.value as Core.Reflection_expression, statement)
                    };
                }
                case Core.Expression_enum.Return_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_return_expression(core_value.data.value as Core.Return_expression, statement)
                    };
                }
                case Core.Expression_enum.Struct_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_struct_expression(core_value.data.value as Core.Struct_expression, statement)
                    };
                }
                case Core.Expression_enum.Switch_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_switch_expression(core_value.data.value as Core.Switch_expression, statement)
                    };
                }
                case Core.Expression_enum.Ternary_condition_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_ternary_condition_expression(core_value.data.value as Core.Ternary_condition_expression, statement)
                    };
                }
                case Core.Expression_enum.Type_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_type_expression(core_value.data.value as Core.Type_expression, statement)
                    };
                }
                case Core.Expression_enum.Unary_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_unary_expression(core_value.data.value as Core.Unary_expression, statement)
                    };
                }
                case Core.Expression_enum.Union_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_union_expression(core_value.data.value as Core.Union_expression, statement)
                    };
                }
                case Core.Expression_enum.Variable_declaration_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_variable_declaration_expression(core_value.data.value as Core.Variable_declaration_expression, statement)
                    };
                }
                case Core.Expression_enum.Variable_declaration_with_type_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_variable_declaration_with_type_expression(core_value.data.value as Core.Variable_declaration_with_type_expression, statement)
                    };
                }
                case Core.Expression_enum.Variable_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_variable_expression(core_value.data.value as Core.Variable_expression, statement)
                    };
                }
                case Core.Expression_enum.While_loop_expression: {
                    return {
                        type: core_value.data.type,
                        value: core_to_intermediate_while_loop_expression(core_value.data.value as Core.While_loop_expression, statement)
                    };
                }
            }
        })(),
        source_position: core_value.source_position !== undefined ? core_to_intermediate_source_position(core_value.source_position) : undefined,
    };
}

function intermediate_to_core_expression(intermediate_value: Expression, expressions: Core.Expression[]): void {
    const expression_index = expressions.length;

    switch (intermediate_value.data.type) {
        case Expression_enum.Access_expression: {
            intermediate_to_core_access_expression(intermediate_value.data.value as Access_expression, expressions);
            break;
        }
        case Expression_enum.Access_array_expression: {
            intermediate_to_core_access_array_expression(intermediate_value.data.value as Access_array_expression, expressions);
            break;
        }
        case Expression_enum.Assert_expression: {
            intermediate_to_core_assert_expression(intermediate_value.data.value as Assert_expression, expressions);
            break;
        }
        case Expression_enum.Assignment_expression: {
            intermediate_to_core_assignment_expression(intermediate_value.data.value as Assignment_expression, expressions);
            break;
        }
        case Expression_enum.Binary_expression: {
            intermediate_to_core_binary_expression(intermediate_value.data.value as Binary_expression, expressions);
            break;
        }
        case Expression_enum.Block_expression: {
            intermediate_to_core_block_expression(intermediate_value.data.value as Block_expression, expressions);
            break;
        }
        case Expression_enum.Break_expression: {
            intermediate_to_core_break_expression(intermediate_value.data.value as Break_expression, expressions);
            break;
        }
        case Expression_enum.Call_expression: {
            intermediate_to_core_call_expression(intermediate_value.data.value as Call_expression, expressions);
            break;
        }
        case Expression_enum.Cast_expression: {
            intermediate_to_core_cast_expression(intermediate_value.data.value as Cast_expression, expressions);
            break;
        }
        case Expression_enum.Comment_expression: {
            intermediate_to_core_comment_expression(intermediate_value.data.value as Comment_expression, expressions);
            break;
        }
        case Expression_enum.Compile_time_expression: {
            intermediate_to_core_compile_time_expression(intermediate_value.data.value as Compile_time_expression, expressions);
            break;
        }
        case Expression_enum.Constant_expression: {
            intermediate_to_core_constant_expression(intermediate_value.data.value as Constant_expression, expressions);
            break;
        }
        case Expression_enum.Constant_array_expression: {
            intermediate_to_core_constant_array_expression(intermediate_value.data.value as Constant_array_expression, expressions);
            break;
        }
        case Expression_enum.Continue_expression: {
            intermediate_to_core_continue_expression(intermediate_value.data.value as Continue_expression, expressions);
            break;
        }
        case Expression_enum.Defer_expression: {
            intermediate_to_core_defer_expression(intermediate_value.data.value as Defer_expression, expressions);
            break;
        }
        case Expression_enum.Dereference_and_access_expression: {
            intermediate_to_core_dereference_and_access_expression(intermediate_value.data.value as Dereference_and_access_expression, expressions);
            break;
        }
        case Expression_enum.For_loop_expression: {
            intermediate_to_core_for_loop_expression(intermediate_value.data.value as For_loop_expression, expressions);
            break;
        }
        case Expression_enum.Function_expression: {
            intermediate_to_core_function_expression(intermediate_value.data.value as Function_expression, expressions);
            break;
        }
        case Expression_enum.Instance_call_expression: {
            intermediate_to_core_instance_call_expression(intermediate_value.data.value as Instance_call_expression, expressions);
            break;
        }
        case Expression_enum.If_expression: {
            intermediate_to_core_if_expression(intermediate_value.data.value as If_expression, expressions);
            break;
        }
        case Expression_enum.Instantiate_expression: {
            intermediate_to_core_instantiate_expression(intermediate_value.data.value as Instantiate_expression, expressions);
            break;
        }
        case Expression_enum.Invalid_expression: {
            intermediate_to_core_invalid_expression(intermediate_value.data.value as Invalid_expression, expressions);
            break;
        }
        case Expression_enum.Null_pointer_expression: {
            intermediate_to_core_null_pointer_expression(intermediate_value.data.value as Null_pointer_expression, expressions);
            break;
        }
        case Expression_enum.Parenthesis_expression: {
            intermediate_to_core_parenthesis_expression(intermediate_value.data.value as Parenthesis_expression, expressions);
            break;
        }
        case Expression_enum.Reflection_expression: {
            intermediate_to_core_reflection_expression(intermediate_value.data.value as Reflection_expression, expressions);
            break;
        }
        case Expression_enum.Return_expression: {
            intermediate_to_core_return_expression(intermediate_value.data.value as Return_expression, expressions);
            break;
        }
        case Expression_enum.Struct_expression: {
            intermediate_to_core_struct_expression(intermediate_value.data.value as Struct_expression, expressions);
            break;
        }
        case Expression_enum.Switch_expression: {
            intermediate_to_core_switch_expression(intermediate_value.data.value as Switch_expression, expressions);
            break;
        }
        case Expression_enum.Ternary_condition_expression: {
            intermediate_to_core_ternary_condition_expression(intermediate_value.data.value as Ternary_condition_expression, expressions);
            break;
        }
        case Expression_enum.Type_expression: {
            intermediate_to_core_type_expression(intermediate_value.data.value as Type_expression, expressions);
            break;
        }
        case Expression_enum.Unary_expression: {
            intermediate_to_core_unary_expression(intermediate_value.data.value as Unary_expression, expressions);
            break;
        }
        case Expression_enum.Union_expression: {
            intermediate_to_core_union_expression(intermediate_value.data.value as Union_expression, expressions);
            break;
        }
        case Expression_enum.Variable_declaration_expression: {
            intermediate_to_core_variable_declaration_expression(intermediate_value.data.value as Variable_declaration_expression, expressions);
            break;
        }
        case Expression_enum.Variable_declaration_with_type_expression: {
            intermediate_to_core_variable_declaration_with_type_expression(intermediate_value.data.value as Variable_declaration_with_type_expression, expressions);
            break;
        }
        case Expression_enum.Variable_expression: {
            intermediate_to_core_variable_expression(intermediate_value.data.value as Variable_expression, expressions);
            break;
        }
        case Expression_enum.While_loop_expression: {
            intermediate_to_core_while_loop_expression(intermediate_value.data.value as While_loop_expression, expressions);
            break;
        }
    }

    if (intermediate_value.source_position !== undefined) {
        expressions[expression_index].source_position = intermediate_value.source_position;
    }
}

export interface Type_constructor_parameter {
    name: string;
    type: Type_reference;
}

function core_to_intermediate_type_constructor_parameter(core_value: Core.Type_constructor_parameter): Type_constructor_parameter {
    return {
        name: core_value.name,
        type: core_to_intermediate_type_reference(core_value.type),
    };
}

function intermediate_to_core_type_constructor_parameter(intermediate_value: Type_constructor_parameter): Core.Type_constructor_parameter {
    return {
        name: intermediate_value.name,
        type: intermediate_to_core_type_reference(intermediate_value.type),
    };
}

export interface Type_constructor {
    name: string;
    parameters: Type_constructor_parameter[];
    statements: Statement[];
    comment?: string;
    source_location?: Source_location;
}

function core_to_intermediate_type_constructor(core_value: Core.Type_constructor): Type_constructor {
    return {
        name: core_value.name,
        parameters: core_value.parameters.elements.map(value => core_to_intermediate_type_constructor_parameter(value)),
        statements: core_value.statements.elements.map(value => core_to_intermediate_statement(value)),
        comment: core_value.comment,
        source_location: core_value.source_location !== undefined ? core_to_intermediate_source_location(core_value.source_location) : undefined,
    };
}

function intermediate_to_core_type_constructor(intermediate_value: Type_constructor): Core.Type_constructor {
    return {
        name: intermediate_value.name,
        parameters: {
            size: intermediate_value.parameters.length,
            elements: intermediate_value.parameters.map(value => intermediate_to_core_type_constructor_parameter(value)),
        },
        statements: {
            size: intermediate_value.statements.length,
            elements: intermediate_value.statements.map(value => intermediate_to_core_statement(value)),
        },
        comment: intermediate_value.comment,
        source_location: intermediate_value.source_location !== undefined ? intermediate_to_core_source_location(intermediate_value.source_location) : undefined,
    };
}

export interface Function_constructor_parameter {
    name: string;
    type: Type_reference;
}

function core_to_intermediate_function_constructor_parameter(core_value: Core.Function_constructor_parameter): Function_constructor_parameter {
    return {
        name: core_value.name,
        type: core_to_intermediate_type_reference(core_value.type),
    };
}

function intermediate_to_core_function_constructor_parameter(intermediate_value: Function_constructor_parameter): Core.Function_constructor_parameter {
    return {
        name: intermediate_value.name,
        type: intermediate_to_core_type_reference(intermediate_value.type),
    };
}

export interface Function_constructor {
    name: string;
    parameters: Function_constructor_parameter[];
    statements: Statement[];
    comment?: string;
    source_location?: Source_location;
}

function core_to_intermediate_function_constructor(core_value: Core.Function_constructor): Function_constructor {
    return {
        name: core_value.name,
        parameters: core_value.parameters.elements.map(value => core_to_intermediate_function_constructor_parameter(value)),
        statements: core_value.statements.elements.map(value => core_to_intermediate_statement(value)),
        comment: core_value.comment,
        source_location: core_value.source_location !== undefined ? core_to_intermediate_source_location(core_value.source_location) : undefined,
    };
}

function intermediate_to_core_function_constructor(intermediate_value: Function_constructor): Core.Function_constructor {
    return {
        name: intermediate_value.name,
        parameters: {
            size: intermediate_value.parameters.length,
            elements: intermediate_value.parameters.map(value => intermediate_to_core_function_constructor_parameter(value)),
        },
        statements: {
            size: intermediate_value.statements.length,
            elements: intermediate_value.statements.map(value => intermediate_to_core_statement(value)),
        },
        comment: intermediate_value.comment,
        source_location: intermediate_value.source_location !== undefined ? intermediate_to_core_source_location(intermediate_value.source_location) : undefined,
    };
}

export interface Language_version {
    major: number;
    minor: number;
    patch: number;
}

function core_to_intermediate_language_version(core_value: Core.Language_version): Language_version {
    return {
        major: core_value.major,
        minor: core_value.minor,
        patch: core_value.patch,
    };
}

function intermediate_to_core_language_version(intermediate_value: Language_version): Core.Language_version {
    return {
        major: intermediate_value.major,
        minor: intermediate_value.minor,
        patch: intermediate_value.patch,
    };
}

export interface Import_module_with_alias {
    module_name: string;
    alias: string;
    usages: string[];
}

function core_to_intermediate_import_module_with_alias(core_value: Core.Import_module_with_alias): Import_module_with_alias {
    return {
        module_name: core_value.module_name,
        alias: core_value.alias,
        usages: core_value.usages.elements,
    };
}

function intermediate_to_core_import_module_with_alias(intermediate_value: Import_module_with_alias): Core.Import_module_with_alias {
    return {
        module_name: intermediate_value.module_name,
        alias: intermediate_value.alias,
        usages: {
            size: intermediate_value.usages.length,
            elements: intermediate_value.usages,
        },
    };
}

