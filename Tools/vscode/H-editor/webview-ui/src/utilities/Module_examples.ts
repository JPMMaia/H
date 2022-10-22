import * as core from "../../../src/utilities/coreModelInterface";

export function create_default(): core.Module {

    const module: core.Module =
    {
        language_version: { major: 1, minor: 2, patch: 3 },
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
                size: 3,
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
                                        size: 2,
                                        elements: [
                                            {
                                                data: {
                                                    type: core.Expression_enum.Binary_expression,
                                                    value: {
                                                        left_hand_side: { type: core.Variable_expression_type.Function_argument, id: 0 },
                                                        right_hand_side: { type: core.Variable_expression_type.Function_argument, id: 1 },
                                                        operation: core.Binary_operation.Add,
                                                    },
                                                },
                                            },
                                            {
                                                data: {
                                                    type: core.Expression_enum.Return_expression,
                                                    value: { variable: { type: core.Variable_expression_type.Temporary, id: 0 } },
                                                },
                                            },
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
                                        size: 2,
                                        elements: [
                                            {
                                                data: {
                                                    type: core.Expression_enum.Binary_expression,
                                                    value: {
                                                        left_hand_side: { type: core.Variable_expression_type.Function_argument, id: 0 },
                                                        right_hand_side: { type: core.Variable_expression_type.Function_argument, id: 1 },
                                                        operation: core.Binary_operation.Add,
                                                    },
                                                },
                                            },
                                            {
                                                data: {
                                                    type: core.Expression_enum.Return_expression,
                                                    value: { variable: { type: core.Variable_expression_type.Temporary, id: 0 } },
                                                },
                                            },
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
                                        size: 2,
                                        elements: [
                                            {
                                                data: {
                                                    type: core.Expression_enum.Binary_expression,
                                                    value: {
                                                        left_hand_side: { type: core.Variable_expression_type.Function_argument, id: 0 },
                                                        right_hand_side: { type: core.Variable_expression_type.Function_argument, id: 1 },
                                                        operation: core.Binary_operation.Add,
                                                    },
                                                },
                                            },
                                            {
                                                data: {
                                                    type: core.Expression_enum.Return_expression,
                                                    value: { variable: { type: core.Variable_expression_type.Temporary, id: 0 } },
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
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
                                        size: 2,
                                        elements: [
                                            {
                                                data: {
                                                    type: core.Expression_enum.Binary_expression,
                                                    value: {
                                                        left_hand_side: { type: core.Variable_expression_type.Function_argument, id: 0 },
                                                        right_hand_side: { type: core.Variable_expression_type.Function_argument, id: 1 },
                                                        operation: core.Binary_operation.Add,
                                                    },
                                                },
                                            },
                                            {
                                                data: {
                                                    type: core.Expression_enum.Return_expression,
                                                    value: { variable: { type: core.Variable_expression_type.Temporary, id: 0 } },
                                                },
                                            },
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