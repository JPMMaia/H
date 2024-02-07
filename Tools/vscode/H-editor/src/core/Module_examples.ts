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
            { module_name: "C.Standard_library", alias: "Cstl" }
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
                                                    name: "Cstl"
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
                                                type: core.Fundamental_type.String,
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
            module_name: "C.Standard_library",
            alias: "Cstl"
        },
        {
            module_name: "My_library",
            alias: "ml"
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
                module_name: "C.Standard_library",
                alias: "Cstl"
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
                                                name: "Cstl"
                                            },
                                            function_name: "puts",
                                            arguments: [
                                                {
                                                    data: {
                                                        type: Core_intermediate_representation.Expression_enum.Constant_expression,
                                                        value: {
                                                            type: Core_intermediate_representation.Fundamental_type.String,
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
                                                        type: Core_intermediate_representation.Fundamental_type.String, // TODO
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
