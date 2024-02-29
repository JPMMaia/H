import * as core from "./Core_interface";
import * as Core_intermediate_representation from "./Core_intermediate_representation";
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

export function create_function_calling_module_function_example(): core.Module {
    const module = create_empty();
    module.name = "function_calling_module_function_example";
    module.dependencies.alias_imports = {
        size: 1,
        elements: [
            {
                module_name: "C.stdio",
                alias: "stdio",
                usages: {
                    size: 1,
                    elements: ["printf"]
                }
            }
        ]
    };
    module.export_declarations.function_declarations = {
        size: 1,
        elements: [
            {
                name: "My_function",
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
                                            type: core.Expression_enum.Call_expression,
                                            value: {
                                                module_reference: {
                                                    name: "stdio"
                                                },
                                                function_name: "printf",
                                                arguments: {
                                                    size: 1,
                                                    elements: [
                                                        { expression_index: 1 }
                                                    ]
                                                }
                                            },
                                        },
                                    },
                                    {
                                        data: {
                                            type: core.Expression_enum.Constant_expression,
                                            value: {
                                                type: {
                                                    data: {
                                                        type: core.Type_reference_enum.Pointer_type,
                                                        value: {
                                                            element_type: {
                                                                size: 1,
                                                                elements: [
                                                                    {
                                                                        data: {
                                                                            type: core.Type_reference_enum.Fundamental_type,
                                                                            value: core.Fundamental_type.C_char
                                                                        }
                                                                    }
                                                                ]
                                                            },
                                                            is_mutable: false
                                                        }
                                                    }
                                                },
                                                data: "Hello world!"
                                            },
                                        },
                                    },
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

export function create_hello_world(): Core_intermediate_representation.Module {
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
                type: Core_intermediate_representation.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "main",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [{
                                data: {
                                    type: Core_intermediate_representation.Type_reference_enum.Integer_type,
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
                        linkage: Core_intermediate_representation.Linkage.External
                    },
                    definition: {
                        name: "main",
                        statements: [
                            {
                                name: "",
                                expression: {
                                    data: {
                                        type: Core_intermediate_representation.Expression_enum.Call_expression,
                                        value: {
                                            module_reference: {
                                                name: "stdio"
                                            },
                                            function_name: "puts",
                                            arguments: [
                                                {
                                                    data: {
                                                        type: Core_intermediate_representation.Expression_enum.Constant_expression,
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
                                            ]
                                        }
                                    }
                                }
                            },
                            {
                                name: "",
                                expression: {
                                    data: {
                                        type: Core_intermediate_representation.Expression_enum.Return_expression,
                                        value: {
                                            expression: {
                                                data: {
                                                    type: Core_intermediate_representation.Expression_enum.Constant_expression,
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

export function create_variables(): Core_intermediate_representation.Module {
    return {
        name: "Variables",
        imports: [],
        declarations: [
            {
                name: "main",
                type: Core_intermediate_representation.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "main",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [{
                                data: {
                                    type: Core_intermediate_representation.Type_reference_enum.Integer_type,
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
                        linkage: Core_intermediate_representation.Linkage.External
                    },
                    definition: {
                        name: "main",
                        statements: [
                            {
                                name: "",
                                expression: {
                                    data: {
                                        type: Core_intermediate_representation.Expression_enum.Variable_declaration_expression,
                                        value: {
                                            name: "my_constant_variable",
                                            is_mutable: false,
                                            right_hand_side: {
                                                data: {
                                                    type: Core_intermediate_representation.Expression_enum.Constant_expression,
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
                                        type: Core_intermediate_representation.Expression_enum.Variable_declaration_expression,
                                        value: {
                                            name: "my_mutable_variable",
                                            is_mutable: true,
                                            right_hand_side: {
                                                data: {
                                                    type: Core_intermediate_representation.Expression_enum.Constant_expression,
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
                                        type: Core_intermediate_representation.Expression_enum.Assignment_expression,
                                        value: {
                                            left_hand_side: {
                                                data: {
                                                    type: Core_intermediate_representation.Expression_enum.Variable_expression,
                                                    value: {
                                                        name: "my_mutable_variable"
                                                    }
                                                }
                                            },
                                            right_hand_side: {
                                                data: {
                                                    type: Core_intermediate_representation.Expression_enum.Constant_expression,
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
                                        type: Core_intermediate_representation.Expression_enum.Return_expression,
                                        value: {
                                            expression: {
                                                data: {
                                                    type: Core_intermediate_representation.Expression_enum.Constant_expression,
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

export function create_numbers(): Core_intermediate_representation.Module {

    const constant_expressions: [string, Core_intermediate_representation.Expression][] = [
        ["my_int8", create_constant_expression(create_integer_type(8, true), "1")],
        ["my_int16", create_constant_expression(create_integer_type(16, true), "1")],
        ["my_int32", create_constant_expression(create_integer_type(32, true), "1")],
        ["my_int64", create_constant_expression(create_integer_type(64, true), "1")],
        ["my_uint8", create_constant_expression(create_integer_type(8, false), "1")],
        ["my_uint16", create_constant_expression(create_integer_type(16, false), "1")],
        ["my_uint32", create_constant_expression(create_integer_type(32, false), "1")],
        ["my_uint64", create_constant_expression(create_integer_type(64, false), "1")],
        ["my_float16", create_constant_expression(create_fundamental_type(Core_intermediate_representation.Fundamental_type.Float16), "1.0")],
        ["my_float32", create_constant_expression(create_fundamental_type(Core_intermediate_representation.Fundamental_type.Float32), "1.0")],
        ["my_float64", create_constant_expression(create_fundamental_type(Core_intermediate_representation.Fundamental_type.Float64), "1.0")],
    ];

    const statements: Core_intermediate_representation.Statement[] = [];

    for (const constant_expression of constant_expressions) {
        const statement: Core_intermediate_representation.Statement = {
            name: "",
            expression: {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Variable_declaration_expression,
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
                type: Core_intermediate_representation.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "main",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [{
                                data: {
                                    type: Core_intermediate_representation.Type_reference_enum.Integer_type,
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
                        linkage: Core_intermediate_representation.Linkage.External
                    },
                    definition: {
                        name: "main",
                        statements: [
                            ...statements,
                            {
                                name: "",
                                expression: {
                                    data: {
                                        type: Core_intermediate_representation.Expression_enum.Return_expression,
                                        value: {
                                            expression: {
                                                data: {
                                                    type: Core_intermediate_representation.Expression_enum.Constant_expression,
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

export function create_numeric_casts(): Core_intermediate_representation.Module {

    const constant_expressions: [string, Core_intermediate_representation.Expression][] = [
        ["i64_to_i8", create_numeric_cast_expression(create_constant_expression(create_integer_type(64, true), "1"), create_integer_type(8, true))],
        ["i64_to_i16", create_numeric_cast_expression(create_constant_expression(create_integer_type(64, true), "1"), create_integer_type(16, true))],
        ["i64_to_i32", create_numeric_cast_expression(create_constant_expression(create_integer_type(64, true), "1"), create_integer_type(32, true))],

        ["u64_to_u8", create_numeric_cast_expression(create_constant_expression(create_integer_type(64, false), "1"), create_integer_type(8, false))],
        ["u64_to_u16", create_numeric_cast_expression(create_constant_expression(create_integer_type(64, false), "1"), create_integer_type(16, false))],
        ["u64_to_u32", create_numeric_cast_expression(create_constant_expression(create_integer_type(64, false), "1"), create_integer_type(32, false))],

        ["i8_to_i16", create_numeric_cast_expression(create_constant_expression(create_integer_type(8, true), "1"), create_integer_type(16, true))],
        ["u8_to_u16", create_numeric_cast_expression(create_constant_expression(create_integer_type(8, false), "1"), create_integer_type(16, false))],

        ["i32_to_u32", create_numeric_cast_expression(create_constant_expression(create_integer_type(32, true), "1"), create_integer_type(32, false))],
        ["u32_to_i32", create_numeric_cast_expression(create_constant_expression(create_integer_type(32, false), "1"), create_integer_type(32, true))],

        ["i32_to_f16", create_numeric_cast_expression(create_constant_expression(create_integer_type(32, true), "1"), create_fundamental_type(Core_intermediate_representation.Fundamental_type.Float16))],
        ["i32_to_f32", create_numeric_cast_expression(create_constant_expression(create_integer_type(32, true), "1"), create_fundamental_type(Core_intermediate_representation.Fundamental_type.Float32))],
        ["i32_to_f64", create_numeric_cast_expression(create_constant_expression(create_integer_type(32, true), "1"), create_fundamental_type(Core_intermediate_representation.Fundamental_type.Float64))],

        ["f16_to_i32", create_numeric_cast_expression(create_constant_expression(create_fundamental_type(Core_intermediate_representation.Fundamental_type.Float16), "1.0"), create_integer_type(32, true))],
        ["f32_to_i32", create_numeric_cast_expression(create_constant_expression(create_fundamental_type(Core_intermediate_representation.Fundamental_type.Float32), "1.0"), create_integer_type(32, true))],
        ["f64_to_i32", create_numeric_cast_expression(create_constant_expression(create_fundamental_type(Core_intermediate_representation.Fundamental_type.Float64), "1.0"), create_integer_type(32, true))],
    ];

    const statements: Core_intermediate_representation.Statement[] = [];

    for (const constant_expression of constant_expressions) {
        const statement: Core_intermediate_representation.Statement = {
            name: "",
            expression: {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Variable_declaration_expression,
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
                type: Core_intermediate_representation.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "main",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [{
                                data: {
                                    type: Core_intermediate_representation.Type_reference_enum.Integer_type,
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
                        linkage: Core_intermediate_representation.Linkage.External
                    },
                    definition: {
                        name: "main",
                        statements: [
                            ...statements,
                            {
                                name: "",
                                expression: {
                                    data: {
                                        type: Core_intermediate_representation.Expression_enum.Return_expression,
                                        value: {
                                            expression: {
                                                data: {
                                                    type: Core_intermediate_representation.Expression_enum.Constant_expression,
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

export function create_booleans(): Core_intermediate_representation.Module {

    const constant_expressions: [string, Core_intermediate_representation.Expression][] = [
        ["my_true_boolean", create_constant_expression(create_fundamental_type(Core_intermediate_representation.Fundamental_type.Bool), "true")],
        ["my_false_boolean", create_constant_expression(create_fundamental_type(Core_intermediate_representation.Fundamental_type.Bool), "false")]
    ];

    const statements: Core_intermediate_representation.Statement[] = [];

    for (const constant_expression of constant_expressions) {
        const statement: Core_intermediate_representation.Statement = {
            name: "",
            expression: {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Variable_declaration_expression,
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
                type: Core_intermediate_representation.Declaration_type.Function,
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
                        linkage: Core_intermediate_representation.Linkage.External
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

export function create_binary_expressions(): Core_intermediate_representation.Module {

    const binary_expressions: [string, Core_intermediate_representation.Expression][] = [
        ["add", create_binary_expression(create_variable_expression("first_integer"), create_variable_expression("second_integer"), Core_intermediate_representation.Binary_operation.Add)],
        ["subtract", create_binary_expression(create_variable_expression("first_integer"), create_variable_expression("second_integer"), Core_intermediate_representation.Binary_operation.Subtract)],
        ["multiply", create_binary_expression(create_variable_expression("first_integer"), create_variable_expression("second_integer"), Core_intermediate_representation.Binary_operation.Multiply)],
        ["divide", create_binary_expression(create_variable_expression("first_integer"), create_variable_expression("second_integer"), Core_intermediate_representation.Binary_operation.Divide)],
        ["modulus", create_binary_expression(create_variable_expression("first_integer"), create_variable_expression("second_integer"), Core_intermediate_representation.Binary_operation.Modulus)],
        ["equal", create_binary_expression(create_variable_expression("first_integer"), create_variable_expression("second_integer"), Core_intermediate_representation.Binary_operation.Equal)],
        ["not_equal", create_binary_expression(create_variable_expression("first_integer"), create_variable_expression("second_integer"), Core_intermediate_representation.Binary_operation.Not_equal)],
        ["less_than", create_binary_expression(create_variable_expression("first_integer"), create_variable_expression("second_integer"), Core_intermediate_representation.Binary_operation.Less_than)],
        ["less_than_or_equal_to", create_binary_expression(create_variable_expression("first_integer"), create_variable_expression("second_integer"), Core_intermediate_representation.Binary_operation.Less_than_or_equal_to)],
        ["greater_than", create_binary_expression(create_variable_expression("first_integer"), create_variable_expression("second_integer"), Core_intermediate_representation.Binary_operation.Greater_than)],
        ["greater_than_or_equal_to", create_binary_expression(create_variable_expression("first_integer"), create_variable_expression("second_integer"), Core_intermediate_representation.Binary_operation.Greater_than_or_equal_to)],
        ["logical_and", create_binary_expression(create_variable_expression("first_boolean"), create_variable_expression("second_boolean"), Core_intermediate_representation.Binary_operation.Logical_and)],
        ["logical_or", create_binary_expression(create_variable_expression("first_boolean"), create_variable_expression("second_boolean"), Core_intermediate_representation.Binary_operation.Logical_or)],
        ["bitwise_and", create_binary_expression(create_variable_expression("first_integer"), create_variable_expression("second_integer"), Core_intermediate_representation.Binary_operation.Bitwise_and)],
        ["bitwise_or", create_binary_expression(create_variable_expression("first_integer"), create_variable_expression("second_integer"), Core_intermediate_representation.Binary_operation.Bitwise_or)],
        ["bitwise_xor", create_binary_expression(create_variable_expression("first_integer"), create_variable_expression("second_integer"), Core_intermediate_representation.Binary_operation.Bitwise_xor)],
        ["bit_shift_left", create_binary_expression(create_variable_expression("first_integer"), create_variable_expression("second_integer"), Core_intermediate_representation.Binary_operation.Bit_shift_left)],
        ["bit_shift_right", create_binary_expression(create_variable_expression("first_integer"), create_variable_expression("second_integer"), Core_intermediate_representation.Binary_operation.Bit_shift_right)],
    ];

    const statements: Core_intermediate_representation.Statement[] = [];

    for (const binary_expression of binary_expressions) {
        const statement: Core_intermediate_representation.Statement = {
            name: "",
            expression: {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Variable_declaration_expression,
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
                type: Core_intermediate_representation.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "foo",
                        type: {
                            input_parameter_types: [create_integer_type(32, true), create_integer_type(32, true), create_fundamental_type(Core_intermediate_representation.Fundamental_type.Bool), create_fundamental_type(Core_intermediate_representation.Fundamental_type.Bool)],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["first_integer", "second_integer", "first_boolean", "second_boolean"],
                        output_parameter_names: [],
                        linkage: Core_intermediate_representation.Linkage.External
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

export function create_binary_expressions_operator_precedence(): Core_intermediate_representation.Module {

    const a = create_variable_expression("a");
    const b = create_variable_expression("b");
    const c = create_variable_expression("c");
    const function_call = create_call_expression("", "function_call", []);
    const value_0 = create_constant_expression(create_integer_type(32, true), "0");
    const value_1 = create_constant_expression(create_integer_type(32, true), "1");

    const binary_expressions: [string, Core_intermediate_representation.Expression][] = [
        ["case_1", create_binary_expression(a, create_binary_expression(b, c, Core_intermediate_representation.Binary_operation.Multiply), Core_intermediate_representation.Binary_operation.Add)],
        ["case_2", create_binary_expression(create_binary_expression(a, b, Core_intermediate_representation.Binary_operation.Multiply), c, Core_intermediate_representation.Binary_operation.Add)],
        ["case_3", create_binary_expression(create_binary_expression(a, b, Core_intermediate_representation.Binary_operation.Divide), c, Core_intermediate_representation.Binary_operation.Multiply)],
        ["case_4", create_binary_expression(create_binary_expression(a, b, Core_intermediate_representation.Binary_operation.Multiply), c, Core_intermediate_representation.Binary_operation.Divide)],

        ["case_5", create_binary_expression(create_binary_expression(a, function_call, Core_intermediate_representation.Binary_operation.Multiply), b, Core_intermediate_representation.Binary_operation.Add)],
        ["case_6", create_binary_expression(create_unary_expression(a, Core_intermediate_representation.Unary_operation.Indirection), create_unary_expression(b, Core_intermediate_representation.Unary_operation.Indirection), Core_intermediate_representation.Binary_operation.Multiply)],

        ["case_7", create_binary_expression(create_parenthesis_expression(create_binary_expression(a, b, Core_intermediate_representation.Binary_operation.Add)), c, Core_intermediate_representation.Binary_operation.Multiply)],
        ["case_8", create_binary_expression(a, create_parenthesis_expression(create_binary_expression(b, c, Core_intermediate_representation.Binary_operation.Add)), Core_intermediate_representation.Binary_operation.Multiply)],

        ["case_9", create_binary_expression(create_binary_expression(a, value_0, Core_intermediate_representation.Binary_operation.Equal), create_binary_expression(b, value_1, Core_intermediate_representation.Binary_operation.Equal), Core_intermediate_representation.Binary_operation.Logical_and)],
        ["case_10", create_binary_expression(create_parenthesis_expression(create_binary_expression(a, b, Core_intermediate_representation.Binary_operation.Bitwise_and)), create_parenthesis_expression(create_binary_expression(b, a, Core_intermediate_representation.Binary_operation.Bitwise_and)), Core_intermediate_representation.Binary_operation.Equal)],
        ["case_11", create_binary_expression(create_binary_expression(a, b, Core_intermediate_representation.Binary_operation.Less_than), create_binary_expression(b, c, Core_intermediate_representation.Binary_operation.Less_than), Core_intermediate_representation.Binary_operation.Logical_and)],
        ["case_12", create_binary_expression(create_binary_expression(a, b, Core_intermediate_representation.Binary_operation.Add), create_binary_expression(b, c, Core_intermediate_representation.Binary_operation.Add), Core_intermediate_representation.Binary_operation.Equal)],
    ];

    const statements: Core_intermediate_representation.Statement[] = [];

    for (const binary_expression of binary_expressions) {
        const statement: Core_intermediate_representation.Statement = {
            name: "",
            expression: {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Variable_declaration_expression,
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
                type: Core_intermediate_representation.Declaration_type.Function,
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
                        linkage: Core_intermediate_representation.Linkage.External
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

export function create_assignment_expressions(): Core_intermediate_representation.Module {

    const expressions: Core_intermediate_representation.Expression[] = [
        create_variable_declaration_expression("my_integer", true, create_constant_expression(create_integer_type(32, true), "1")),
        create_assignment_expression(create_variable_expression("my_integer"), create_constant_expression(create_integer_type(32, true), "2")),
        create_assignment_expression(create_variable_expression("my_integer"), create_variable_expression("other_integer"), Core_intermediate_representation.Binary_operation.Add),
        create_assignment_expression(create_variable_expression("my_integer"), create_variable_expression("other_integer"), Core_intermediate_representation.Binary_operation.Subtract),
        create_assignment_expression(create_variable_expression("my_integer"), create_variable_expression("other_integer"), Core_intermediate_representation.Binary_operation.Multiply),
        create_assignment_expression(create_variable_expression("my_integer"), create_variable_expression("other_integer"), Core_intermediate_representation.Binary_operation.Divide),
        create_assignment_expression(create_variable_expression("my_integer"), create_variable_expression("other_integer"), Core_intermediate_representation.Binary_operation.Modulus),
        create_assignment_expression(create_variable_expression("my_integer"), create_variable_expression("other_integer"), Core_intermediate_representation.Binary_operation.Bitwise_and),
        create_assignment_expression(create_variable_expression("my_integer"), create_variable_expression("other_integer"), Core_intermediate_representation.Binary_operation.Bitwise_or),
        create_assignment_expression(create_variable_expression("my_integer"), create_variable_expression("other_integer"), Core_intermediate_representation.Binary_operation.Bitwise_xor),
        create_assignment_expression(create_variable_expression("my_integer"), create_variable_expression("other_integer"), Core_intermediate_representation.Binary_operation.Bit_shift_left),
        create_assignment_expression(create_variable_expression("my_integer"), create_variable_expression("other_integer"), Core_intermediate_representation.Binary_operation.Bit_shift_right),
    ];

    const statements: Core_intermediate_representation.Statement[] = [];

    for (const binary_expression of expressions) {
        const statement: Core_intermediate_representation.Statement = {
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
                type: Core_intermediate_representation.Declaration_type.Function,
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
                        linkage: Core_intermediate_representation.Linkage.External
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

export function create_unary_expressions(): Core_intermediate_representation.Module {

    const unary_expressions: [string, Core_intermediate_representation.Expression][] = [
        ["not_variable", create_unary_expression(create_variable_expression("my_boolean"), Core_intermediate_representation.Unary_operation.Not)],
        ["bitwise_not_variable", create_unary_expression(create_variable_expression("my_integer"), Core_intermediate_representation.Unary_operation.Bitwise_not)],
        ["minus_variable", create_unary_expression(create_variable_expression("my_integer"), Core_intermediate_representation.Unary_operation.Minus)],
        ["pre_increment_variable", create_unary_expression(create_variable_expression("my_integer"), Core_intermediate_representation.Unary_operation.Pre_increment)],
        ["post_increment_variable", create_unary_expression(create_variable_expression("my_integer"), Core_intermediate_representation.Unary_operation.Post_increment)],
        ["pre_decrement_variable", create_unary_expression(create_variable_expression("my_integer"), Core_intermediate_representation.Unary_operation.Pre_decrement)],
        ["post_decrement_variable", create_unary_expression(create_variable_expression("my_integer"), Core_intermediate_representation.Unary_operation.Post_decrement)],
        ["address_of_variable", create_unary_expression(create_variable_expression("my_integer"), Core_intermediate_representation.Unary_operation.Address_of)],
        ["indirection_variable", create_unary_expression(create_variable_expression("address_of_variable"), Core_intermediate_representation.Unary_operation.Indirection)]
    ];

    const statements: Core_intermediate_representation.Statement[] = [];

    for (const unary_expression of unary_expressions) {
        const statement: Core_intermediate_representation.Statement = {
            name: "",
            expression: {
                data: {
                    type: Core_intermediate_representation.Expression_enum.Variable_declaration_expression,
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
                type: Core_intermediate_representation.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "foo",
                        type: {
                            input_parameter_types: [create_integer_type(32, true), create_fundamental_type(Core_intermediate_representation.Fundamental_type.Bool)],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["my_integer", "my_boolean"],
                        output_parameter_names: [],
                        linkage: Core_intermediate_representation.Linkage.External
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

function create_integer_type(number_of_bits: number, is_signed: boolean): Core_intermediate_representation.Type_reference {
    return {
        data: {
            type: Core_intermediate_representation.Type_reference_enum.Integer_type,
            value: {
                number_of_bits: number_of_bits,
                is_signed: is_signed
            }
        }
    };
}

function create_fundamental_type(fundamental_type: Core_intermediate_representation.Fundamental_type): Core_intermediate_representation.Type_reference {
    return {
        data: {
            type: Core_intermediate_representation.Type_reference_enum.Fundamental_type,
            value: fundamental_type
        }
    };
}

function create_assignment_expression(left_hand_side: Core_intermediate_representation.Expression, right_hand_side: Core_intermediate_representation.Expression, additional_operation?: Core_intermediate_representation.Binary_operation): Core_intermediate_representation.Expression {
    const assignment_expression: Core_intermediate_representation.Assignment_expression = {
        left_hand_side: left_hand_side,
        right_hand_side: right_hand_side,
        additional_operation: additional_operation
    };
    return {
        data: {
            type: Core_intermediate_representation.Expression_enum.Assignment_expression,
            value: assignment_expression
        }
    };
}

function create_binary_expression(left_hand_side: Core_intermediate_representation.Expression, right_hand_side: Core_intermediate_representation.Expression, operation: Core_intermediate_representation.Binary_operation): Core_intermediate_representation.Expression {
    const binary_expression: Core_intermediate_representation.Binary_expression = {
        left_hand_side: left_hand_side,
        right_hand_side: right_hand_side,
        operation: operation
    };
    return {
        data: {
            type: Core_intermediate_representation.Expression_enum.Binary_expression,
            value: binary_expression
        }
    };
}

function create_call_expression(module_name: string, function_name: string, function_arguments: Core_intermediate_representation.Expression[]): Core_intermediate_representation.Expression {
    const call_expression: Core_intermediate_representation.Call_expression = {
        module_reference: {
            name: module_name
        },
        function_name: function_name,
        arguments: function_arguments
    };
    return {
        data: {
            type: Core_intermediate_representation.Expression_enum.Call_expression,
            value: call_expression
        }
    };
}

function create_constant_expression(type: Core_intermediate_representation.Type_reference, data: string): Core_intermediate_representation.Expression {
    const constant_expression: Core_intermediate_representation.Constant_expression = {
        type: type,
        data: data
    };
    return {
        data: {
            type: Core_intermediate_representation.Expression_enum.Constant_expression,
            value: constant_expression
        }
    };
}

function create_numeric_cast_expression(source: Core_intermediate_representation.Expression, destination_type: Core_intermediate_representation.Type_reference): Core_intermediate_representation.Expression {
    const cast_expression: Core_intermediate_representation.Cast_expression = {
        source: source,
        destination_type: destination_type,
        cast_type: Core_intermediate_representation.Cast_type.Numeric
    };
    return {
        data: {
            type: Core_intermediate_representation.Expression_enum.Cast_expression,
            value: cast_expression
        }
    };
}

function create_parenthesis_expression(expression: Core_intermediate_representation.Expression): Core_intermediate_representation.Expression {
    const parenthesis_expression: Core_intermediate_representation.Parenthesis_expression = {
        expression: expression
    };
    return {
        data: {
            type: Core_intermediate_representation.Expression_enum.Parenthesis_expression,
            value: parenthesis_expression
        }
    };
}

function create_unary_expression(expression: Core_intermediate_representation.Expression, operation: Core_intermediate_representation.Unary_operation): Core_intermediate_representation.Expression {
    const unary_expression: Core_intermediate_representation.Unary_expression = {
        expression: expression,
        operation: operation
    };
    return {
        data: {
            type: Core_intermediate_representation.Expression_enum.Unary_expression,
            value: unary_expression
        }
    };
}

function create_variable_declaration_expression(variable_name: string, is_mutable: boolean, right_hand_side: Core_intermediate_representation.Expression): Core_intermediate_representation.Expression {
    const variable_declaration_expression: Core_intermediate_representation.Variable_declaration_expression = {
        name: variable_name,
        is_mutable: is_mutable,
        right_hand_side: right_hand_side
    };
    return {
        data: {
            type: Core_intermediate_representation.Expression_enum.Variable_declaration_expression,
            value: variable_declaration_expression
        }
    };
}

function create_variable_expression(variable_name: string): Core_intermediate_representation.Expression {
    const variable_expression: Core_intermediate_representation.Variable_expression = {
        name: variable_name
    };
    return {
        data: {
            type: Core_intermediate_representation.Expression_enum.Variable_expression,
            value: variable_expression
        }
    };
}
