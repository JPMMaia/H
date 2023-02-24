import * as core from "../utilities/coreModelInterface";
import * as core_reflection from "../utilities/coreModel";

export function create_empty(): core.Module {
    const reflection_info = core_reflection.createReflectionInfo();
    const module = core_reflection.createEmptyModule(reflection_info);
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
        export_declarations: {
            alias_type_declarations: {
                size: 1,
                elements: [
                    {
                        id: 0,
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
                        id: 10,
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
                        id: 20,
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
                        id: 30,
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
                        input_parameter_ids: { size: 2, elements: [0, 1] },
                        input_parameter_names: { size: 2, elements: ["lhs", "rhs"] },
                        output_parameter_ids: { size: 1, elements: [0] },
                        output_parameter_names: { size: 1, elements: ["result"] },
                        linkage: core.Linkage.External,
                    },
                    {
                        id: 31,
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
                        input_parameter_ids: { size: 2, elements: [0, 1] },
                        input_parameter_names: { size: 2, elements: ["lhs", "rhs"] },
                        output_parameter_ids: { size: 1, elements: [0] },
                        output_parameter_names: { size: 1, elements: ["result"] },
                        linkage: core.Linkage.External,
                    },
                    {
                        id: 32,
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
                        input_parameter_ids: { size: 2, elements: [0, 1] },
                        input_parameter_names: { size: 2, elements: ["lhs", "rhs"] },
                        output_parameter_ids: { size: 1, elements: [0] },
                        output_parameter_names: { size: 1, elements: ["result"] },
                        linkage: core.Linkage.External,
                    },
                    {
                        id: 33,
                        name: "Empty_function",
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
                        input_parameter_ids: { size: 2, elements: [0, 1] },
                        input_parameter_names: { size: 2, elements: ["lhs", "rhs"] },
                        output_parameter_ids: { size: 1, elements: [0] },
                        output_parameter_names: { size: 1, elements: ["result"] },
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
                        id: 100,
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
                        id: 110,
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
                        id: 120,
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
                        id: 130,
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
                        input_parameter_ids: { size: 2, elements: [0, 1] },
                        input_parameter_names: { size: 2, elements: ["lhs", "rhs"] },
                        output_parameter_ids: { size: 1, elements: [0] },
                        output_parameter_names: { size: 1, elements: ["result"] },
                        linkage: core.Linkage.External,
                    },
                ]
            }
        },
        next_unique_id: 200,
        definitions: {
            function_definitions: {
                size: 4,
                elements: [
                    {
                        id: 30,
                        statements: {
                            size: 1,
                            elements: [
                                {
                                    id: 0,
                                    name: "var_0",
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
                                                        type: core.Variable_expression_type.Function_argument,
                                                        id: 0
                                                    }
                                                }
                                            },
                                            {
                                                data: {
                                                    type: core.Expression_enum.Variable_expression,
                                                    value: {
                                                        type: core.Variable_expression_type.Function_argument,
                                                        id: 1
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
                        id: 31,
                        statements: {
                            size: 1,
                            elements: [
                                {
                                    id: 0,
                                    name: "var_0",
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
                                                        type: core.Variable_expression_type.Function_argument,
                                                        id: 0
                                                    }
                                                }
                                            },
                                            {
                                                data: {
                                                    type: core.Expression_enum.Variable_expression,
                                                    value: {
                                                        type: core.Variable_expression_type.Function_argument,
                                                        id: 1
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
                        id: 32,
                        statements: {
                            size: 1,
                            elements: [
                                {
                                    id: 0,
                                    name: "var_0",
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
                                                        type: core.Variable_expression_type.Function_argument,
                                                        id: 0
                                                    }
                                                }
                                            },
                                            {
                                                data: {
                                                    type: core.Expression_enum.Variable_expression,
                                                    value: {
                                                        type: core.Variable_expression_type.Function_argument,
                                                        id: 1
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
                        id: 33,
                        statements: {
                            size: 0,
                            elements: [],
                        },
                    },
                    {
                        id: 130,
                        statements: {
                            size: 1,
                            elements: [
                                {
                                    id: 0,
                                    name: "var_0",
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
                                                        type: core.Variable_expression_type.Function_argument,
                                                        id: 0
                                                    }
                                                }
                                            },
                                            {
                                                data: {
                                                    type: core.Expression_enum.Variable_expression,
                                                    value: {
                                                        type: core.Variable_expression_type.Function_argument,
                                                        id: 1
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
