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
                                            }
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
