
import * as Core from "./Core_interface";

export interface Variant<Type_enum, T> {
    type: Type_enum;
    value: T;
}

export interface Module {
    name: string;
    imports: Import_module_with_alias[];
    declarations: Declaration[];
}

export function create_intermediate_representation(core_module: Core.Module): Module {

    const imports = core_module.dependencies.alias_imports.elements.map(value => core_to_intermediate_import_module_with_alias(value));
    const declarations = create_declarations(core_module);

    return {
        name: core_module.name,
        imports: imports,
        declarations: declarations
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
    const export_structs: Core.Struct_declaration[] = [];
    const internal_structs: Core.Struct_declaration[] = [];
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
                function_definitions.push(intermediate_to_core_function_definition(function_value.definition));
                break;
            }
            case Declaration_type.Struct: {
                const array = declaration.is_export ? export_structs : internal_structs;
                array.push(intermediate_to_core_struct_declaration(declaration.value as Struct_declaration));
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
            function_declarations: {
                size: export_functions.length,
                elements: export_functions
            },
            struct_declarations: {
                size: export_structs.length,
                elements: export_structs
            },
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
            function_declarations: {
                size: internal_functions.length,
                elements: internal_functions
            },
            struct_declarations: {
                size: internal_structs.length,
                elements: internal_structs
            },
        },
        definitions: {
            function_definitions: {
                size: function_definitions.length,
                elements: function_definitions
            }
        }
    };
}

export enum Declaration_type {
    Alias,
    Enum,
    Function,
    Struct
}

export interface Declaration {
    name: string;
    type: Declaration_type;
    is_export: boolean;
    value: Alias_type_declaration | Enum_declaration | Function | Struct_declaration
}

function create_declarations(module: Core.Module): Declaration[] {

    const declarations: Declaration[] = [
        ...module.export_declarations.alias_type_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Alias, is_export: true, value: core_to_intermediate_alias_type_declaration(value) }; }),
        ...module.export_declarations.enum_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Enum, is_export: true, value: core_to_intermediate_enum_declaration(value) }; }),
        ...module.export_declarations.function_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Function, is_export: true, value: core_to_intermediate_function(module, value) }; }),
        ...module.export_declarations.struct_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Struct, is_export: true, value: core_to_intermediate_struct_declaration(value) }; }),
        ...module.internal_declarations.alias_type_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Alias, is_export: false, value: core_to_intermediate_alias_type_declaration(value) }; }),
        ...module.internal_declarations.enum_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Enum, is_export: false, value: core_to_intermediate_enum_declaration(value) }; }),
        ...module.internal_declarations.function_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Function, is_export: false, value: core_to_intermediate_function(module, value) }; }),
        ...module.internal_declarations.struct_declarations.elements.map((value, index): Declaration => { return { name: value.name, type: Declaration_type.Struct, is_export: false, value: core_to_intermediate_struct_declaration(value) }; }),
    ];

    return declarations;
}

export interface Function {
    declaration: Function_declaration;
    definition: Function_definition;
}

function core_to_intermediate_function(module: Core.Module, declaration: Core.Function_declaration): Function {

    const definition_index = module.definitions.function_definitions.elements.findIndex(value => value.name === declaration.name);
    const definition = module.definitions.function_definitions.elements[definition_index];

    const value: Function = {
        declaration: core_to_intermediate_function_declaration(declaration),
        definition: core_to_intermediate_function_definition(definition)
    };

    return value;
}

export interface Statement {
    name: string;
    expression: Expression;
}

function core_to_intermediate_statement(core_value: Core.Statement): Statement {
    return {
        name: core_value.name,
        expression: core_to_intermediate_expression(core_value.expressions.elements[0], core_value)
    };
}

function intermediate_to_core_statement(intermediate_value: Statement): Core.Statement {

    const expressions: Core.Expression[] = [];
    intermediate_to_core_expression(intermediate_value.expression, expressions);

    return {
        name: intermediate_value.name,
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
    Constant_expression = "Constant_expression",
    Invalid_expression = "Invalid_expression",
    Return_expression = "Return_expression",
    Struct_member_expression = "Struct_member_expression",
    Variable_declaration_expression = "Variable_declaration_expression",
    Variable_expression = "Variable_expression",
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

export interface Type_reference {
    data: Variant<Type_reference_enum, Builtin_type_reference | Constant_array_type | Custom_type_reference | Fundamental_type | Function_type | Integer_type | Pointer_type>;
}

function core_to_intermediate_type_reference(core_value: Core.Type_reference): Type_reference {
    switch (core_value.data.type) {
        case Core.Type_reference_enum.Builtin_type_reference: {
            return {
                data: {
                    type: core_value.data.type,
                    value: core_to_intermediate_builtin_type_reference(core_value.data.value as Core.Builtin_type_reference)
                }
            };
        }
        case Core.Type_reference_enum.Constant_array_type: {
            return {
                data: {
                    type: core_value.data.type,
                    value: core_to_intermediate_constant_array_type(core_value.data.value as Core.Constant_array_type)
                }
            };
        }
        case Core.Type_reference_enum.Custom_type_reference: {
            return {
                data: {
                    type: core_value.data.type,
                    value: core_to_intermediate_custom_type_reference(core_value.data.value as Core.Custom_type_reference)
                }
            };
        }
        case Core.Type_reference_enum.Fundamental_type: {
            return {
                data: {
                    type: core_value.data.type,
                    value: core_value.data.value as Fundamental_type
                }
            };
        }
        case Core.Type_reference_enum.Function_type: {
            return {
                data: {
                    type: core_value.data.type,
                    value: core_to_intermediate_function_type(core_value.data.value as Core.Function_type)
                }
            };
        }
        case Core.Type_reference_enum.Integer_type: {
            return {
                data: {
                    type: core_value.data.type,
                    value: core_to_intermediate_integer_type(core_value.data.value as Core.Integer_type)
                }
            };
        }
        case Core.Type_reference_enum.Pointer_type: {
            return {
                data: {
                    type: core_value.data.type,
                    value: core_to_intermediate_pointer_type(core_value.data.value as Core.Pointer_type)
                }
            };
        }
    }
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
        case Type_reference_enum.Function_type: {
            return {
                data: {
                    type: intermediate_value.data.type,
                    value: intermediate_to_core_function_type(intermediate_value.data.value as Function_type)
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
        case Type_reference_enum.Pointer_type: {
            return {
                data: {
                    type: intermediate_value.data.type,
                    value: intermediate_to_core_pointer_type(intermediate_value.data.value as Pointer_type)
                }
            };
        }
    }
}

export interface Alias_type_declaration {
    name: string;
    type: Type_reference[];
}

function core_to_intermediate_alias_type_declaration(core_value: Core.Alias_type_declaration): Alias_type_declaration {
    return {
        name: core_value.name,
        type: core_value.type.elements.map(value => core_to_intermediate_type_reference(value)),
    };
}

function intermediate_to_core_alias_type_declaration(intermediate_value: Alias_type_declaration): Core.Alias_type_declaration {
    return {
        name: intermediate_value.name,
        type: {
            size: intermediate_value.type.length,
            elements: intermediate_value.type.map(value => intermediate_to_core_type_reference(value)),
        },
    };
}

export interface Enum_value {
    name: string;
    value: number;
}

function core_to_intermediate_enum_value(core_value: Core.Enum_value): Enum_value {
    return {
        name: core_value.name,
        value: core_value.value,
    };
}

function intermediate_to_core_enum_value(intermediate_value: Enum_value): Core.Enum_value {
    return {
        name: intermediate_value.name,
        value: intermediate_value.value,
    };
}

export interface Enum_declaration {
    name: string;
    values: Enum_value[];
}

function core_to_intermediate_enum_declaration(core_value: Core.Enum_declaration): Enum_declaration {
    return {
        name: core_value.name,
        values: core_value.values.elements.map(value => core_to_intermediate_enum_value(value)),
    };
}

function intermediate_to_core_enum_declaration(intermediate_value: Enum_declaration): Core.Enum_declaration {
    return {
        name: intermediate_value.name,
        values: {
            size: intermediate_value.values.length,
            elements: intermediate_value.values.map(value => intermediate_to_core_enum_value(value)),
        },
    };
}

export interface Struct_declaration {
    name: string;
    member_types: Type_reference[];
    member_names: string[];
    is_packed: boolean;
    is_literal: boolean;
}

function core_to_intermediate_struct_declaration(core_value: Core.Struct_declaration): Struct_declaration {
    return {
        name: core_value.name,
        member_types: core_value.member_types.elements.map(value => core_to_intermediate_type_reference(value)),
        member_names: core_value.member_names.elements,
        is_packed: core_value.is_packed,
        is_literal: core_value.is_literal,
    };
}

function intermediate_to_core_struct_declaration(intermediate_value: Struct_declaration): Core.Struct_declaration {
    return {
        name: intermediate_value.name,
        member_types: {
            size: intermediate_value.member_types.length,
            elements: intermediate_value.member_types.map(value => intermediate_to_core_type_reference(value)),
        },
        member_names: {
            size: intermediate_value.member_names.length,
            elements: intermediate_value.member_names,
        },
        is_packed: intermediate_value.is_packed,
        is_literal: intermediate_value.is_literal,
    };
}

export interface Variable_expression {
    name: string;
}

function core_to_intermediate_variable_expression(core_value: Core.Variable_expression, statement: Core.Statement): Variable_expression {
    return {
        name: core_value.name,
    };
}

function intermediate_to_core_variable_expression(intermediate_value: Variable_expression, expressions: Core.Expression[]): void {
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Variable_expression,
            value: {
                name: intermediate_value.name,
            }
        }
    };

    expressions.push(core_value);
}

export interface Assignment_expression {
    left_hand_side: Expression;
    right_hand_side: Expression;
}

function core_to_intermediate_assignment_expression(core_value: Core.Assignment_expression, statement: Core.Statement): Assignment_expression {
    return {
        left_hand_side: core_to_intermediate_expression(statement.expressions.elements[core_value.left_hand_side.expression_index], statement),
        right_hand_side: core_to_intermediate_expression(statement.expressions.elements[core_value.right_hand_side.expression_index], statement),
    };
}

function intermediate_to_core_assignment_expression(intermediate_value: Assignment_expression, expressions: Core.Expression[]): void {
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
            }
        }
    };

    expressions.push(core_value);

    (core_value.data.value as Core.Assignment_expression).left_hand_side.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.left_hand_side, expressions);

    (core_value.data.value as Core.Assignment_expression).right_hand_side.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.right_hand_side, expressions);
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

    expressions.push(core_value);

    (core_value.data.value as Core.Binary_expression).left_hand_side.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.left_hand_side, expressions);

    (core_value.data.value as Core.Binary_expression).right_hand_side.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.right_hand_side, expressions);
}

export interface Call_expression {
    module_reference: Module_reference;
    function_name: string;
    arguments: Expression[];
}

function core_to_intermediate_call_expression(core_value: Core.Call_expression, statement: Core.Statement): Call_expression {
    return {
        module_reference: core_to_intermediate_module_reference(core_value.module_reference),
        function_name: core_value.function_name,
        arguments: core_value.arguments.elements.map(value => core_to_intermediate_expression(statement.expressions.elements[value.expression_index], statement)),
    };
}

function intermediate_to_core_call_expression(intermediate_value: Call_expression, expressions: Core.Expression[]): void {
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Call_expression,
            value: {
                module_reference: intermediate_to_core_module_reference(intermediate_value.module_reference),
                function_name: intermediate_value.function_name,
                arguments: {
                    size: 0,
                    elements: []
                }
            }
        }
    };

    expressions.push(core_value);

    for (const element of intermediate_value.arguments) {
        (core_value.data.value as Core.Call_expression).arguments.elements.push({expression_index: expressions.length});
        intermediate_to_core_expression(element, expressions);
    }
    (core_value.data.value as Core.Call_expression).arguments.size = (core_value.data.value as Core.Call_expression).arguments.elements.length;
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
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Constant_expression,
            value: {
                type: intermediate_to_core_type_reference(intermediate_value.type),
                data: intermediate_value.data,
            }
        }
    };

    expressions.push(core_value);
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
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Invalid_expression,
            value: {
                value: intermediate_value.value,
            }
        }
    };

    expressions.push(core_value);
}

export interface Return_expression {
    expression: Expression;
}

function core_to_intermediate_return_expression(core_value: Core.Return_expression, statement: Core.Statement): Return_expression {
    return {
        expression: core_to_intermediate_expression(statement.expressions.elements[core_value.expression.expression_index], statement),
    };
}

function intermediate_to_core_return_expression(intermediate_value: Return_expression, expressions: Core.Expression[]): void {
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Return_expression,
            value: {
                expression: {
                    expression_index: -1
                },
            }
        }
    };

    expressions.push(core_value);

    (core_value.data.value as Core.Return_expression).expression.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.expression, expressions);
}

export interface Struct_member_expression {
    instance: Expression;
    member_name: string;
}

function core_to_intermediate_struct_member_expression(core_value: Core.Struct_member_expression, statement: Core.Statement): Struct_member_expression {
    return {
        instance: core_to_intermediate_expression(statement.expressions.elements[core_value.instance.expression_index], statement),
        member_name: core_value.member_name,
    };
}

function intermediate_to_core_struct_member_expression(intermediate_value: Struct_member_expression, expressions: Core.Expression[]): void {
    const core_value: Core.Expression = {
        data: {
            type: Core.Expression_enum.Struct_member_expression,
            value: {
                instance: {
                    expression_index: -1
                },
                member_name: intermediate_value.member_name,
            }
        }
    };

    expressions.push(core_value);

    (core_value.data.value as Core.Struct_member_expression).instance.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.instance, expressions);
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

    expressions.push(core_value);

    (core_value.data.value as Core.Variable_declaration_expression).right_hand_side.expression_index = expressions.length;
    intermediate_to_core_expression(intermediate_value.right_hand_side, expressions);
}

export interface Expression {
    data: Variant<Expression_enum, Assignment_expression | Binary_expression | Call_expression | Constant_expression | Invalid_expression | Return_expression | Struct_member_expression | Variable_declaration_expression | Variable_expression>;
}

function core_to_intermediate_expression(core_value: Core.Expression, statement: Core.Statement): Expression {
    switch (core_value.data.type) {
        case Core.Expression_enum.Assignment_expression: {
            return {
                data: {
                    type: core_value.data.type,
                    value: core_to_intermediate_assignment_expression(core_value.data.value as Core.Assignment_expression, statement)
                }
            };
        }
        case Core.Expression_enum.Binary_expression: {
            return {
                data: {
                    type: core_value.data.type,
                    value: core_to_intermediate_binary_expression(core_value.data.value as Core.Binary_expression, statement)
                }
            };
        }
        case Core.Expression_enum.Call_expression: {
            return {
                data: {
                    type: core_value.data.type,
                    value: core_to_intermediate_call_expression(core_value.data.value as Core.Call_expression, statement)
                }
            };
        }
        case Core.Expression_enum.Constant_expression: {
            return {
                data: {
                    type: core_value.data.type,
                    value: core_to_intermediate_constant_expression(core_value.data.value as Core.Constant_expression, statement)
                }
            };
        }
        case Core.Expression_enum.Invalid_expression: {
            return {
                data: {
                    type: core_value.data.type,
                    value: core_to_intermediate_invalid_expression(core_value.data.value as Core.Invalid_expression, statement)
                }
            };
        }
        case Core.Expression_enum.Return_expression: {
            return {
                data: {
                    type: core_value.data.type,
                    value: core_to_intermediate_return_expression(core_value.data.value as Core.Return_expression, statement)
                }
            };
        }
        case Core.Expression_enum.Struct_member_expression: {
            return {
                data: {
                    type: core_value.data.type,
                    value: core_to_intermediate_struct_member_expression(core_value.data.value as Core.Struct_member_expression, statement)
                }
            };
        }
        case Core.Expression_enum.Variable_declaration_expression: {
            return {
                data: {
                    type: core_value.data.type,
                    value: core_to_intermediate_variable_declaration_expression(core_value.data.value as Core.Variable_declaration_expression, statement)
                }
            };
        }
        case Core.Expression_enum.Variable_expression: {
            return {
                data: {
                    type: core_value.data.type,
                    value: core_to_intermediate_variable_expression(core_value.data.value as Core.Variable_expression, statement)
                }
            };
        }
    }
}

function intermediate_to_core_expression(intermediate_value: Expression, expressions: Core.Expression[]): void {
    switch (intermediate_value.data.type) {
        case Expression_enum.Assignment_expression: {
            intermediate_to_core_assignment_expression(intermediate_value.data.value as Assignment_expression, expressions);
            break;
        }
        case Expression_enum.Binary_expression: {
            intermediate_to_core_binary_expression(intermediate_value.data.value as Binary_expression, expressions);
            break;
        }
        case Expression_enum.Call_expression: {
            intermediate_to_core_call_expression(intermediate_value.data.value as Call_expression, expressions);
            break;
        }
        case Expression_enum.Constant_expression: {
            intermediate_to_core_constant_expression(intermediate_value.data.value as Constant_expression, expressions);
            break;
        }
        case Expression_enum.Invalid_expression: {
            intermediate_to_core_invalid_expression(intermediate_value.data.value as Invalid_expression, expressions);
            break;
        }
        case Expression_enum.Return_expression: {
            intermediate_to_core_return_expression(intermediate_value.data.value as Return_expression, expressions);
            break;
        }
        case Expression_enum.Struct_member_expression: {
            intermediate_to_core_struct_member_expression(intermediate_value.data.value as Struct_member_expression, expressions);
            break;
        }
        case Expression_enum.Variable_declaration_expression: {
            intermediate_to_core_variable_declaration_expression(intermediate_value.data.value as Variable_declaration_expression, expressions);
            break;
        }
        case Expression_enum.Variable_expression: {
            intermediate_to_core_variable_expression(intermediate_value.data.value as Variable_expression, expressions);
            break;
        }
    }
}

export interface Function_declaration {
    name: string;
    type: Function_type;
    input_parameter_names: string[];
    output_parameter_names: string[];
    linkage: Linkage;
}

function core_to_intermediate_function_declaration(core_value: Core.Function_declaration): Function_declaration {
    return {
        name: core_value.name,
        type: core_to_intermediate_function_type(core_value.type),
        input_parameter_names: core_value.input_parameter_names.elements,
        output_parameter_names: core_value.output_parameter_names.elements,
        linkage: core_value.linkage,
    };
}

function intermediate_to_core_function_declaration(intermediate_value: Function_declaration): Core.Function_declaration {
    return {
        name: intermediate_value.name,
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
    };
}

export interface Function_definition {
    name: string;
    statements: Statement[];
}

function core_to_intermediate_function_definition(core_value: Core.Function_definition): Function_definition {
    return {
        name: core_value.name,
        statements: core_value.statements.elements.map(value => core_to_intermediate_statement(value)),
    };
}

function intermediate_to_core_function_definition(intermediate_value: Function_definition): Core.Function_definition {
    return {
        name: intermediate_value.name,
        statements: {
            size: intermediate_value.statements.length,
            elements: intermediate_value.statements.map(value => intermediate_to_core_statement(value)),
        },
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

