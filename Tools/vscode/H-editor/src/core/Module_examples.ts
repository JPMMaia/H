import * as core from "./Core_interface";
import * as IR from "./Core_intermediate_representation";
import * as core_reflection from "./Core_reflection";

export function create_empty(): core.Module {
    const reflection_info = core_reflection.create_reflection_info();
    const module = core_reflection.create_empty_module(reflection_info);
    return module;
}

export function create_default(): core.Module {
    return create_0();
}

export function create_0(): core.Module {

    const module: core.Module =
    {
        language_version: { major: 0, minor: 1, patch: 0 },
        name: "module_name",
        dependencies: {
            alias_imports: {
                size: 0,
                elements: []
            }
        },
        export_declarations: {
            alias_type_declarations: {
                size: 1,
                elements: [
                    {
                        name: "My_float",
                        type: {
                            size: 1,
                            elements: [
                                {
                                    data: {
                                        type: core.Type_reference_enum.Fundamental_type,
                                        value: core.Fundamental_type.Float32
                                    }
                                }
                            ]
                        }
                    }
                ]
            },
            enum_declarations: {
                size: 1,
                elements: [
                    {
                        name: "My_enum_0",
                        values: {
                            size: 3,
                            elements: [
                                {
                                    name: "Value_0",
                                    value: 0
                                },
                                {
                                    name: "Value_1",
                                    value: 1
                                },
                                {
                                    name: "Value_2",
                                    value: 2
                                }
                            ]
                        }
                    }
                ]
            },
            struct_declarations: {
                size: 1,
                elements: [
                    {
                        name: "My_struct_0",
                        member_types: {
                            size: 3,
                            elements: [
                                {
                                    data: {
                                        type: core.Type_reference_enum.Fundamental_type,
                                        value: core.Fundamental_type.Float32
                                    }
                                },
                                {
                                    data: {
                                        type: core.Type_reference_enum.Fundamental_type,
                                        value: core.Fundamental_type.Float32
                                    }
                                },
                                {
                                    data: {
                                        type: core.Type_reference_enum.Fundamental_type,
                                        value: core.Fundamental_type.Float32
                                    }
                                }
                            ]
                        },
                        member_names: {
                            size: 3,
                            elements: [
                                "member_0",
                                "member_1",
                                "member_2"
                            ]
                        },
                        is_packed: false,
                        is_literal: false
                    }
                ]
            },
            function_declarations: {
                size: 4,
                elements: [
                    {
                        name: "My_function_0",
                        type: {
                            input_parameter_types: {
                                size: 2,
                                elements: [
                                    { data: { type: core.Type_reference_enum.Fundamental_type, value: core.Fundamental_type.Float32 } },
                                    { data: { type: core.Type_reference_enum.Fundamental_type, value: core.Fundamental_type.Float32 } },
                                ],
                            },
                            output_parameter_types: {
                                size: 1,
                                elements: [{ data: { type: core.Type_reference_enum.Fundamental_type, value: core.Fundamental_type.Float32 } }],
                            },
                            is_variadic: false,
                        },
                        input_parameter_names: { size: 2, elements: ["lhs", "rhs"] },
                        output_parameter_names: { size: 1, elements: ["result"] },
                        linkage: core.Linkage.External,
                    },
                    {
                        name: "My_function_1",
                        type: {
                            input_parameter_types: {
                                size: 2,
                                elements: [
                                    { data: { type: core.Type_reference_enum.Fundamental_type, value: core.Fundamental_type.Float32 } },
                                    { data: { type: core.Type_reference_enum.Fundamental_type, value: core.Fundamental_type.Float32 } },
                                ],
                            },
                            output_parameter_types: {
                                size: 1,
                                elements: [{ data: { type: core.Type_reference_enum.Fundamental_type, value: core.Fundamental_type.Float32 } }],
                            },
                            is_variadic: false,
                        },
                        input_parameter_names: { size: 2, elements: ["lhs", "rhs"] },
                        output_parameter_names: { size: 1, elements: ["result"] },
                        linkage: core.Linkage.External,
                    },
                    {
                        name: "My_function_2",
                        type: {
                            input_parameter_types: {
                                size: 2,
                                elements: [
                                    { data: { type: core.Type_reference_enum.Fundamental_type, value: core.Fundamental_type.Float32 } },
                                    { data: { type: core.Type_reference_enum.Fundamental_type, value: core.Fundamental_type.Float32 } },
                                ],
                            },
                            output_parameter_types: {
                                size: 1,
                                elements: [{ data: { type: core.Type_reference_enum.Fundamental_type, value: core.Fundamental_type.Float32 } }],
                            },
                            is_variadic: false,
                        },
                        input_parameter_names: { size: 2, elements: ["lhs", "rhs"] },
                        output_parameter_names: { size: 1, elements: ["result"] },
                        linkage: core.Linkage.External,
                    },
                    {
                        name: "Empty_function",
                        type: {
                            input_parameter_types: {
                                size: 0,
                                elements: [],
                            },
                            output_parameter_types: {
                                size: 0,
                                elements: [],
                            },
                            is_variadic: false,
                        },
                        input_parameter_names: { size: 0, elements: [] },
                        output_parameter_names: { size: 0, elements: [] },
                        linkage: core.Linkage.External,
                    },
                ],
            },
        },
        internal_declarations: {
            alias_type_declarations: {
                size: 1,
                elements: [
                    {
                        name: "My_int",
                        type: {
                            size: 1,
                            elements: [
                                {
                                    data: {
                                        type: core.Type_reference_enum.Integer_type,
                                        value: {
                                            number_of_bits: 32,
                                            is_signed: true
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            },
            enum_declarations: {
                size: 1,
                elements: [
                    {
                        name: "My_enum_1",
                        values: {
                            size: 3,
                            elements: [
                                {
                                    name: "Value_0",
                                    value: 0
                                },
                                {
                                    name: "Value_1",
                                    value: 1
                                },
                                {
                                    name: "Value_2",
                                    value: 2
                                }
                            ]
                        }
                    }
                ]
            },
            struct_declarations: {
                size: 1,
                elements: [
                    {
                        name: "My_struct_1",
                        member_types: {
                            size: 3,
                            elements: [
                                {
                                    data: {
                                        type: core.Type_reference_enum.Fundamental_type,
                                        value: core.Fundamental_type.Float32
                                    }
                                },
                                {
                                    data: {
                                        type: core.Type_reference_enum.Fundamental_type,
                                        value: core.Fundamental_type.Float32
                                    }
                                },
                                {
                                    data: {
                                        type: core.Type_reference_enum.Fundamental_type,
                                        value: core.Fundamental_type.Float32
                                    }
                                }
                            ]
                        },
                        member_names: {
                            size: 3,
                            elements: [
                                "member_0",
                                "member_1",
                                "member_2"
                            ]
                        },
                        is_packed: false,
                        is_literal: false
                    }
                ]
            },
            function_declarations: {
                size: 1,
                elements: [
                    {
                        name: "My_function_4",
                        type: {
                            input_parameter_types: {
                                size: 2,
                                elements: [
                                    { data: { type: core.Type_reference_enum.Fundamental_type, value: core.Fundamental_type.Float32 } },
                                    { data: { type: core.Type_reference_enum.Fundamental_type, value: core.Fundamental_type.Float32 } },
                                ],
                            },
                            output_parameter_types: {
                                size: 1,
                                elements: [{ data: { type: core.Type_reference_enum.Fundamental_type, value: core.Fundamental_type.Float32 } }],
                            },
                            is_variadic: false,
                        },
                        input_parameter_names: { size: 2, elements: ["lhs", "rhs"] },
                        output_parameter_names: { size: 1, elements: ["result"] },
                        linkage: core.Linkage.Private,
                    },
                ]
            }
        },
        definitions: {
            function_definitions: {
                size: 5,
                elements: [
                    {
                        name: "My_function_0",
                        statements: {
                            size: 1,
                            elements: [
                                {
                                    name: "",
                                    expressions: {
                                        size: 4,
                                        elements: [
                                            {
                                                data: {
                                                    type: core.Expression_enum.Return_expression,
                                                    value: { expression: { expression_index: 1 } },
                                                },
                                            },
                                            {
                                                data: {
                                                    type: core.Expression_enum.Binary_expression,
                                                    value: {
                                                        left_hand_side: { expression_index: 2 },
                                                        right_hand_side: { expression_index: 3 },
                                                        operation: core.Binary_operation.Add,
                                                    },
                                                },
                                            },
                                            {
                                                data: {
                                                    type: core.Expression_enum.Variable_expression,
                                                    value: {
                                                        name: "lhs"
                                                    }
                                                }
                                            },
                                            {
                                                data: {
                                                    type: core.Expression_enum.Variable_expression,
                                                    value: {
                                                        name: "rhs"
                                                    }
                                                }
                                            }
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        name: "My_function_1",
                        statements: {
                            size: 1,
                            elements: [
                                {
                                    name: "",
                                    expressions: {
                                        size: 4,
                                        elements: [
                                            {
                                                data: {
                                                    type: core.Expression_enum.Return_expression,
                                                    value: { expression: { expression_index: 1 } },
                                                },
                                            },
                                            {
                                                data: {
                                                    type: core.Expression_enum.Binary_expression,
                                                    value: {
                                                        left_hand_side: { expression_index: 2 },
                                                        right_hand_side: { expression_index: 3 },
                                                        operation: core.Binary_operation.Add,
                                                    },
                                                },
                                            },
                                            {
                                                data: {
                                                    type: core.Expression_enum.Variable_expression,
                                                    value: {
                                                        name: "lhs"
                                                    }
                                                }
                                            },
                                            {
                                                data: {
                                                    type: core.Expression_enum.Variable_expression,
                                                    value: {
                                                        name: "rhs"
                                                    }
                                                }
                                            }
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        name: "My_function_2",
                        statements: {
                            size: 1,
                            elements: [
                                {
                                    name: "",
                                    expressions: {
                                        size: 4,
                                        elements: [
                                            {
                                                data: {
                                                    type: core.Expression_enum.Return_expression,
                                                    value: { expression: { expression_index: 1 } },
                                                },
                                            },
                                            {
                                                data: {
                                                    type: core.Expression_enum.Binary_expression,
                                                    value: {
                                                        left_hand_side: { expression_index: 2 },
                                                        right_hand_side: { expression_index: 3 },
                                                        operation: core.Binary_operation.Add,
                                                    },
                                                },
                                            },
                                            {
                                                data: {
                                                    type: core.Expression_enum.Variable_expression,
                                                    value: {
                                                        name: "lhs"
                                                    }
                                                }
                                            },
                                            {
                                                data: {
                                                    type: core.Expression_enum.Variable_expression,
                                                    value: {
                                                        name: "rhs"
                                                    }
                                                }
                                            }
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        name: "Empty_function",
                        statements: {
                            size: 0,
                            elements: [],
                        },
                    },
                    {
                        name: "My_function_4",
                        statements: {
                            size: 1,
                            elements: [
                                {
                                    name: "",
                                    expressions: {
                                        size: 4,
                                        elements: [
                                            {
                                                data: {
                                                    type: core.Expression_enum.Return_expression,
                                                    value: { expression: { expression_index: 1 } },
                                                },
                                            },
                                            {
                                                data: {
                                                    type: core.Expression_enum.Binary_expression,
                                                    value: {
                                                        left_hand_side: { expression_index: 2 },
                                                        right_hand_side: { expression_index: 3 },
                                                        operation: core.Binary_operation.Add,
                                                    },
                                                },
                                            },
                                            {
                                                data: {
                                                    type: core.Expression_enum.Variable_expression,
                                                    value: {
                                                        name: "lhs"
                                                    }
                                                }
                                            },
                                            {
                                                data: {
                                                    type: core.Expression_enum.Variable_expression,
                                                    value: {
                                                        name: "rhs"
                                                    }
                                                }
                                            }
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    };

    return module;
}

export function create_alias_example(): core.Module {
    const module = create_empty();
    module.name = "alias_example";
    module.export_declarations.alias_type_declarations = {
        size: 1,
        elements: [
            {
                name: "My_alias",
                type: {
                    size: 1,
                    elements: [
                        {
                            data: {
                                type: core.Type_reference_enum.Fundamental_type,
                                value: core.Fundamental_type.Float32
                            }
                        }
                    ]
                }
            }
        ]
    };

    return module;
}

export function create_enum_example(): core.Module {
    const module = create_empty();
    module.name = "enum_example";
    module.export_declarations.enum_declarations = {
        size: 1,
        elements: [
            {
                name: "My_enum",
                values: {
                    size: 3,
                    elements: [
                        {
                            name: "value_0",
                            value: 0
                        },
                        {
                            name: "value_1",
                            value: 1
                        },
                        {
                            name: "value_2",
                            value: 2
                        },
                    ]
                }
            }
        ]
    };

    return module;
}

export function create_struct_example(): core.Module {
    const module = create_empty();
    module.name = "struct_example";
    module.export_declarations.struct_declarations = {
        size: 1,
        elements: [
            {
                name: "My_struct",
                member_types: {
                    size: 3,
                    elements: [
                        {
                            data: {
                                type: core.Type_reference_enum.Fundamental_type,
                                value: core.Fundamental_type.Float32
                            }
                        },
                        {
                            data: {
                                type: core.Type_reference_enum.Fundamental_type,
                                value: core.Fundamental_type.Float32
                            }
                        },
                        {
                            data: {
                                type: core.Type_reference_enum.Fundamental_type,
                                value: core.Fundamental_type.Float32
                            }
                        }
                    ]
                },
                member_names: {
                    size: 3,
                    elements: [
                        "member_0",
                        "member_1",
                        "member_2"
                    ]
                },
                is_packed: false,
                is_literal: false
            }
        ]
    };

    return module;
}

export function create_function_example(): core.Module {
    const module = create_empty();
    module.name = "function_example";
    module.export_declarations.function_declarations = {
        size: 1,
        elements: [
            {
                name: "My_function",
                type: {
                    input_parameter_types: {
                        size: 2,
                        elements: [
                            { data: { type: core.Type_reference_enum.Fundamental_type, value: core.Fundamental_type.Float32 } },
                            { data: { type: core.Type_reference_enum.Fundamental_type, value: core.Fundamental_type.Float32 } },
                        ],
                    },
                    output_parameter_types: {
                        size: 1,
                        elements: [{ data: { type: core.Type_reference_enum.Fundamental_type, value: core.Fundamental_type.Float32 } }],
                    },
                    is_variadic: false,
                },
                input_parameter_names: { size: 2, elements: ["lhs", "rhs"] },
                output_parameter_names: { size: 1, elements: ["result"] },
                linkage: core.Linkage.External,
            }
        ]
    };
    module.definitions.function_definitions = {
        size: 1,
        elements: [
            {
                name: "My_function",
                statements: {
                    size: 1,
                    elements: [
                        {
                            name: "",
                            expressions: {
                                size: 4,
                                elements: [
                                    {
                                        data: {
                                            type: core.Expression_enum.Return_expression,
                                            value: { expression: { expression_index: 1 } },
                                        },
                                    },
                                    {
                                        data: {
                                            type: core.Expression_enum.Binary_expression,
                                            value: {
                                                left_hand_side: { expression_index: 2 },
                                                right_hand_side: { expression_index: 3 },
                                                operation: core.Binary_operation.Add,
                                            },
                                        },
                                    },
                                    {
                                        data: {
                                            type: core.Expression_enum.Variable_expression,
                                            value: {
                                                name: "lhs"
                                            }
                                        }
                                    },
                                    {
                                        data: {
                                            type: core.Expression_enum.Variable_expression,
                                            value: {
                                                name: "rhs"
                                            }
                                        }
                                    }
                                ],
                            },
                        },
                    ],
                },
            },
        ]
    };

    return module;
}

export function create_function_calling_module_function_example(): IR.Module {

    return {
        name: "function_calling_module_function_example",
        imports: [
            {
                module_name: "C.stdio",
                alias: "stdio",
                usages: ["printf"]
            }
        ],
        declarations: [
            {
                name: "My_function",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "My_function",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: [],
                        linkage: core.Linkage.External,
                    },
                    definition: {
                        name: "My_function",
                        statements: [
                            {
                                name: "",
                                expression: IR.create_call_expression(
                                    IR.create_access_expression(IR.create_variable_expression("stdio"), "printf"),
                                    [
                                        IR.create_constant_expression(create_pointer_type([create_fundamental_type(IR.Fundamental_type.C_char)], false), "Hello world!")
                                    ]
                                ),
                            },
                        ],
                    },
                }
            }
        ]
    };
}

export function create_module_with_dependencies(): core.Module {
    const module = create_empty();
    module.name = "Module_with_dependencies";
    module.dependencies.alias_imports.elements = [
        {
            module_name: "C.stdio",
            alias: "stdio",
            usages: {
                size: 0,
                elements: []
            }
        },
        {
            module_name: "My_library",
            alias: "ml",
            usages: {
                size: 0,
                elements: []
            }
        }
    ];
    module.dependencies.alias_imports.size = module.dependencies.alias_imports.elements.length;
    return module;
}

export function create_hello_world(): IR.Module {
    return {
        name: "Hello_world",
        imports: [
            {
                module_name: "C.stdio",
                alias: "stdio",
                usages: ["puts"]
            }
        ],
        declarations: [
            {
                name: "main",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "main",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [{
                                data: {
                                    type: IR.Type_reference_enum.Integer_type,
                                    value: {
                                        number_of_bits: 32,
                                        is_signed: true
                                    }
                                }
                            }],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: ["result"],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "main",
                        statements: [
                            {
                                name: "",
                                expression: IR.create_call_expression(IR.create_access_expression(IR.create_variable_expression("stdio"), "puts"), [
                                    {
                                        data: {
                                            type: IR.Expression_enum.Constant_expression,
                                            value: {
                                                type: {
                                                    data: {
                                                        type: core.Type_reference_enum.Pointer_type,
                                                        value: {
                                                            element_type: [
                                                                {
                                                                    data: {
                                                                        type: core.Type_reference_enum.Fundamental_type,
                                                                        value: core.Fundamental_type.C_char
                                                                    }
                                                                }
                                                            ],
                                                            is_mutable: false
                                                        }
                                                    }
                                                },
                                                data: "Hello world!"
                                            }
                                        }
                                    }
                                ])
                            },
                            {
                                name: "",
                                expression: {
                                    data: {
                                        type: IR.Expression_enum.Return_expression,
                                        value: {
                                            expression: {
                                                data: {
                                                    type: IR.Expression_enum.Constant_expression,
                                                    value: {
                                                        type: {
                                                            data: {
                                                                type: core.Type_reference_enum.Integer_type,
                                                                value: {
                                                                    number_of_bits: 32,
                                                                    is_signed: true
                                                                }
                                                            }
                                                        },
                                                        data: "0"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        ]
    };
}

export function create_variables(): IR.Module {
    return {
        name: "Variables",
        imports: [],
        declarations: [
            {
                name: "main",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "main",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [{
                                data: {
                                    type: IR.Type_reference_enum.Integer_type,
                                    value: {
                                        number_of_bits: 32,
                                        is_signed: true
                                    }
                                }
                            }],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: ["result"],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "main",
                        statements: [
                            {
                                name: "",
                                expression: {
                                    data: {
                                        type: IR.Expression_enum.Variable_declaration_expression,
                                        value: {
                                            name: "my_constant_variable",
                                            is_mutable: false,
                                            right_hand_side: {
                                                data: {
                                                    type: IR.Expression_enum.Constant_expression,
                                                    value: {
                                                        type: {
                                                            data: {
                                                                type: core.Type_reference_enum.Integer_type,
                                                                value: {
                                                                    number_of_bits: 32,
                                                                    is_signed: true
                                                                }
                                                            }
                                                        },
                                                        data: "1"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                name: "",
                                expression: {
                                    data: {
                                        type: IR.Expression_enum.Variable_declaration_expression,
                                        value: {
                                            name: "my_mutable_variable",
                                            is_mutable: true,
                                            right_hand_side: {
                                                data: {
                                                    type: IR.Expression_enum.Constant_expression,
                                                    value: {
                                                        type: {
                                                            data: {
                                                                type: core.Type_reference_enum.Integer_type,
                                                                value: {
                                                                    number_of_bits: 32,
                                                                    is_signed: true
                                                                }
                                                            }
                                                        },
                                                        data: "2"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                name: "",
                                expression: {
                                    data: {
                                        type: IR.Expression_enum.Assignment_expression,
                                        value: {
                                            left_hand_side: {
                                                data: {
                                                    type: IR.Expression_enum.Variable_expression,
                                                    value: {
                                                        name: "my_mutable_variable"
                                                    }
                                                }
                                            },
                                            right_hand_side: {
                                                data: {
                                                    type: IR.Expression_enum.Constant_expression,
                                                    value: {
                                                        type: {
                                                            data: {
                                                                type: core.Type_reference_enum.Integer_type,
                                                                value: {
                                                                    number_of_bits: 32,
                                                                    is_signed: true
                                                                }
                                                            }
                                                        },
                                                        data: "3"
                                                    }
                                                }
                                            },
                                            additional_operation: undefined
                                        }
                                    }
                                }
                            },
                            {
                                name: "",
                                expression: {
                                    data: {
                                        type: IR.Expression_enum.Return_expression,
                                        value: {
                                            expression: {
                                                data: {
                                                    type: IR.Expression_enum.Constant_expression,
                                                    value: {
                                                        type: {
                                                            data: {
                                                                type: core.Type_reference_enum.Integer_type,
                                                                value: {
                                                                    number_of_bits: 32,
                                                                    is_signed: true
                                                                }
                                                            }
                                                        },
                                                        data: "0"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        ]
    };
}

export function create_numbers(): IR.Module {

    const constant_expressions: [string, IR.Expression][] = [
        ["my_int8", IR.create_constant_expression(create_integer_type(8, true), "1")],
        ["my_int16", IR.create_constant_expression(create_integer_type(16, true), "1")],
        ["my_int32", IR.create_constant_expression(create_integer_type(32, true), "1")],
        ["my_int64", IR.create_constant_expression(create_integer_type(64, true), "1")],
        ["my_uint8", IR.create_constant_expression(create_integer_type(8, false), "1")],
        ["my_uint16", IR.create_constant_expression(create_integer_type(16, false), "1")],
        ["my_uint32", IR.create_constant_expression(create_integer_type(32, false), "1")],
        ["my_uint64", IR.create_constant_expression(create_integer_type(64, false), "1")],
        ["my_float16", IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Float16), "1.0")],
        ["my_float32", IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Float32), "1.0")],
        ["my_float64", IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Float64), "1.0")],
    ];

    const statements: IR.Statement[] = [];

    for (const constant_expression of constant_expressions) {
        const statement: IR.Statement = {
            name: "",
            expression: {
                data: {
                    type: IR.Expression_enum.Variable_declaration_expression,
                    value: {
                        name: constant_expression[0],
                        is_mutable: false,
                        right_hand_side: constant_expression[1]
                    }
                }
            }
        };
        statements.push(statement);
    }

    return {
        name: "Numbers",
        imports: [],
        declarations: [
            {
                name: "main",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "main",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [{
                                data: {
                                    type: IR.Type_reference_enum.Integer_type,
                                    value: {
                                        number_of_bits: 32,
                                        is_signed: true
                                    }
                                }
                            }],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: ["result"],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "main",
                        statements: [
                            ...statements,
                            {
                                name: "",
                                expression: {
                                    data: {
                                        type: IR.Expression_enum.Return_expression,
                                        value: {
                                            expression: {
                                                data: {
                                                    type: IR.Expression_enum.Constant_expression,
                                                    value: {
                                                        type: {
                                                            data: {
                                                                type: core.Type_reference_enum.Integer_type,
                                                                value: {
                                                                    number_of_bits: 32,
                                                                    is_signed: true
                                                                }
                                                            }
                                                        },
                                                        data: "0"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        ]
    };
}

export function create_numeric_casts(): IR.Module {

    const constant_expressions: [string, IR.Expression][] = [
        ["i64_to_i8", IR.create_cast_expression(IR.create_constant_expression(create_integer_type(64, true), "1"), create_integer_type(8, true), IR.Cast_type.Numeric)],
        ["i64_to_i16", IR.create_cast_expression(IR.create_constant_expression(create_integer_type(64, true), "1"), create_integer_type(16, true), IR.Cast_type.Numeric)],
        ["i64_to_i32", IR.create_cast_expression(IR.create_constant_expression(create_integer_type(64, true), "1"), create_integer_type(32, true), IR.Cast_type.Numeric)],

        ["u64_to_u8", IR.create_cast_expression(IR.create_constant_expression(create_integer_type(64, false), "1"), create_integer_type(8, false), IR.Cast_type.Numeric)],
        ["u64_to_u16", IR.create_cast_expression(IR.create_constant_expression(create_integer_type(64, false), "1"), create_integer_type(16, false), IR.Cast_type.Numeric)],
        ["u64_to_u32", IR.create_cast_expression(IR.create_constant_expression(create_integer_type(64, false), "1"), create_integer_type(32, false), IR.Cast_type.Numeric)],

        ["i8_to_i16", IR.create_cast_expression(IR.create_constant_expression(create_integer_type(8, true), "1"), create_integer_type(16, true), IR.Cast_type.Numeric)],
        ["u8_to_u16", IR.create_cast_expression(IR.create_constant_expression(create_integer_type(8, false), "1"), create_integer_type(16, false), IR.Cast_type.Numeric)],

        ["i32_to_u32", IR.create_cast_expression(IR.create_constant_expression(create_integer_type(32, true), "1"), create_integer_type(32, false), IR.Cast_type.Numeric)],
        ["u32_to_i32", IR.create_cast_expression(IR.create_constant_expression(create_integer_type(32, false), "1"), create_integer_type(32, true), IR.Cast_type.Numeric)],

        ["i32_to_f16", IR.create_cast_expression(IR.create_constant_expression(create_integer_type(32, true), "1"), create_fundamental_type(IR.Fundamental_type.Float16), IR.Cast_type.Numeric)],
        ["i32_to_f32", IR.create_cast_expression(IR.create_constant_expression(create_integer_type(32, true), "1"), create_fundamental_type(IR.Fundamental_type.Float32), IR.Cast_type.Numeric)],
        ["i32_to_f64", IR.create_cast_expression(IR.create_constant_expression(create_integer_type(32, true), "1"), create_fundamental_type(IR.Fundamental_type.Float64), IR.Cast_type.Numeric)],

        ["f16_to_i32", IR.create_cast_expression(IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Float16), "1.0"), create_integer_type(32, true), IR.Cast_type.Numeric)],
        ["f32_to_i32", IR.create_cast_expression(IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Float32), "1.0"), create_integer_type(32, true), IR.Cast_type.Numeric)],
        ["f64_to_i32", IR.create_cast_expression(IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Float64), "1.0"), create_integer_type(32, true), IR.Cast_type.Numeric)],
    ];

    const statements: IR.Statement[] = [];

    for (const constant_expression of constant_expressions) {
        const statement: IR.Statement = {
            name: "",
            expression: {
                data: {
                    type: IR.Expression_enum.Variable_declaration_expression,
                    value: {
                        name: constant_expression[0],
                        is_mutable: false,
                        right_hand_side: constant_expression[1]
                    }
                }
            }
        };
        statements.push(statement);
    }

    return {
        name: "Numeric_casts",
        imports: [],
        declarations: [
            {
                name: "main",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "main",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [{
                                data: {
                                    type: IR.Type_reference_enum.Integer_type,
                                    value: {
                                        number_of_bits: 32,
                                        is_signed: true
                                    }
                                }
                            }],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: ["result"],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "main",
                        statements: [
                            ...statements,
                            {
                                name: "",
                                expression: {
                                    data: {
                                        type: IR.Expression_enum.Return_expression,
                                        value: {
                                            expression: {
                                                data: {
                                                    type: IR.Expression_enum.Constant_expression,
                                                    value: {
                                                        type: {
                                                            data: {
                                                                type: core.Type_reference_enum.Integer_type,
                                                                value: {
                                                                    number_of_bits: 32,
                                                                    is_signed: true
                                                                }
                                                            }
                                                        },
                                                        data: "0"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        ]
    };
}

export function create_booleans(): IR.Module {

    const constant_expressions: [string, IR.Expression][] = [
        ["my_true_boolean", IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Bool), "true")],
        ["my_false_boolean", IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Bool), "false")]
    ];

    const statements: IR.Statement[] = [];

    for (const constant_expression of constant_expressions) {
        const statement: IR.Statement = {
            name: "",
            expression: {
                data: {
                    type: IR.Expression_enum.Variable_declaration_expression,
                    value: {
                        name: constant_expression[0],
                        is_mutable: false,
                        right_hand_side: constant_expression[1]
                    }
                }
            }
        };
        statements.push(statement);
    }

    return {
        name: "Booleans",
        imports: [],
        declarations: [
            {
                name: "foo",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "foo",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "foo",
                        statements: [
                            ...statements
                        ]
                    }
                }
            }
        ]
    };
}

export function create_binary_expressions(): IR.Module {

    const binary_expressions: [string, IR.Expression][] = [
        ["add", IR.create_binary_expression(IR.create_variable_expression("first_integer"), IR.create_variable_expression("second_integer"), IR.Binary_operation.Add)],
        ["subtract", IR.create_binary_expression(IR.create_variable_expression("first_integer"), IR.create_variable_expression("second_integer"), IR.Binary_operation.Subtract)],
        ["multiply", IR.create_binary_expression(IR.create_variable_expression("first_integer"), IR.create_variable_expression("second_integer"), IR.Binary_operation.Multiply)],
        ["divide", IR.create_binary_expression(IR.create_variable_expression("first_integer"), IR.create_variable_expression("second_integer"), IR.Binary_operation.Divide)],
        ["modulus", IR.create_binary_expression(IR.create_variable_expression("first_integer"), IR.create_variable_expression("second_integer"), IR.Binary_operation.Modulus)],
        ["equal", IR.create_binary_expression(IR.create_variable_expression("first_integer"), IR.create_variable_expression("second_integer"), IR.Binary_operation.Equal)],
        ["not_equal", IR.create_binary_expression(IR.create_variable_expression("first_integer"), IR.create_variable_expression("second_integer"), IR.Binary_operation.Not_equal)],
        ["less_than", IR.create_binary_expression(IR.create_variable_expression("first_integer"), IR.create_variable_expression("second_integer"), IR.Binary_operation.Less_than)],
        ["less_than_or_equal_to", IR.create_binary_expression(IR.create_variable_expression("first_integer"), IR.create_variable_expression("second_integer"), IR.Binary_operation.Less_than_or_equal_to)],
        ["greater_than", IR.create_binary_expression(IR.create_variable_expression("first_integer"), IR.create_variable_expression("second_integer"), IR.Binary_operation.Greater_than)],
        ["greater_than_or_equal_to", IR.create_binary_expression(IR.create_variable_expression("first_integer"), IR.create_variable_expression("second_integer"), IR.Binary_operation.Greater_than_or_equal_to)],
        ["logical_and", IR.create_binary_expression(IR.create_variable_expression("first_boolean"), IR.create_variable_expression("second_boolean"), IR.Binary_operation.Logical_and)],
        ["logical_or", IR.create_binary_expression(IR.create_variable_expression("first_boolean"), IR.create_variable_expression("second_boolean"), IR.Binary_operation.Logical_or)],
        ["bitwise_and", IR.create_binary_expression(IR.create_variable_expression("first_integer"), IR.create_variable_expression("second_integer"), IR.Binary_operation.Bitwise_and)],
        ["bitwise_or", IR.create_binary_expression(IR.create_variable_expression("first_integer"), IR.create_variable_expression("second_integer"), IR.Binary_operation.Bitwise_or)],
        ["bitwise_xor", IR.create_binary_expression(IR.create_variable_expression("first_integer"), IR.create_variable_expression("second_integer"), IR.Binary_operation.Bitwise_xor)],
        ["bit_shift_left", IR.create_binary_expression(IR.create_variable_expression("first_integer"), IR.create_variable_expression("second_integer"), IR.Binary_operation.Bit_shift_left)],
        ["bit_shift_right", IR.create_binary_expression(IR.create_variable_expression("first_integer"), IR.create_variable_expression("second_integer"), IR.Binary_operation.Bit_shift_right)],
    ];

    const statements: IR.Statement[] = [];

    for (const binary_expression of binary_expressions) {
        const statement: IR.Statement = {
            name: "",
            expression: {
                data: {
                    type: IR.Expression_enum.Variable_declaration_expression,
                    value: {
                        name: binary_expression[0],
                        is_mutable: false,
                        right_hand_side: binary_expression[1]
                    }
                }
            }
        };
        statements.push(statement);
    }

    return {
        name: "Binary_expressions",
        imports: [],
        declarations: [
            {
                name: "foo",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "foo",
                        type: {
                            input_parameter_types: [create_integer_type(32, true), create_integer_type(32, true), create_fundamental_type(IR.Fundamental_type.Bool), create_fundamental_type(IR.Fundamental_type.Bool)],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["first_integer", "second_integer", "first_boolean", "second_boolean"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "foo",
                        statements: [
                            ...statements
                        ]
                    }
                }
            }
        ]
    };
}

export function create_binary_expressions_operator_precedence(): IR.Module {

    const a = IR.create_variable_expression("a");
    const b = IR.create_variable_expression("b");
    const c = IR.create_variable_expression("c");
    const function_call = IR.create_call_expression(IR.create_variable_expression("function_call"), []);
    const value_0 = IR.create_constant_expression(create_integer_type(32, true), "0");
    const value_1 = IR.create_constant_expression(create_integer_type(32, true), "1");

    const binary_expressions: [string, IR.Expression][] = [
        ["case_0", IR.create_binary_expression(a, IR.create_binary_expression(b, c, IR.Binary_operation.Multiply), IR.Binary_operation.Add)],
        ["case_1", IR.create_binary_expression(IR.create_binary_expression(a, b, IR.Binary_operation.Multiply), c, IR.Binary_operation.Add)],
        ["case_2", IR.create_binary_expression(IR.create_binary_expression(a, b, IR.Binary_operation.Divide), c, IR.Binary_operation.Multiply)],
        ["case_3", IR.create_binary_expression(IR.create_binary_expression(a, b, IR.Binary_operation.Multiply), c, IR.Binary_operation.Divide)],

        ["case_4", IR.create_binary_expression(IR.create_binary_expression(a, function_call, IR.Binary_operation.Multiply), b, IR.Binary_operation.Add)],
        ["case_5", IR.create_binary_expression(IR.create_unary_expression(a, IR.Unary_operation.Indirection), IR.create_unary_expression(b, IR.Unary_operation.Indirection), IR.Binary_operation.Multiply)],

        ["case_6", IR.create_binary_expression(IR.create_parenthesis_expression(IR.create_binary_expression(a, b, IR.Binary_operation.Add)), c, IR.Binary_operation.Multiply)],
        ["case_7", IR.create_binary_expression(a, IR.create_parenthesis_expression(IR.create_binary_expression(b, c, IR.Binary_operation.Add)), IR.Binary_operation.Multiply)],

        ["case_8", IR.create_binary_expression(IR.create_binary_expression(a, value_0, IR.Binary_operation.Equal), IR.create_binary_expression(b, value_1, IR.Binary_operation.Equal), IR.Binary_operation.Logical_and)],
        ["case_9", IR.create_binary_expression(IR.create_parenthesis_expression(IR.create_binary_expression(a, b, IR.Binary_operation.Bitwise_and)), IR.create_parenthesis_expression(IR.create_binary_expression(b, a, IR.Binary_operation.Bitwise_and)), IR.Binary_operation.Equal)],
        ["case_10", IR.create_binary_expression(IR.create_binary_expression(a, b, IR.Binary_operation.Less_than), IR.create_binary_expression(b, c, IR.Binary_operation.Less_than), IR.Binary_operation.Logical_and)],
        ["case_11", IR.create_binary_expression(IR.create_binary_expression(a, b, IR.Binary_operation.Add), IR.create_binary_expression(b, c, IR.Binary_operation.Add), IR.Binary_operation.Equal)],

        ["case_12", IR.create_binary_expression(IR.create_unary_expression(a, IR.Unary_operation.Minus), IR.create_parenthesis_expression(IR.create_unary_expression(b, IR.Unary_operation.Minus)), IR.Binary_operation.Add)],
    ];

    const statements: IR.Statement[] = [];

    for (const binary_expression of binary_expressions) {
        const statement: IR.Statement = {
            name: "",
            expression: {
                data: {
                    type: IR.Expression_enum.Variable_declaration_expression,
                    value: {
                        name: binary_expression[0],
                        is_mutable: false,
                        right_hand_side: binary_expression[1]
                    }
                }
            }
        };
        statements.push(statement);
    }

    return {
        name: "Binary_expressions_operator_precedence",
        imports: [],
        declarations: [
            {
                name: "foo",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "foo",
                        type: {
                            input_parameter_types: [create_integer_type(32, true), create_integer_type(32, true), create_integer_type(32, true)],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["a", "b", "c"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "foo",
                        statements: [
                            ...statements
                        ]
                    }
                }
            }
        ]
    };
}

export function create_assignment_expressions(): IR.Module {

    const expressions: IR.Expression[] = [
        IR.create_variable_declaration_expression("my_integer", true, IR.create_constant_expression(create_integer_type(32, true), "1")),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer"), IR.create_constant_expression(create_integer_type(32, true), "2"), undefined),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer"), IR.create_variable_expression("other_integer"), IR.Binary_operation.Add),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer"), IR.create_variable_expression("other_integer"), IR.Binary_operation.Subtract),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer"), IR.create_variable_expression("other_integer"), IR.Binary_operation.Multiply),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer"), IR.create_variable_expression("other_integer"), IR.Binary_operation.Divide),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer"), IR.create_variable_expression("other_integer"), IR.Binary_operation.Modulus),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer"), IR.create_variable_expression("other_integer"), IR.Binary_operation.Bitwise_and),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer"), IR.create_variable_expression("other_integer"), IR.Binary_operation.Bitwise_or),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer"), IR.create_variable_expression("other_integer"), IR.Binary_operation.Bitwise_xor),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer"), IR.create_variable_expression("other_integer"), IR.Binary_operation.Bit_shift_left),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer"), IR.create_variable_expression("other_integer"), IR.Binary_operation.Bit_shift_right),
    ];

    const statements: IR.Statement[] = [];

    for (const binary_expression of expressions) {
        const statement: IR.Statement = {
            name: "",
            expression: binary_expression
        };
        statements.push(statement);
    }

    return {
        name: "Assignment_expressions",
        imports: [],
        declarations: [
            {
                name: "foo",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "foo",
                        type: {
                            input_parameter_types: [create_integer_type(32, true)],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["other_integer"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "foo",
                        statements: [
                            ...statements
                        ]
                    }
                }
            }
        ]
    };
}

export function create_unary_expressions(): IR.Module {

    const unary_expressions: [string, IR.Expression][] = [
        ["not_variable", IR.create_unary_expression(IR.create_variable_expression("my_boolean"), IR.Unary_operation.Not)],
        ["bitwise_not_variable", IR.create_unary_expression(IR.create_variable_expression("my_integer"), IR.Unary_operation.Bitwise_not)],
        ["minus_variable", IR.create_unary_expression(IR.create_variable_expression("my_integer"), IR.Unary_operation.Minus)],
        ["pre_increment_variable", IR.create_unary_expression(IR.create_variable_expression("my_integer"), IR.Unary_operation.Pre_increment)],
        ["post_increment_variable", IR.create_unary_expression(IR.create_variable_expression("my_integer"), IR.Unary_operation.Post_increment)],
        ["pre_decrement_variable", IR.create_unary_expression(IR.create_variable_expression("my_integer"), IR.Unary_operation.Pre_decrement)],
        ["post_decrement_variable", IR.create_unary_expression(IR.create_variable_expression("my_integer"), IR.Unary_operation.Post_decrement)],
        ["address_of_variable", IR.create_unary_expression(IR.create_variable_expression("my_integer"), IR.Unary_operation.Address_of)],
        ["indirection_variable", IR.create_unary_expression(IR.create_variable_expression("address_of_variable"), IR.Unary_operation.Indirection)]
    ];

    const statements: IR.Statement[] = [];

    for (const unary_expression of unary_expressions) {
        const statement: IR.Statement = {
            name: "",
            expression: {
                data: {
                    type: IR.Expression_enum.Variable_declaration_expression,
                    value: {
                        name: unary_expression[0],
                        is_mutable: false,
                        right_hand_side: unary_expression[1]
                    }
                }
            }
        };
        statements.push(statement);
    }

    return {
        name: "Unary_expressions",
        imports: [],
        declarations: [
            {
                name: "foo",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "foo",
                        type: {
                            input_parameter_types: [create_integer_type(32, true), create_fundamental_type(IR.Fundamental_type.Bool)],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["my_integer", "my_boolean"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "foo",
                        statements: [
                            ...statements
                        ]
                    }
                }
            }
        ]
    };
}

export function create_pointer_types(): IR.Module {

    const int32_type = create_integer_type(32, true);

    const alias_type_declaration: IR.Alias_type_declaration = {
        name: "My_alias",
        type: [create_pointer_type([create_custom_type_reference("stdio", "FILE")], true)]
    };

    const alias_type_value_declaration: IR.Declaration = {
        name: "My_alias",
        type: IR.Declaration_type.Alias,
        is_export: true,
        value: alias_type_declaration
    };

    const struct_declaration: IR.Struct_declaration = {
        name: "My_struct",
        member_names: [
            "my_integer",
            "my_pointer_to_integer",
            "file_stream"
        ],
        member_types: [
            int32_type,
            create_pointer_type([int32_type], false),
            create_pointer_type([create_custom_type_reference("stdio", "FILE")], true)
        ],
        is_packed: false,
        is_literal: false
    };

    const struct_value_declaration: IR.Declaration = {
        name: "My_struct",
        type: IR.Declaration_type.Struct,
        is_export: true,
        value: struct_declaration
    };

    const input_parameters: [string, IR.Type_reference][] = [
        ["my_integer", int32_type],
        ["my_pointer_to_integer", create_pointer_type([int32_type], false)],
        ["my_pointer_to_mutable_integer", create_pointer_type([int32_type], true)],
        ["my_pointer_to_pointer_to_integer", create_pointer_type([create_pointer_type([int32_type], false)], false)],
        ["my_pointer_to_pointer_to_mutable_integer", create_pointer_type([create_pointer_type([int32_type], true)], false)],
        ["my_pointer_to_mutable_pointer_to_integer", create_pointer_type([create_pointer_type([int32_type], false)], true)],
        ["my_pointer_to_mutable_pointer_to_mutable_integer", create_pointer_type([create_pointer_type([int32_type], true)], true)],
        ["file_stream", create_pointer_type([create_custom_type_reference("stdio", "FILE")], true)]
    ];

    const function_value_declaration: IR.Declaration = {
        name: "run",
        type: IR.Declaration_type.Function,
        is_export: true,
        value: {
            declaration: {
                name: "run",
                type: {
                    input_parameter_types: input_parameters.map(pair => pair[1]),
                    output_parameter_types: [],
                    is_variadic: false,
                },
                input_parameter_names: input_parameters.map(pair => pair[0]),
                output_parameter_names: [],
                linkage: IR.Linkage.External
            },
            definition: {
                name: "run",
                statements: []
            }
        }
    };

    return {
        name: "Pointer_types",
        imports: [
            {
                module_name: "C.stdio",
                alias: "stdio",
                usages: ["FILE"]
            }
        ],
        declarations: [
            alias_type_value_declaration,
            struct_value_declaration,
            function_value_declaration
        ]
    };
}

export function create_block_expressions(): IR.Module {

    const statements: IR.Statement[] = [
        create_statement(IR.create_variable_declaration_expression("a", false, IR.create_constant_expression(create_integer_type(32, true), "0"))),
        create_statement(IR.create_block_expression([
            create_statement(IR.create_variable_declaration_expression("b", false, IR.create_variable_expression("a"))),
        ])),
        create_statement(IR.create_variable_declaration_expression("b", false, IR.create_variable_expression("a"))),
    ];

    return {
        name: "Block_expressions",
        imports: [],
        declarations: [
            {
                name: "run_blocks",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "run_blocks",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "run_blocks",
                        statements: statements
                    }
                }
            }
        ]
    };
}

export function create_for_loop_expressions(): IR.Module {

    const c_string_type = create_pointer_type([create_fundamental_type(IR.Fundamental_type.C_char)], false);
    const int32_type = create_integer_type(32, true);

    const statements: IR.Statement[] = [
        create_statement(
            IR.create_for_loop_expression(
                "index",
                IR.create_constant_expression(int32_type, "0"),
                IR.create_constant_expression(int32_type, "3"),
                undefined,
                create_statement(
                    IR.create_block_expression([
                        create_statement(
                            IR.create_call_expression(
                                IR.create_variable_expression("print_integer"),
                                [IR.create_variable_expression("index")]
                            )
                        )
                    ])
                )
            )
        ),
        create_statement(
            IR.create_for_loop_expression(
                "index",
                IR.create_constant_expression(int32_type, "0"),
                IR.create_constant_expression(int32_type, "3"),
                undefined,
                create_statement(
                    IR.create_call_expression(
                        IR.create_variable_expression("print_integer"),
                        [IR.create_variable_expression("index")]
                    )
                )
            )
        ),
        create_statement(
            IR.create_for_loop_expression(
                "index",
                IR.create_constant_expression(int32_type, "0"),
                IR.create_constant_expression(int32_type, "4"),
                IR.create_constant_expression(int32_type, "1"),
                create_statement(
                    IR.create_block_expression([
                        create_statement(
                            IR.create_call_expression(
                                IR.create_variable_expression("print_integer"),
                                [IR.create_variable_expression("index")]
                            )
                        )
                    ])
                )
            )
        ),
        create_statement(
            IR.create_for_loop_expression(
                "index",
                IR.create_constant_expression(int32_type, "4"),
                IR.create_constant_expression(int32_type, "0"),
                IR.create_unary_expression(
                    IR.create_constant_expression(int32_type, "1"),
                    IR.Unary_operation.Minus
                ),
                create_statement(
                    IR.create_block_expression([
                        create_statement(
                            IR.create_call_expression(
                                IR.create_variable_expression("print_integer"),
                                [IR.create_variable_expression("index")]
                            )
                        )
                    ])
                )
            )
        )
    ];

    return {
        name: "For_loop_expressions",
        imports: [
            {
                module_name: "C.stdio",
                alias: "stdio",
                usages: ["printf"]
            }
        ],
        declarations: [
            {
                name: "print_integer",
                type: IR.Declaration_type.Function,
                is_export: false,
                value: {
                    declaration: {
                        name: "print_integer",
                        type: {
                            input_parameter_types: [create_integer_type(32, true)],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["value"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.Private
                    },
                    definition: {
                        name: "print_integer",
                        statements: [
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_access_expression(IR.create_variable_expression("stdio"), "printf"),
                                    [
                                        IR.create_constant_expression(c_string_type, "%d"),
                                        IR.create_variable_expression("value")
                                    ]
                                )
                            )
                        ]
                    }
                }
            },
            {
                name: "run_for_loops",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "run_for_loops",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "run_for_loops",
                        statements: statements
                    }
                }
            }
        ]
    };
}

export function create_if_expressions(): IR.Module {

    const c_string_type = create_pointer_type([create_fundamental_type(IR.Fundamental_type.C_char)], false);
    const int32_type = create_integer_type(32, true);

    const statements: IR.Statement[] = [
        create_statement(
            IR.create_if_expression(
                [
                    {
                        statement: create_statement(
                            IR.create_block_expression(
                                [
                                    create_statement(
                                        IR.create_call_expression(
                                            IR.create_variable_expression("print_message"),
                                            [
                                                IR.create_constant_expression(c_string_type, "zero")
                                            ]
                                        )
                                    )
                                ]
                            )
                        ),
                        condition: create_statement(
                            IR.create_binary_expression(
                                IR.create_variable_expression("value"),
                                IR.create_constant_expression(int32_type, "0"),
                                IR.Binary_operation.Equal
                            )
                        )
                    }
                ]
            )
        ),
        create_statement(
            IR.create_if_expression(
                [
                    {
                        statement: create_statement(
                            IR.create_block_expression(
                                [
                                    create_statement(
                                        IR.create_call_expression(
                                            IR.create_variable_expression("print_message"),
                                            [
                                                IR.create_constant_expression(c_string_type, "negative")
                                            ]
                                        )
                                    )
                                ]
                            )
                        ),
                        condition: create_statement(
                            IR.create_binary_expression(
                                IR.create_variable_expression("value"),
                                IR.create_constant_expression(int32_type, "0"),
                                IR.Binary_operation.Less_than
                            )
                        )
                    },
                    {
                        statement: create_statement(
                            IR.create_block_expression(
                                [
                                    create_statement(
                                        IR.create_call_expression(
                                            IR.create_variable_expression("print_message"),
                                            [
                                                IR.create_constant_expression(c_string_type, "non-negative")
                                            ]
                                        )
                                    )
                                ]
                            )
                        ),
                        condition: undefined
                    }
                ]
            )
        ),
        create_statement(
            IR.create_if_expression(
                [
                    {
                        statement: create_statement(
                            IR.create_block_expression(
                                [
                                    create_statement(
                                        IR.create_call_expression(
                                            IR.create_variable_expression("print_message"),
                                            [
                                                IR.create_constant_expression(c_string_type, "negative")
                                            ]
                                        )
                                    )
                                ]
                            )
                        ),
                        condition: create_statement(
                            IR.create_binary_expression(
                                IR.create_variable_expression("value"),
                                IR.create_constant_expression(int32_type, "0"),
                                IR.Binary_operation.Less_than
                            )
                        )
                    },
                    {
                        statement: create_statement(
                            IR.create_block_expression(
                                [
                                    create_statement(
                                        IR.create_call_expression(
                                            IR.create_variable_expression("print_message"),
                                            [
                                                IR.create_constant_expression(c_string_type, "positive")
                                            ]
                                        )
                                    )
                                ]
                            )
                        ),
                        condition: create_statement(
                            IR.create_binary_expression(
                                IR.create_variable_expression("value"),
                                IR.create_constant_expression(int32_type, "0"),
                                IR.Binary_operation.Greater_than
                            )
                        )
                    },
                    {
                        statement: create_statement(
                            IR.create_block_expression(
                                [
                                    create_statement(
                                        IR.create_call_expression(
                                            IR.create_variable_expression("print_message"),
                                            [
                                                IR.create_constant_expression(c_string_type, "zero")
                                            ]
                                        )
                                    )
                                ]
                            )
                        ),
                        condition: undefined
                    }
                ]
            )
        ),
        create_statement(
            IR.create_if_expression(
                [
                    {
                        statement: create_statement(
                            IR.create_call_expression(
                                IR.create_variable_expression("print_message"),
                                [
                                    IR.create_constant_expression(c_string_type, "negative")
                                ]
                            )
                        ),
                        condition: create_statement(
                            IR.create_binary_expression(
                                IR.create_variable_expression("value"),
                                IR.create_constant_expression(int32_type, "0"),
                                IR.Binary_operation.Less_than
                            )
                        )
                    },
                    {
                        statement: create_statement(
                            IR.create_call_expression(
                                IR.create_variable_expression("print_message"),
                                [
                                    IR.create_constant_expression(c_string_type, "positive")
                                ]
                            )
                        ),
                        condition: create_statement(
                            IR.create_binary_expression(
                                IR.create_variable_expression("value"),
                                IR.create_constant_expression(int32_type, "0"),
                                IR.Binary_operation.Greater_than
                            )
                        )
                    },
                    {
                        statement: create_statement(
                            IR.create_call_expression(
                                IR.create_variable_expression("print_message"),
                                [
                                    IR.create_constant_expression(c_string_type, "zero")
                                ]
                            )
                        ),
                        condition: undefined
                    }
                ]
            )
        ),
    ];

    return {
        name: "If_expressions",
        imports: [
            {
                module_name: "C.stdio",
                alias: "stdio",
                usages: ["printf"]
            }
        ],
        declarations: [
            {
                name: "print_message",
                type: IR.Declaration_type.Function,
                is_export: false,
                value: {
                    declaration: {
                        name: "print_message",
                        type: {
                            input_parameter_types: [c_string_type],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["message"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.Private
                    },
                    definition: {
                        name: "print_message",
                        statements: [
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_access_expression(IR.create_variable_expression("stdio"), "printf"),
                                    [
                                        IR.create_constant_expression(c_string_type, "%s\n"),
                                        IR.create_variable_expression("message")
                                    ]
                                )
                            )
                        ]
                    }
                }
            },
            {
                name: "run_ifs",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "run_ifs",
                        type: {
                            input_parameter_types: [int32_type],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["value"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "run_ifs",
                        statements: statements
                    }
                }
            }
        ]
    };
}

export function create_switch_expressions(): IR.Module {

    const int32_type = create_integer_type(32, true);

    const statements: IR.Statement[] = [
        create_statement(
            IR.create_switch_expression(
                IR.create_variable_expression("value"),
                [
                    {
                        case_value: IR.create_constant_expression(int32_type, "0"),
                        statements: [
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "return_value",
                                    false,
                                    IR.create_constant_expression(int32_type, "0")
                                )
                            ),
                            create_statement(
                                IR.create_return_expression(
                                    IR.create_variable_expression("return_value")
                                )
                            )
                        ]
                    }
                ]
            )
        ),
        create_statement(
            IR.create_switch_expression(
                IR.create_variable_expression("value"),
                [
                    {
                        case_value: IR.create_constant_expression(int32_type, "1"),
                        statements: [
                            create_statement(
                                IR.create_return_expression(
                                    IR.create_constant_expression(int32_type, "1")
                                )
                            )
                        ]
                    },
                    {
                        case_value: IR.create_constant_expression(int32_type, "2"),
                        statements: []
                    },
                    {
                        case_value: IR.create_constant_expression(int32_type, "3"),
                        statements: [
                            create_statement(
                                IR.create_return_expression(
                                    IR.create_constant_expression(int32_type, "2")
                                )
                            )
                        ]
                    },
                    {
                        case_value: IR.create_constant_expression(int32_type, "4"),
                        statements: [
                            create_statement(
                                IR.create_break_expression(0)
                            )
                        ]
                    },
                    {
                        case_value: IR.create_constant_expression(int32_type, "5"),
                        statements: []
                    },
                    {
                        case_value: undefined,
                        statements: [
                            create_statement(
                                IR.create_return_expression(
                                    IR.create_constant_expression(int32_type, "3")
                                )
                            )
                        ]
                    },
                ],
            )
        ),
        create_statement(
            IR.create_switch_expression(
                IR.create_variable_expression("value"),
                [
                    {
                        case_value: undefined,
                        statements: []
                    },
                    {
                        case_value: IR.create_constant_expression(int32_type, "6"),
                        statements: [
                            create_statement(
                                IR.create_return_expression(
                                    IR.create_constant_expression(int32_type, "4")
                                )
                            )
                        ]
                    },
                ]
            )
        ),
        create_statement(
            IR.create_return_expression(
                IR.create_constant_expression(int32_type, "5")
            )
        ),
    ];

    return {
        name: "Switch_expressions",
        imports: [],
        declarations: [
            {
                name: "run_switch",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "run_switch",
                        type: {
                            input_parameter_types: [int32_type],
                            output_parameter_types: [int32_type],
                            is_variadic: false,
                        },
                        input_parameter_names: ["value"],
                        output_parameter_names: ["result"],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "run_switch",
                        statements: statements
                    }
                }
            }
        ]
    };
}

export function create_ternary_condition_expressions(): IR.Module {

    const bool_type = create_fundamental_type(IR.Fundamental_type.Bool);
    const int32_type = create_integer_type(32, true);

    const statements: IR.Statement[] = [
        create_statement(
            IR.create_variable_declaration_expression("a", false,
                IR.create_ternary_condition_expression(
                    IR.create_variable_expression("first_boolean"),
                    IR.create_constant_expression(int32_type, "1"),
                    IR.create_constant_expression(int32_type, "0")
                )
            )
        ),
        create_statement(
            IR.create_variable_declaration_expression("b", false,
                IR.create_ternary_condition_expression(
                    IR.create_binary_expression(
                        IR.create_variable_expression("first_boolean"),
                        IR.create_constant_expression(bool_type, "false"),
                        IR.Binary_operation.Equal
                    ),
                    IR.create_constant_expression(int32_type, "1"),
                    IR.create_constant_expression(int32_type, "0")
                )
            )
        ),
        create_statement(
            IR.create_variable_declaration_expression("c", false,
                IR.create_ternary_condition_expression(
                    IR.create_unary_expression(
                        IR.create_variable_expression("first_boolean"),
                        IR.Unary_operation.Not
                    ),
                    IR.create_constant_expression(int32_type, "1"),
                    IR.create_constant_expression(int32_type, "0")
                )
            )
        ),
        create_statement(
            IR.create_variable_declaration_expression("d", false,
                IR.create_ternary_condition_expression(
                    IR.create_variable_expression("first_boolean"),
                    IR.create_ternary_condition_expression(
                        IR.create_variable_expression("second_boolean"),
                        IR.create_constant_expression(int32_type, "2"),
                        IR.create_constant_expression(int32_type, "1")
                    ),
                    IR.create_constant_expression(int32_type, "0")
                )
            )
        )
    ];

    return {
        name: "Ternary_condition_expressions",
        imports: [],
        declarations: [
            {
                name: "run_ternary_conditions",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "run_ternary_conditions",
                        type: {
                            input_parameter_types: [bool_type, bool_type],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["first_boolean", "second_boolean"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "run_ternary_conditions",
                        statements: statements
                    }
                }
            }
        ]
    };
}

export function create_while_loop_expressions(): IR.Module {

    const c_string_type = create_pointer_type([create_fundamental_type(IR.Fundamental_type.C_char)], false);
    const int32_type = create_integer_type(32, true);

    const statements: IR.Statement[] = [
        create_statement(
            IR.create_block_expression(
                [
                    create_statement(
                        IR.create_variable_declaration_expression("index", true,
                            IR.create_constant_expression(int32_type, "0")
                        )
                    ),
                    create_statement(
                        IR.create_while_loop_expression(
                            create_statement(
                                IR.create_binary_expression(
                                    IR.create_variable_expression("index"),
                                    IR.create_variable_expression("size"),
                                    IR.Binary_operation.Less_than
                                )
                            ),
                            create_statement(
                                IR.create_block_expression(
                                    [
                                        create_statement(
                                            IR.create_call_expression(
                                                IR.create_variable_expression("print_integer"),
                                                [
                                                    IR.create_variable_expression("index")
                                                ]
                                            )
                                        ),
                                        create_statement(
                                            IR.create_assignment_expression(
                                                IR.create_variable_expression("index"),
                                                IR.create_constant_expression(int32_type, "1"),
                                                IR.Binary_operation.Add
                                            )
                                        ),
                                    ]
                                )
                            )
                        )
                    )
                ]
            )
        ),
        create_statement(
            IR.create_block_expression(
                [
                    create_statement(
                        IR.create_variable_declaration_expression("index", true,
                            IR.create_constant_expression(int32_type, "0")
                        )
                    ),
                    create_statement(
                        IR.create_while_loop_expression(
                            create_statement(
                                IR.create_binary_expression(
                                    IR.create_variable_expression("index"),
                                    IR.create_variable_expression("size"),
                                    IR.Binary_operation.Less_than
                                )
                            ),
                            create_statement(
                                IR.create_block_expression(
                                    [
                                        create_statement(
                                            IR.create_if_expression(
                                                [
                                                    {
                                                        statement: create_statement(
                                                            IR.create_continue_expression()
                                                        ),
                                                        condition: create_statement(
                                                            IR.create_binary_expression(
                                                                IR.create_binary_expression(
                                                                    IR.create_variable_expression("index"),
                                                                    IR.create_constant_expression(int32_type, "2"),
                                                                    IR.Binary_operation.Modulus
                                                                ),
                                                                IR.create_constant_expression(int32_type, "0"),
                                                                IR.Binary_operation.Equal
                                                            )
                                                        )
                                                    }
                                                ]
                                            )
                                        ),
                                        create_statement(
                                            IR.create_if_expression(
                                                [
                                                    {
                                                        statement: create_statement(
                                                            IR.create_break_expression(0)
                                                        ),
                                                        condition: create_statement(
                                                            IR.create_binary_expression(
                                                                IR.create_variable_expression("index"),
                                                                IR.create_constant_expression(int32_type, "5"),
                                                                IR.Binary_operation.Greater_than
                                                            )
                                                        )
                                                    }
                                                ]
                                            )
                                        ),
                                        create_statement(
                                            IR.create_call_expression(
                                                IR.create_variable_expression("print_integer"),
                                                [
                                                    IR.create_variable_expression("index")
                                                ]
                                            )
                                        ),
                                        create_statement(
                                            IR.create_assignment_expression(
                                                IR.create_variable_expression("index"),
                                                IR.create_constant_expression(int32_type, "1"),
                                                IR.Binary_operation.Add
                                            )
                                        ),
                                    ]
                                )
                            )
                        )
                    )
                ]
            )
        )
    ];

    return {
        name: "While_loop_expressions",
        imports: [
            {
                module_name: "C.stdio",
                alias: "stdio",
                usages: ["printf"]
            }
        ],
        declarations: [
            {
                name: "print_integer",
                type: IR.Declaration_type.Function,
                is_export: false,
                value: {
                    declaration: {
                        name: "print_integer",
                        type: {
                            input_parameter_types: [create_integer_type(32, true)],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["value"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.Private
                    },
                    definition: {
                        name: "print_integer",
                        statements: [
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_access_expression(IR.create_variable_expression("stdio"), "printf"),
                                    [
                                        IR.create_constant_expression(c_string_type, "%d"),
                                        IR.create_variable_expression("value")
                                    ]
                                )
                            )
                        ]
                    }
                }
            },
            {
                name: "run_while_loops",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "run_while_loops",
                        type: {
                            input_parameter_types: [int32_type],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["size"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "run_while_loops",
                        statements: statements
                    }
                }
            }
        ]
    };
}

export function create_break_expressions(): IR.Module {

    const c_string_type = create_pointer_type([create_fundamental_type(IR.Fundamental_type.C_char)], false);
    const int32_type = create_integer_type(32, true);

    const statements: IR.Statement[] = [
        create_statement(
            IR.create_for_loop_expression(
                "index",
                IR.create_constant_expression(int32_type, "0"),
                IR.create_variable_expression("size"),
                undefined,
                create_statement(
                    IR.create_block_expression(
                        [
                            create_statement(
                                IR.create_if_expression(
                                    [
                                        {
                                            statement: create_statement(
                                                IR.create_break_expression(0)
                                            ),
                                            condition: create_statement(
                                                IR.create_binary_expression(
                                                    IR.create_variable_expression("index"),
                                                    IR.create_constant_expression(int32_type, "4"),
                                                    IR.Binary_operation.Greater_than
                                                )
                                            )
                                        }
                                    ]
                                )
                            ),
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_variable_expression("print_integer"),
                                    [
                                        IR.create_variable_expression("index")
                                    ]
                                )
                            ),
                        ]
                    )
                )
            )
        ),
        create_statement(
            IR.create_for_loop_expression(
                "index",
                IR.create_constant_expression(int32_type, "0"),
                IR.create_variable_expression("size"),
                undefined,
                create_statement(
                    IR.create_block_expression(
                        [
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "index_2",
                                    true,
                                    IR.create_constant_expression(int32_type, "0")
                                )
                            ),
                            create_statement(
                                IR.create_while_loop_expression(
                                    create_statement(
                                        IR.create_binary_expression(
                                            IR.create_variable_expression("index_2"),
                                            IR.create_variable_expression("size"),
                                            IR.Binary_operation.Less_than
                                        )
                                    ),
                                    create_statement(
                                        IR.create_block_expression(
                                            [
                                                create_statement(
                                                    IR.create_if_expression(
                                                        [
                                                            {
                                                                statement: create_statement(
                                                                    IR.create_break_expression(0)
                                                                ),
                                                                condition: create_statement(
                                                                    IR.create_binary_expression(
                                                                        IR.create_variable_expression("index"),
                                                                        IR.create_constant_expression(int32_type, "3"),
                                                                        IR.Binary_operation.Greater_than
                                                                    )
                                                                )
                                                            }
                                                        ]
                                                    )
                                                ),
                                                create_statement(
                                                    IR.create_call_expression(
                                                        IR.create_variable_expression("print_integer"),
                                                        [
                                                            IR.create_variable_expression("index_2")
                                                        ]
                                                    )
                                                ),
                                                create_statement(
                                                    IR.create_assignment_expression(
                                                        IR.create_variable_expression("index"),
                                                        IR.create_constant_expression(int32_type, "1"),
                                                        IR.Binary_operation.Add
                                                    )
                                                )
                                            ]
                                        )
                                    )
                                )
                            ),
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_variable_expression("print_integer"),
                                    [
                                        IR.create_variable_expression("index")
                                    ]
                                )
                            ),
                        ]
                    )
                )
            )
        ),
        create_statement(
            IR.create_for_loop_expression(
                "index",
                IR.create_constant_expression(int32_type, "0"),
                IR.create_variable_expression("size"),
                undefined,
                create_statement(
                    IR.create_block_expression(
                        [
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "index_2",
                                    true,
                                    IR.create_constant_expression(int32_type, "0")
                                )
                            ),
                            create_statement(
                                IR.create_while_loop_expression(
                                    create_statement(
                                        IR.create_binary_expression(
                                            IR.create_variable_expression("index_2"),
                                            IR.create_variable_expression("size"),
                                            IR.Binary_operation.Less_than
                                        )
                                    ),
                                    create_statement(
                                        IR.create_block_expression(
                                            [
                                                create_statement(
                                                    IR.create_if_expression(
                                                        [
                                                            {
                                                                statement: create_statement(
                                                                    IR.create_break_expression(2)
                                                                ),
                                                                condition: create_statement(
                                                                    IR.create_binary_expression(
                                                                        IR.create_variable_expression("index"),
                                                                        IR.create_constant_expression(int32_type, "3"),
                                                                        IR.Binary_operation.Greater_than
                                                                    )
                                                                )
                                                            }
                                                        ]
                                                    )
                                                ),
                                                create_statement(
                                                    IR.create_call_expression(
                                                        IR.create_variable_expression("print_integer"),
                                                        [
                                                            IR.create_variable_expression("index_2")
                                                        ]
                                                    )
                                                ),
                                                create_statement(
                                                    IR.create_assignment_expression(
                                                        IR.create_variable_expression("index"),
                                                        IR.create_constant_expression(int32_type, "1"),
                                                        IR.Binary_operation.Add
                                                    )
                                                )
                                            ]
                                        )
                                    )
                                )
                            ),
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_variable_expression("print_integer"),
                                    [
                                        IR.create_variable_expression("index")
                                    ]
                                )
                            ),
                        ]
                    )
                )
            )
        )
    ];

    return {
        name: "Break_expressions",
        imports: [
            {
                module_name: "C.stdio",
                alias: "stdio",
                usages: ["printf"]
            }
        ],
        declarations: [
            {
                name: "print_integer",
                type: IR.Declaration_type.Function,
                is_export: false,
                value: {
                    declaration: {
                        name: "print_integer",
                        type: {
                            input_parameter_types: [create_integer_type(32, true)],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["value"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.Private
                    },
                    definition: {
                        name: "print_integer",
                        statements: [
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_access_expression(IR.create_variable_expression("stdio"), "printf"),
                                    [
                                        IR.create_constant_expression(c_string_type, "%d"),
                                        IR.create_variable_expression("value")
                                    ]
                                )
                            )
                        ]
                    }
                }
            },
            {
                name: "run_breaks",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "run_breaks",
                        type: {
                            input_parameter_types: [int32_type],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["size"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "run_breaks",
                        statements: statements
                    }
                }
            }
        ]
    };
}

function create_custom_type_reference(module_name: string, name: string): IR.Type_reference {
    return {
        data: {
            type: IR.Type_reference_enum.Custom_type_reference,
            value: {
                module_reference: {
                    name: module_name
                },
                name: name
            }
        }
    };
}

function create_integer_type(number_of_bits: number, is_signed: boolean): IR.Type_reference {
    return {
        data: {
            type: IR.Type_reference_enum.Integer_type,
            value: {
                number_of_bits: number_of_bits,
                is_signed: is_signed
            }
        }
    };
}

function create_fundamental_type(fundamental_type: IR.Fundamental_type): IR.Type_reference {
    return {
        data: {
            type: IR.Type_reference_enum.Fundamental_type,
            value: fundamental_type
        }
    };
}

function create_pointer_type(element_type: IR.Type_reference[], is_mutable: boolean): IR.Type_reference {
    return {
        data: {
            type: IR.Type_reference_enum.Pointer_type,
            value: {
                element_type: element_type,
                is_mutable: is_mutable
            }
        }
    };
}

function create_statement(expression: IR.Expression): IR.Statement {
    return {
        name: "",
        expression: expression
    };
}
