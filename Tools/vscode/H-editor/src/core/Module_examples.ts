import * as IR from "./Core_intermediate_representation";

export function create_empty(): IR.Module {
    return {
        name: "Module",
        imports: [],
        declarations: []
    };
}

export function create_default(): IR.Module {
    return create_0();
}

export function create_0(): IR.Module {

    const int32_type = create_integer_type(32, true);

    const module: IR.Module =
    {
        name: "module_name",
        imports: [],
        declarations: [
            {
                name: "My_float",
                type: IR.Declaration_type.Alias,
                is_export: true,
                value: {
                    name: "My_float",
                    type: [
                        {
                            data: {
                                type: IR.Type_reference_enum.Fundamental_type,
                                value: IR.Fundamental_type.Float32
                            }
                        }
                    ]
                }
            },
            {
                name: "My_enum_0",
                type: IR.Declaration_type.Enum,
                is_export: true,
                value: {
                    name: "My_enum_0",
                    values: [
                        {
                            name: "Value_0",
                            value: create_statement(
                                IR.create_constant_expression(int32_type, "0")
                            )
                        },
                        {
                            name: "Value_1",
                            value: create_statement(
                                IR.create_constant_expression(int32_type, "1")
                            )
                        },
                        {
                            name: "Value_2",
                            value: create_statement(
                                IR.create_constant_expression(int32_type, "2")
                            )
                        }
                    ]
                }
            },
            {
                name: "My_function_0",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "My_function_0",
                        type: {
                            input_parameter_types: [
                                { data: { type: IR.Type_reference_enum.Fundamental_type, value: IR.Fundamental_type.Float32 } },
                                { data: { type: IR.Type_reference_enum.Fundamental_type, value: IR.Fundamental_type.Float32 } },
                            ],
                            output_parameter_types: [
                                { data: { type: IR.Type_reference_enum.Fundamental_type, value: IR.Fundamental_type.Float32 } },
                            ],
                            is_variadic: false,
                        },
                        input_parameter_names: ["lhs", "rhs"],
                        output_parameter_names: ["result"],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "My_function_0",
                        statements: [
                            create_statement(
                                IR.create_return_expression(
                                    IR.create_binary_expression(
                                        IR.create_variable_expression("lhs", IR.Access_type.Read),
                                        IR.create_variable_expression("rhs", IR.Access_type.Read),
                                        IR.Binary_operation.Add
                                    )
                                )
                            )
                        ],
                    }
                }
            },
            {
                name: "My_function_1",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "My_function_1",
                        type: {
                            input_parameter_types: [
                                { data: { type: IR.Type_reference_enum.Fundamental_type, value: IR.Fundamental_type.Float32 } },
                                { data: { type: IR.Type_reference_enum.Fundamental_type, value: IR.Fundamental_type.Float32 } },
                            ],
                            output_parameter_types: [
                                { data: { type: IR.Type_reference_enum.Fundamental_type, value: IR.Fundamental_type.Float32 } },
                            ],
                            is_variadic: false,
                        },
                        input_parameter_names: ["lhs", "rhs"],
                        output_parameter_names: ["result"],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "My_function_1",
                        statements: [
                            create_statement(
                                IR.create_return_expression(
                                    IR.create_binary_expression(
                                        IR.create_variable_expression("lhs", IR.Access_type.Read),
                                        IR.create_variable_expression("rhs", IR.Access_type.Read),
                                        IR.Binary_operation.Add
                                    )
                                )
                            )
                        ]
                    }
                }
            },
            {
                name: "My_function_2",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "My_function_2",
                        type: {
                            input_parameter_types: [
                                { data: { type: IR.Type_reference_enum.Fundamental_type, value: IR.Fundamental_type.Float32 } },
                                { data: { type: IR.Type_reference_enum.Fundamental_type, value: IR.Fundamental_type.Float32 } },
                            ],
                            output_parameter_types: [
                                { data: { type: IR.Type_reference_enum.Fundamental_type, value: IR.Fundamental_type.Float32 } },
                            ],
                            is_variadic: false,
                        },
                        input_parameter_names: ["lhs", "rhs"],
                        output_parameter_names: ["result"],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "My_function_2",
                        statements: [
                            create_statement(
                                IR.create_return_expression(
                                    IR.create_binary_expression(
                                        IR.create_variable_expression("lhs", IR.Access_type.Read),
                                        IR.create_variable_expression("rhs", IR.Access_type.Read),
                                        IR.Binary_operation.Add
                                    )
                                )
                            )
                        ]
                    }
                }
            },
            {
                name: "Empty_function",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "Empty_function",
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
                        name: "Empty_function",
                        statements: []
                    }
                }
            },
            {
                name: "My_struct_0",
                type: IR.Declaration_type.Struct,
                is_export: true,
                value: {
                    name: "My_struct_0",
                    member_types: [
                        {
                            data: {
                                type: IR.Type_reference_enum.Fundamental_type,
                                value: IR.Fundamental_type.Float32
                            }
                        },
                        {
                            data: {
                                type: IR.Type_reference_enum.Fundamental_type,
                                value: IR.Fundamental_type.Float32
                            }
                        },
                        {
                            data: {
                                type: IR.Type_reference_enum.Fundamental_type,
                                value: IR.Fundamental_type.Float32
                            }
                        }
                    ],
                    member_names: [
                        "member_0",
                        "member_1",
                        "member_2"
                    ],
                    member_default_values: [
                        create_statement(
                            IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Float32), "0.0")
                        ),
                        create_statement(
                            IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Float32), "1.0")
                        ),
                        create_statement(
                            IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Float32), "2.0")
                        ),
                    ],
                    is_packed: false,
                    is_literal: false
                }
            },
            {
                name: "My_float",
                type: IR.Declaration_type.Alias,
                is_export: false,
                value: {
                    name: "My_int",
                    type: [
                        int32_type
                    ]
                }
            },
            {
                name: "My_enum_1",
                type: IR.Declaration_type.Enum,
                is_export: false,
                value: {
                    name: "My_enum_1",
                    values: [
                        {
                            name: "Value_0",
                            value: create_statement(
                                IR.create_constant_expression(int32_type, "0")
                            )
                        },
                        {
                            name: "Value_1",
                            value: create_statement(
                                IR.create_constant_expression(int32_type, "1")
                            )
                        },
                        {
                            name: "Value_2",
                            value: create_statement(
                                IR.create_constant_expression(int32_type, "2")
                            )
                        }
                    ]
                }
            },
            {
                name: "My_function_4",
                type: IR.Declaration_type.Function,
                is_export: false,
                value: {
                    declaration: {
                        name: "My_function_4",
                        type: {
                            input_parameter_types: [
                                { data: { type: IR.Type_reference_enum.Fundamental_type, value: IR.Fundamental_type.Float32 } },
                                { data: { type: IR.Type_reference_enum.Fundamental_type, value: IR.Fundamental_type.Float32 } },
                            ],
                            output_parameter_types: [
                                { data: { type: IR.Type_reference_enum.Fundamental_type, value: IR.Fundamental_type.Float32 } },
                            ],
                            is_variadic: false,
                        },
                        input_parameter_names: ["lhs", "rhs"],
                        output_parameter_names: ["result"],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "My_function_4",
                        statements: [
                            create_statement(
                                IR.create_return_expression(
                                    IR.create_binary_expression(
                                        IR.create_variable_expression("lhs", IR.Access_type.Read),
                                        IR.create_variable_expression("rhs", IR.Access_type.Read),
                                        IR.Binary_operation.Add
                                    )
                                )
                            )
                        ]
                    }
                }
            },
            {
                name: "My_struct_1",
                type: IR.Declaration_type.Struct,
                is_export: false,
                value: {
                    name: "My_struct_1",
                    member_types: [
                        {
                            data: {
                                type: IR.Type_reference_enum.Fundamental_type,
                                value: IR.Fundamental_type.Float32
                            }
                        },
                        {
                            data: {
                                type: IR.Type_reference_enum.Fundamental_type,
                                value: IR.Fundamental_type.Float32
                            }
                        },
                        {
                            data: {
                                type: IR.Type_reference_enum.Fundamental_type,
                                value: IR.Fundamental_type.Float32
                            }
                        }
                    ],
                    member_names: [
                        "member_0",
                        "member_1",
                        "member_2"
                    ],
                    member_default_values: [
                        create_statement(
                            IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Float32), "0.0")
                        ),
                        create_statement(
                            IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Float32), "1.0")
                        ),
                        create_statement(
                            IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Float32), "2.0")
                        ),
                    ],
                    is_packed: false,
                    is_literal: false
                }
            },
        ],
    };

    return module;
};

export function create_alias_example(): IR.Module {
    return {
        name: "alias_example",
        imports: [],
        declarations: [
            {
                name: "My_alias",
                type: IR.Declaration_type.Alias,
                is_export: true,
                value: {
                    name: "My_alias",
                    type: [
                        {
                            data: {
                                type: IR.Type_reference_enum.Fundamental_type,
                                value: IR.Fundamental_type.Float32
                            }
                        }
                    ]
                }
            }
        ]
    };
}

export function create_enum_example(): IR.Module {
    const int32_type = create_integer_type(32, true);
    return {
        name: "enum_example",
        imports: [],
        declarations: [
            {
                name: "My_enum",
                type: IR.Declaration_type.Enum,
                is_export: true,
                value: {
                    name: "My_enum",
                    values: [
                        {
                            name: "value_0",
                            value: create_statement(
                                IR.create_constant_expression(int32_type, "0")
                            )
                        },
                        {
                            name: "value_1",
                            value: create_statement(
                                IR.create_constant_expression(int32_type, "1")
                            )
                        },
                        {
                            name: "value_2",
                            value: create_statement(
                                IR.create_constant_expression(int32_type, "2")
                            )
                        }
                    ]
                }
            }
        ]
    };
}

export function create_struct_example(): IR.Module {
    return {
        name: "struct_example",
        imports: [],
        declarations: [
            {
                name: "My_struct",
                type: IR.Declaration_type.Struct,
                is_export: true,
                value: {
                    name: "My_struct",
                    member_types: [
                        {
                            data: {
                                type: IR.Type_reference_enum.Fundamental_type,
                                value: IR.Fundamental_type.Float32
                            }
                        },
                        {
                            data: {
                                type: IR.Type_reference_enum.Fundamental_type,
                                value: IR.Fundamental_type.Float32
                            }
                        },
                        {
                            data: {
                                type: IR.Type_reference_enum.Fundamental_type,
                                value: IR.Fundamental_type.Float32
                            }
                        }
                    ],
                    member_names: [
                        "member_0",
                        "member_1",
                        "member_2"
                    ],
                    member_default_values: [
                        create_statement(
                            IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Float32), "0.0")
                        ),
                        create_statement(
                            IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Float32), "1.0")
                        ),
                        create_statement(
                            IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Float32), "2.0")
                        ),
                    ],
                    is_packed: false,
                    is_literal: false
                }
            }
        ]
    };
}

export function create_union_example(): IR.Module {
    return {
        name: "union_example",
        imports: [],
        declarations: [
            {
                name: "My_union",
                type: IR.Declaration_type.Union,
                is_export: true,
                value: {
                    name: "My_union",
                    member_types: [
                        {
                            data: {
                                type: IR.Type_reference_enum.Fundamental_type,
                                value: IR.Fundamental_type.Float32
                            }
                        },
                        {
                            data: {
                                type: IR.Type_reference_enum.Integer_type,
                                value: {
                                    number_of_bits: 32,
                                    is_signed: true
                                }
                            }
                        }
                    ],
                    member_names: [
                        "member_0",
                        "member_1"
                    ]
                }
            }
        ]
    };
}

export function create_function_example(): IR.Module {
    return {
        name: "function_example",
        imports: [],
        declarations: [
            {
                name: "My_function",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "My_function",
                        type: {
                            input_parameter_types: [
                                { data: { type: IR.Type_reference_enum.Fundamental_type, value: IR.Fundamental_type.Float32 } },
                                { data: { type: IR.Type_reference_enum.Fundamental_type, value: IR.Fundamental_type.Float32 } },
                            ],
                            output_parameter_types: [
                                { data: { type: IR.Type_reference_enum.Fundamental_type, value: IR.Fundamental_type.Float32 } },
                            ],
                            is_variadic: false,
                        },
                        input_parameter_names: ["lhs", "rhs"],
                        output_parameter_names: ["result"],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "My_function",
                        statements: [
                            create_statement(
                                IR.create_return_expression(
                                    IR.create_binary_expression(
                                        IR.create_variable_expression("lhs", IR.Access_type.Read),
                                        IR.create_variable_expression("rhs", IR.Access_type.Read),
                                        IR.Binary_operation.Add
                                    )
                                )
                            )
                        ],
                    }
                }
            }
        ]
    };
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
                        linkage: IR.Linkage.External,
                    },
                    definition: {
                        name: "My_function",
                        statements: [
                            {
                                name: "",
                                expression: IR.create_call_expression(
                                    IR.create_access_expression(IR.create_variable_expression("stdio", IR.Access_type.Read), "printf", IR.Access_type.Read),
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

export function create_module_with_dependencies(): IR.Module {
    return {
        name: "Module_with_dependencies",
        imports: [
            {
                module_name: "C.stdio",
                alias: "stdio",
                usages: []
            },
            {
                module_name: "My_library",
                alias: "ml",
                usages: []
            },
        ],
        declarations: []
    };
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
                                expression: IR.create_call_expression(IR.create_access_expression(IR.create_variable_expression("stdio", IR.Access_type.Read), "puts", IR.Access_type.Read), [
                                    {
                                        data: {
                                            type: IR.Expression_enum.Constant_expression,
                                            value: {
                                                type: {
                                                    data: {
                                                        type: IR.Type_reference_enum.Pointer_type,
                                                        value: {
                                                            element_type: [
                                                                {
                                                                    data: {
                                                                        type: IR.Type_reference_enum.Fundamental_type,
                                                                        value: IR.Fundamental_type.C_char
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
                                                                type: IR.Type_reference_enum.Integer_type,
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
                                                                type: IR.Type_reference_enum.Integer_type,
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
                                                                type: IR.Type_reference_enum.Integer_type,
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
                                                        name: "my_mutable_variable",
                                                        access_type: IR.Access_type.Write
                                                    }
                                                }
                                            },
                                            right_hand_side: {
                                                data: {
                                                    type: IR.Expression_enum.Constant_expression,
                                                    value: {
                                                        type: {
                                                            data: {
                                                                type: IR.Type_reference_enum.Integer_type,
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
                                                                type: IR.Type_reference_enum.Integer_type,
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
                                                                type: IR.Type_reference_enum.Integer_type,
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
                                                                type: IR.Type_reference_enum.Integer_type,
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
        ["add", IR.create_binary_expression(IR.create_variable_expression("first_integer", IR.Access_type.Read), IR.create_variable_expression("second_integer", IR.Access_type.Read), IR.Binary_operation.Add)],
        ["subtract", IR.create_binary_expression(IR.create_variable_expression("first_integer", IR.Access_type.Read), IR.create_variable_expression("second_integer", IR.Access_type.Read), IR.Binary_operation.Subtract)],
        ["multiply", IR.create_binary_expression(IR.create_variable_expression("first_integer", IR.Access_type.Read), IR.create_variable_expression("second_integer", IR.Access_type.Read), IR.Binary_operation.Multiply)],
        ["divide", IR.create_binary_expression(IR.create_variable_expression("first_integer", IR.Access_type.Read), IR.create_variable_expression("second_integer", IR.Access_type.Read), IR.Binary_operation.Divide)],
        ["modulus", IR.create_binary_expression(IR.create_variable_expression("first_integer", IR.Access_type.Read), IR.create_variable_expression("second_integer", IR.Access_type.Read), IR.Binary_operation.Modulus)],
        ["equal", IR.create_binary_expression(IR.create_variable_expression("first_integer", IR.Access_type.Read), IR.create_variable_expression("second_integer", IR.Access_type.Read), IR.Binary_operation.Equal)],
        ["not_equal", IR.create_binary_expression(IR.create_variable_expression("first_integer", IR.Access_type.Read), IR.create_variable_expression("second_integer", IR.Access_type.Read), IR.Binary_operation.Not_equal)],
        ["less_than", IR.create_binary_expression(IR.create_variable_expression("first_integer", IR.Access_type.Read), IR.create_variable_expression("second_integer", IR.Access_type.Read), IR.Binary_operation.Less_than)],
        ["less_than_or_equal_to", IR.create_binary_expression(IR.create_variable_expression("first_integer", IR.Access_type.Read), IR.create_variable_expression("second_integer", IR.Access_type.Read), IR.Binary_operation.Less_than_or_equal_to)],
        ["greater_than", IR.create_binary_expression(IR.create_variable_expression("first_integer", IR.Access_type.Read), IR.create_variable_expression("second_integer", IR.Access_type.Read), IR.Binary_operation.Greater_than)],
        ["greater_than_or_equal_to", IR.create_binary_expression(IR.create_variable_expression("first_integer", IR.Access_type.Read), IR.create_variable_expression("second_integer", IR.Access_type.Read), IR.Binary_operation.Greater_than_or_equal_to)],
        ["logical_and", IR.create_binary_expression(IR.create_variable_expression("first_boolean", IR.Access_type.Read), IR.create_variable_expression("second_boolean", IR.Access_type.Read), IR.Binary_operation.Logical_and)],
        ["logical_or", IR.create_binary_expression(IR.create_variable_expression("first_boolean", IR.Access_type.Read), IR.create_variable_expression("second_boolean", IR.Access_type.Read), IR.Binary_operation.Logical_or)],
        ["bitwise_and", IR.create_binary_expression(IR.create_variable_expression("first_integer", IR.Access_type.Read), IR.create_variable_expression("second_integer", IR.Access_type.Read), IR.Binary_operation.Bitwise_and)],
        ["bitwise_or", IR.create_binary_expression(IR.create_variable_expression("first_integer", IR.Access_type.Read), IR.create_variable_expression("second_integer", IR.Access_type.Read), IR.Binary_operation.Bitwise_or)],
        ["bitwise_xor", IR.create_binary_expression(IR.create_variable_expression("first_integer", IR.Access_type.Read), IR.create_variable_expression("second_integer", IR.Access_type.Read), IR.Binary_operation.Bitwise_xor)],
        ["bit_shift_left", IR.create_binary_expression(IR.create_variable_expression("first_integer", IR.Access_type.Read), IR.create_variable_expression("second_integer", IR.Access_type.Read), IR.Binary_operation.Bit_shift_left)],
        ["bit_shift_right", IR.create_binary_expression(IR.create_variable_expression("first_integer", IR.Access_type.Read), IR.create_variable_expression("second_integer", IR.Access_type.Read), IR.Binary_operation.Bit_shift_right)],
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

    const a = IR.create_variable_expression("a", IR.Access_type.Read);
    const b = IR.create_variable_expression("b", IR.Access_type.Read);
    const c = IR.create_variable_expression("c", IR.Access_type.Read);
    const function_call = IR.create_call_expression(IR.create_variable_expression("function_call", IR.Access_type.Read), []);
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
        IR.create_assignment_expression(IR.create_variable_expression("my_integer", IR.Access_type.Write), IR.create_constant_expression(create_integer_type(32, true), "2"), undefined),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer", IR.Access_type.Read_write), IR.create_variable_expression("other_integer", IR.Access_type.Read), IR.Binary_operation.Add),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer", IR.Access_type.Read_write), IR.create_variable_expression("other_integer", IR.Access_type.Read), IR.Binary_operation.Subtract),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer", IR.Access_type.Read_write), IR.create_variable_expression("other_integer", IR.Access_type.Read), IR.Binary_operation.Multiply),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer", IR.Access_type.Read_write), IR.create_variable_expression("other_integer", IR.Access_type.Read), IR.Binary_operation.Divide),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer", IR.Access_type.Read_write), IR.create_variable_expression("other_integer", IR.Access_type.Read), IR.Binary_operation.Modulus),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer", IR.Access_type.Read_write), IR.create_variable_expression("other_integer", IR.Access_type.Read), IR.Binary_operation.Bitwise_and),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer", IR.Access_type.Read_write), IR.create_variable_expression("other_integer", IR.Access_type.Read), IR.Binary_operation.Bitwise_or),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer", IR.Access_type.Read_write), IR.create_variable_expression("other_integer", IR.Access_type.Read), IR.Binary_operation.Bitwise_xor),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer", IR.Access_type.Read_write), IR.create_variable_expression("other_integer", IR.Access_type.Read), IR.Binary_operation.Bit_shift_left),
        IR.create_assignment_expression(IR.create_variable_expression("my_integer", IR.Access_type.Read_write), IR.create_variable_expression("other_integer", IR.Access_type.Read), IR.Binary_operation.Bit_shift_right),
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
        ["not_variable", IR.create_unary_expression(IR.create_variable_expression("my_boolean", IR.Access_type.Read), IR.Unary_operation.Not)],
        ["bitwise_not_variable", IR.create_unary_expression(IR.create_variable_expression("my_integer", IR.Access_type.Read), IR.Unary_operation.Bitwise_not)],
        ["minus_variable", IR.create_unary_expression(IR.create_variable_expression("my_integer", IR.Access_type.Read), IR.Unary_operation.Minus)],
        ["pre_increment_variable", IR.create_unary_expression(IR.create_variable_expression("my_integer", IR.Access_type.Read_write), IR.Unary_operation.Pre_increment)],
        ["post_increment_variable", IR.create_unary_expression(IR.create_variable_expression("my_integer", IR.Access_type.Read_write), IR.Unary_operation.Post_increment)],
        ["pre_decrement_variable", IR.create_unary_expression(IR.create_variable_expression("my_integer", IR.Access_type.Read_write), IR.Unary_operation.Pre_decrement)],
        ["post_decrement_variable", IR.create_unary_expression(IR.create_variable_expression("my_integer", IR.Access_type.Read_write), IR.Unary_operation.Post_decrement)],
        ["address_of_variable", IR.create_unary_expression(IR.create_variable_expression("my_integer", IR.Access_type.Read), IR.Unary_operation.Address_of)],
        ["indirection_variable", IR.create_unary_expression(IR.create_variable_expression("address_of_variable", IR.Access_type.Read), IR.Unary_operation.Indirection)]
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
        member_default_values: [
            create_statement(
                IR.create_constant_expression(int32_type, "0")
            ),
            create_statement(
                IR.create_null_pointer_expression()
            ),
            create_statement(
                IR.create_null_pointer_expression()
            ),
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
            create_statement(IR.create_variable_declaration_expression("b", false, IR.create_variable_expression("a", IR.Access_type.Read))),
        ])),
        create_statement(IR.create_variable_declaration_expression("b", false, IR.create_variable_expression("a", IR.Access_type.Read))),
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
                create_statement(
                    IR.create_constant_expression(int32_type, "3")
                ),
                IR.Binary_operation.Less_than,
                undefined,
                create_statement(
                    IR.create_block_expression([
                        create_statement(
                            IR.create_call_expression(
                                IR.create_variable_expression("print_integer", IR.Access_type.Read),
                                [IR.create_variable_expression("index", IR.Access_type.Read)]
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
                create_statement(
                    IR.create_constant_expression(int32_type, "3")
                ),
                IR.Binary_operation.Less_than,
                undefined,
                create_statement(
                    IR.create_call_expression(
                        IR.create_variable_expression("print_integer", IR.Access_type.Read),
                        [IR.create_variable_expression("index", IR.Access_type.Read)]
                    )
                )
            )
        ),
        create_statement(
            IR.create_for_loop_expression(
                "index",
                IR.create_constant_expression(int32_type, "0"),
                create_statement(
                    IR.create_constant_expression(int32_type, "4")
                ),
                IR.Binary_operation.Less_than,
                IR.create_constant_expression(int32_type, "1"),
                create_statement(
                    IR.create_block_expression([
                        create_statement(
                            IR.create_call_expression(
                                IR.create_variable_expression("print_integer", IR.Access_type.Read),
                                [IR.create_variable_expression("index", IR.Access_type.Read)]
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
                create_statement(
                    IR.create_constant_expression(int32_type, "0")
                ),
                IR.Binary_operation.Greater_than,
                IR.create_unary_expression(
                    IR.create_constant_expression(int32_type, "1"),
                    IR.Unary_operation.Minus
                ),
                create_statement(
                    IR.create_block_expression([
                        create_statement(
                            IR.create_call_expression(
                                IR.create_variable_expression("print_integer", IR.Access_type.Read),
                                [IR.create_variable_expression("index", IR.Access_type.Read)]
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
                create_statement(
                    IR.create_constant_expression(int32_type, "0")
                ),
                IR.Binary_operation.Greater_than,
                undefined,
                create_statement(
                    IR.create_block_expression([
                        create_statement(
                            IR.create_call_expression(
                                IR.create_variable_expression("print_integer", IR.Access_type.Read),
                                [IR.create_variable_expression("index", IR.Access_type.Read)]
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
                                    IR.create_access_expression(IR.create_variable_expression("stdio", IR.Access_type.Read), "printf", IR.Access_type.Read),
                                    [
                                        IR.create_constant_expression(c_string_type, "%d"),
                                        IR.create_variable_expression("value", IR.Access_type.Read)
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
                                            IR.create_variable_expression("print_message", IR.Access_type.Read),
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
                                IR.create_variable_expression("value", IR.Access_type.Read),
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
                                            IR.create_variable_expression("print_message", IR.Access_type.Read),
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
                                IR.create_variable_expression("value", IR.Access_type.Read),
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
                                            IR.create_variable_expression("print_message", IR.Access_type.Read),
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
                                            IR.create_variable_expression("print_message", IR.Access_type.Read),
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
                                IR.create_variable_expression("value", IR.Access_type.Read),
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
                                            IR.create_variable_expression("print_message", IR.Access_type.Read),
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
                                IR.create_variable_expression("value", IR.Access_type.Read),
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
                                            IR.create_variable_expression("print_message", IR.Access_type.Read),
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
                                IR.create_variable_expression("print_message", IR.Access_type.Read),
                                [
                                    IR.create_constant_expression(c_string_type, "negative")
                                ]
                            )
                        ),
                        condition: create_statement(
                            IR.create_binary_expression(
                                IR.create_variable_expression("value", IR.Access_type.Read),
                                IR.create_constant_expression(int32_type, "0"),
                                IR.Binary_operation.Less_than
                            )
                        )
                    },
                    {
                        statement: create_statement(
                            IR.create_call_expression(
                                IR.create_variable_expression("print_message", IR.Access_type.Read),
                                [
                                    IR.create_constant_expression(c_string_type, "positive")
                                ]
                            )
                        ),
                        condition: create_statement(
                            IR.create_binary_expression(
                                IR.create_variable_expression("value", IR.Access_type.Read),
                                IR.create_constant_expression(int32_type, "0"),
                                IR.Binary_operation.Greater_than
                            )
                        )
                    },
                    {
                        statement: create_statement(
                            IR.create_call_expression(
                                IR.create_variable_expression("print_message", IR.Access_type.Read),
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
                                    IR.create_access_expression(IR.create_variable_expression("stdio", IR.Access_type.Read), "printf", IR.Access_type.Read),
                                    [
                                        IR.create_constant_expression(c_string_type, "%s\n"),
                                        IR.create_variable_expression("message", IR.Access_type.Read)
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
                IR.create_variable_expression("value", IR.Access_type.Read),
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
                                    IR.create_variable_expression("return_value", IR.Access_type.Read)
                                )
                            )
                        ]
                    }
                ]
            )
        ),
        create_statement(
            IR.create_switch_expression(
                IR.create_variable_expression("value", IR.Access_type.Read),
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
                IR.create_variable_expression("value", IR.Access_type.Read),
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
                    IR.create_variable_expression("first_boolean", IR.Access_type.Read),
                    create_statement(
                        IR.create_constant_expression(int32_type, "1")
                    ),
                    create_statement(
                        IR.create_constant_expression(int32_type, "0")
                    )
                )
            )
        ),
        create_statement(
            IR.create_variable_declaration_expression("b", false,
                IR.create_ternary_condition_expression(
                    IR.create_binary_expression(
                        IR.create_variable_expression("first_boolean", IR.Access_type.Read),
                        IR.create_constant_expression(bool_type, "false"),
                        IR.Binary_operation.Equal
                    ),
                    create_statement(
                        IR.create_constant_expression(int32_type, "1")
                    ),
                    create_statement(
                        IR.create_constant_expression(int32_type, "0")
                    )
                )
            )
        ),
        create_statement(
            IR.create_variable_declaration_expression("c", false,
                IR.create_ternary_condition_expression(
                    IR.create_unary_expression(
                        IR.create_variable_expression("first_boolean", IR.Access_type.Read),
                        IR.Unary_operation.Not
                    ),
                    create_statement(
                        IR.create_constant_expression(int32_type, "1")
                    ),
                    create_statement(
                        IR.create_constant_expression(int32_type, "0")
                    )
                )
            )
        ),
        create_statement(
            IR.create_variable_declaration_expression("d", false,
                IR.create_ternary_condition_expression(
                    IR.create_variable_expression("first_boolean", IR.Access_type.Read),
                    create_statement(
                        IR.create_ternary_condition_expression(
                            IR.create_variable_expression("second_boolean", IR.Access_type.Read),
                            create_statement(
                                IR.create_constant_expression(int32_type, "2")
                            ),
                            create_statement(
                                IR.create_constant_expression(int32_type, "1")
                            )
                        )
                    ),
                    create_statement(
                        IR.create_constant_expression(int32_type, "0")
                    )
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
                                    IR.create_variable_expression("index", IR.Access_type.Read),
                                    IR.create_variable_expression("size", IR.Access_type.Read),
                                    IR.Binary_operation.Less_than
                                )
                            ),
                            create_statement(
                                IR.create_block_expression(
                                    [
                                        create_statement(
                                            IR.create_call_expression(
                                                IR.create_variable_expression("print_integer", IR.Access_type.Read),
                                                [
                                                    IR.create_variable_expression("index", IR.Access_type.Read)
                                                ]
                                            )
                                        ),
                                        create_statement(
                                            IR.create_assignment_expression(
                                                IR.create_variable_expression("index", IR.Access_type.Read_write),
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
                                    IR.create_variable_expression("index", IR.Access_type.Read),
                                    IR.create_variable_expression("size", IR.Access_type.Read),
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
                                                                    IR.create_variable_expression("index", IR.Access_type.Read),
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
                                                                IR.create_variable_expression("index", IR.Access_type.Read),
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
                                                IR.create_variable_expression("print_integer", IR.Access_type.Read),
                                                [
                                                    IR.create_variable_expression("index", IR.Access_type.Read)
                                                ]
                                            )
                                        ),
                                        create_statement(
                                            IR.create_assignment_expression(
                                                IR.create_variable_expression("index", IR.Access_type.Read_write),
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
                                    IR.create_access_expression(IR.create_variable_expression("stdio", IR.Access_type.Read), "printf", IR.Access_type.Read),
                                    [
                                        IR.create_constant_expression(c_string_type, "%d"),
                                        IR.create_variable_expression("value", IR.Access_type.Read)
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
                create_statement(
                    IR.create_variable_expression("size", IR.Access_type.Read)
                ),
                IR.Binary_operation.Less_than,
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
                                                    IR.create_variable_expression("index", IR.Access_type.Read),
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
                                    IR.create_variable_expression("print_integer", IR.Access_type.Read),
                                    [
                                        IR.create_variable_expression("index", IR.Access_type.Read)
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
                create_statement(
                    IR.create_variable_expression("size", IR.Access_type.Read)
                ),
                IR.Binary_operation.Less_than,
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
                                            IR.create_variable_expression("index_2", IR.Access_type.Read),
                                            IR.create_variable_expression("size", IR.Access_type.Read),
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
                                                                        IR.create_variable_expression("index", IR.Access_type.Read),
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
                                                        IR.create_variable_expression("print_integer", IR.Access_type.Read),
                                                        [
                                                            IR.create_variable_expression("index_2", IR.Access_type.Read)
                                                        ]
                                                    )
                                                ),
                                                create_statement(
                                                    IR.create_assignment_expression(
                                                        IR.create_variable_expression("index", IR.Access_type.Read_write),
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
                                    IR.create_variable_expression("print_integer", IR.Access_type.Read),
                                    [
                                        IR.create_variable_expression("index", IR.Access_type.Read)
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
                create_statement(
                    IR.create_variable_expression("size", IR.Access_type.Read)
                ),
                IR.Binary_operation.Less_than,
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
                                            IR.create_variable_expression("index_2", IR.Access_type.Read),
                                            IR.create_variable_expression("size", IR.Access_type.Read),
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
                                                                        IR.create_variable_expression("index", IR.Access_type.Read),
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
                                                        IR.create_variable_expression("print_integer", IR.Access_type.Read),
                                                        [
                                                            IR.create_variable_expression("index_2", IR.Access_type.Read)
                                                        ]
                                                    )
                                                ),
                                                create_statement(
                                                    IR.create_assignment_expression(
                                                        IR.create_variable_expression("index", IR.Access_type.Read_write),
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
                                    IR.create_variable_expression("print_integer", IR.Access_type.Read),
                                    [
                                        IR.create_variable_expression("index", IR.Access_type.Read)
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
                                    IR.create_access_expression(IR.create_variable_expression("stdio", IR.Access_type.Read), "printf", IR.Access_type.Read),
                                    [
                                        IR.create_constant_expression(c_string_type, "%d"),
                                        IR.create_variable_expression("value", IR.Access_type.Read)
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

export function create_using_alias(): IR.Module {

    return {
        name: "Alias",
        imports: [],
        declarations: [
            {
                name: "My_int",
                type: IR.Declaration_type.Alias,
                is_export: false,
                value: {
                    name: "My_int",
                    type: [create_integer_type(64, true)]
                }
            },
            {
                name: "use_alias",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "use_alias",
                        type: {
                            input_parameter_types: [create_custom_type_reference("", "My_int")],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["size"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "use_alias",
                        statements: []
                    }
                }
            }
        ]
    };
}

export function create_using_enums(): IR.Module {
    const int32_type = create_integer_type(32, true);
    return {
        name: "Enums",
        imports: [],
        declarations: [
            {
                name: "My_enum",
                type: IR.Declaration_type.Enum,
                is_export: true,
                value: {
                    name: "My_enum",
                    values: [
                        {
                            name: "Value_0",
                            value: create_statement(
                                IR.create_constant_expression(int32_type, "0")
                            )
                        },
                        {
                            name: "Value_1",
                            value: undefined
                        },
                        {
                            name: "Value_2",
                            value: undefined
                        },
                        {
                            name: "Value_10",
                            value: create_statement(
                                IR.create_constant_expression(int32_type, "10")
                            )
                        },
                        {
                            name: "Value_11",
                            value: undefined
                        }
                    ]
                }
            },
            {
                name: "use_enums",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "use_enums",
                        type: {
                            input_parameter_types: [create_custom_type_reference("", "My_enum")],
                            output_parameter_types: [int32_type],
                            is_variadic: false,
                        },
                        input_parameter_names: ["enum_argument"],
                        output_parameter_names: ["result"],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "use_enums",
                        statements: [
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "my_value",
                                    false,
                                    IR.create_access_expression(
                                        IR.create_variable_expression("My_enum", IR.Access_type.Read),
                                        "Value_1",
                                        IR.Access_type.Read
                                    )
                                )
                            ),
                            create_statement(
                                IR.create_switch_expression(
                                    IR.create_variable_expression("enum_argument", IR.Access_type.Read),
                                    [
                                        {
                                            case_value: IR.create_access_expression(
                                                IR.create_variable_expression("My_enum", IR.Access_type.Read),
                                                "Value_0",
                                                IR.Access_type.Read
                                            ),
                                            statements: []
                                        },
                                        {
                                            case_value: IR.create_access_expression(
                                                IR.create_variable_expression("My_enum", IR.Access_type.Read),
                                                "Value_1",
                                                IR.Access_type.Read
                                            ),
                                            statements: []
                                        },
                                        {
                                            case_value: IR.create_access_expression(
                                                IR.create_variable_expression("My_enum", IR.Access_type.Read),
                                                "Value_2",
                                                IR.Access_type.Read
                                            ),
                                            statements: [
                                                create_statement(
                                                    IR.create_return_expression(
                                                        IR.create_constant_expression(int32_type, "0")
                                                    )
                                                )
                                            ]
                                        },
                                        {
                                            case_value: IR.create_access_expression(
                                                IR.create_variable_expression("My_enum", IR.Access_type.Read),
                                                "Value_10",
                                                IR.Access_type.Read
                                            ),
                                            statements: []
                                        },
                                        {
                                            case_value: IR.create_access_expression(
                                                IR.create_variable_expression("My_enum", IR.Access_type.Read),
                                                "Value_11",
                                                IR.Access_type.Read
                                            ),
                                            statements: [
                                                create_statement(
                                                    IR.create_return_expression(
                                                        IR.create_constant_expression(int32_type, "1")
                                                    )
                                                )
                                            ]
                                        }
                                    ]
                                )
                            ),
                            create_statement(
                                IR.create_return_expression(
                                    IR.create_constant_expression(int32_type, "2")
                                )
                            )
                        ]
                    }
                }
            }
        ]
    };
}

export function create_using_enum_flags(): IR.Module {
    const int32_type = create_integer_type(32, true);
    return {
        name: "Enum_flags",
        imports: [],
        declarations: [
            {
                name: "My_enum_flag",
                type: IR.Declaration_type.Enum,
                is_export: true,
                value: {
                    name: "My_enum_flag",
                    values: [
                        {
                            name: "Flag_1",
                            value: create_statement(
                                IR.create_constant_expression(int32_type, "0x01")
                            )
                        },
                        {
                            name: "Flag_2",
                            value: create_statement(
                                IR.create_constant_expression(int32_type, "0x02")
                            )
                        },
                        {
                            name: "Flag_3",
                            value: create_statement(
                                IR.create_constant_expression(int32_type, "0x04")
                            )
                        },
                        {
                            name: "Flag_4",
                            value: create_statement(
                                IR.create_constant_expression(int32_type, "0x08")
                            )
                        }
                    ]
                }
            },
            {
                name: "use_enums",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "use_enums",
                        type: {
                            input_parameter_types: [create_custom_type_reference("", "My_enum_flag")],
                            output_parameter_types: [int32_type],
                            is_variadic: false,
                        },
                        input_parameter_names: ["enum_argument"],
                        output_parameter_names: ["result"],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "use_enums",
                        statements: [
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "a",
                                    false,
                                    IR.create_binary_expression(
                                        IR.create_access_expression(
                                            IR.create_variable_expression("My_enum_flag", IR.Access_type.Read),
                                            "Flag_1",
                                            IR.Access_type.Read
                                        ),
                                        IR.create_access_expression(
                                            IR.create_variable_expression("My_enum_flag", IR.Access_type.Read),
                                            "Flag_2",
                                            IR.Access_type.Read
                                        ),
                                        IR.Binary_operation.Bitwise_or
                                    )
                                )
                            ),
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "b",
                                    false,
                                    IR.create_binary_expression(
                                        IR.create_variable_expression("enum_argument", IR.Access_type.Read),
                                        IR.create_access_expression(
                                            IR.create_variable_expression("My_enum_flag", IR.Access_type.Read),
                                            "Flag_1",
                                            IR.Access_type.Read
                                        ),
                                        IR.Binary_operation.Bitwise_and
                                    )
                                )
                            ),
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "c",
                                    false,
                                    IR.create_binary_expression(
                                        IR.create_variable_expression("enum_argument", IR.Access_type.Read),
                                        IR.create_access_expression(
                                            IR.create_variable_expression("My_enum_flag", IR.Access_type.Read),
                                            "Flag_1",
                                            IR.Access_type.Read
                                        ),
                                        IR.Binary_operation.Bitwise_xor
                                    )
                                )
                            ),
                            create_statement(
                                IR.create_if_expression(
                                    [
                                        {
                                            condition: create_statement(
                                                IR.create_binary_expression(
                                                    IR.create_variable_expression("a", IR.Access_type.Read),
                                                    IR.create_variable_expression("enum_argument", IR.Access_type.Read),
                                                    IR.Binary_operation.Equal
                                                )
                                            ),
                                            statement: create_statement(
                                                IR.create_return_expression(
                                                    IR.create_constant_expression(int32_type, "0")
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
                                            condition: create_statement(
                                                IR.create_binary_expression(
                                                    IR.create_variable_expression("enum_argument", IR.Access_type.Read),
                                                    IR.create_access_expression(
                                                        IR.create_variable_expression("My_enum_flag", IR.Access_type.Read),
                                                        "Flag_1",
                                                        IR.Access_type.Read
                                                    ),
                                                    IR.Binary_operation.Has
                                                )
                                            ),
                                            statement: create_statement(
                                                IR.create_return_expression(
                                                    IR.create_constant_expression(int32_type, "1")
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
                                            condition: create_statement(
                                                IR.create_binary_expression(
                                                    IR.create_variable_expression("enum_argument", IR.Access_type.Read),
                                                    IR.create_access_expression(
                                                        IR.create_variable_expression("My_enum_flag", IR.Access_type.Read),
                                                        "Flag_2",
                                                        IR.Access_type.Read
                                                    ),
                                                    IR.Binary_operation.Has
                                                )
                                            ),
                                            statement: create_statement(
                                                IR.create_return_expression(
                                                    IR.create_constant_expression(int32_type, "2")
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
                                            condition: create_statement(
                                                IR.create_binary_expression(
                                                    IR.create_variable_expression("enum_argument", IR.Access_type.Read),
                                                    IR.create_access_expression(
                                                        IR.create_variable_expression("My_enum_flag", IR.Access_type.Read),
                                                        "Flag_3",
                                                        IR.Access_type.Read
                                                    ),
                                                    IR.Binary_operation.Has
                                                )
                                            ),
                                            statement: create_statement(
                                                IR.create_return_expression(
                                                    IR.create_constant_expression(int32_type, "3")
                                                )
                                            )
                                        }
                                    ]
                                )
                            ),
                            create_statement(
                                IR.create_return_expression(
                                    IR.create_constant_expression(int32_type, "4")
                                )
                            )
                        ]
                    }
                }
            }
        ]
    };
}

export function create_using_structs(): IR.Module {
    const int32_type = create_integer_type(32, true);
    return {
        name: "Structs",
        imports: [],
        declarations: [
            {
                name: "My_struct",
                type: IR.Declaration_type.Struct,
                is_export: true,
                value: {
                    name: "My_struct",
                    member_types: [
                        int32_type,
                        int32_type
                    ],
                    member_names: [
                        "a",
                        "b"
                    ],
                    member_default_values: [
                        create_statement(
                            IR.create_constant_expression(int32_type, "1")
                        ),
                        create_statement(
                            IR.create_constant_expression(int32_type, "2")
                        )
                    ],
                    is_packed: false,
                    is_literal: false
                }
            },
            {
                name: "My_struct_2",
                type: IR.Declaration_type.Struct,
                is_export: true,
                value: {
                    name: "My_struct_2",
                    member_types: [
                        create_custom_type_reference("", "My_struct"),
                        create_custom_type_reference("", "My_struct"),
                        create_custom_type_reference("", "My_struct"),
                    ],
                    member_names: [
                        "a",
                        "b",
                        "c"
                    ],
                    member_default_values: [
                        create_statement(
                            IR.create_instantiate_struct_expression(IR.Instantiate_struct_type.Default, undefined, [])
                        ),
                        create_statement(
                            IR.create_instantiate_struct_expression(IR.Instantiate_struct_type.Default, undefined, [
                                {
                                    member_name: "a",
                                    value: create_statement(
                                        IR.create_constant_expression(int32_type, "2")
                                    )
                                }
                            ])
                        ),
                        create_statement(
                            IR.create_instantiate_struct_expression(IR.Instantiate_struct_type.Default, undefined, [
                                {
                                    member_name: "a",
                                    value: create_statement(
                                        IR.create_constant_expression(int32_type, "3")
                                    )
                                },
                                {
                                    member_name: "b",
                                    value: create_statement(
                                        IR.create_constant_expression(int32_type, "4")
                                    )
                                }
                            ])
                        ),
                    ],
                    is_packed: false,
                    is_literal: false
                }
            },
            {
                name: "use_structs",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "use_structs",
                        type: {
                            input_parameter_types: [create_custom_type_reference("", "My_struct")],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["my_struct"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External
                    },
                    definition: {
                        name: "use_structs",
                        statements: [
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "a",
                                    false,
                                    IR.create_access_expression(
                                        IR.create_variable_expression("my_struct", IR.Access_type.Read),
                                        "a",
                                        IR.Access_type.Read
                                    )
                                )
                            ),
                            create_statement(
                                IR.create_variable_declaration_with_type_expression(
                                    "instance_0",
                                    false,
                                    create_custom_type_reference("", "My_struct"),
                                    create_statement(
                                        IR.create_instantiate_struct_expression(IR.Instantiate_struct_type.Default, undefined, [])
                                    )
                                )
                            ),
                            create_statement(
                                IR.create_variable_declaration_with_type_expression(
                                    "instance_1",
                                    false,
                                    create_custom_type_reference("", "My_struct"),
                                    create_statement(
                                        IR.create_instantiate_struct_expression(IR.Instantiate_struct_type.Default, undefined, [
                                            {
                                                member_name: "b",
                                                value: create_statement(
                                                    IR.create_constant_expression(int32_type, "3")
                                                )
                                            }
                                        ])
                                    )
                                )
                            ),
                            create_statement(
                                IR.create_variable_declaration_with_type_expression(
                                    "instance_2",
                                    false,
                                    create_custom_type_reference("", "My_struct_2"),
                                    create_statement(
                                        IR.create_instantiate_struct_expression(IR.Instantiate_struct_type.Default, undefined, [])
                                    )
                                )
                            ),
                            create_statement(
                                IR.create_variable_declaration_with_type_expression(
                                    "instance_3",
                                    false,
                                    create_custom_type_reference("", "My_struct_2"),
                                    create_statement(
                                        IR.create_instantiate_struct_expression(IR.Instantiate_struct_type.Explicit, undefined, [
                                            {
                                                member_name: "a",
                                                value: create_statement(
                                                    IR.create_instantiate_struct_expression(IR.Instantiate_struct_type.Default, undefined, [])
                                                )
                                            },
                                            {
                                                member_name: "b",
                                                value: create_statement(
                                                    IR.create_instantiate_struct_expression(IR.Instantiate_struct_type.Default, undefined, [])
                                                )
                                            },
                                            {
                                                member_name: "c",
                                                value: create_statement(
                                                    IR.create_instantiate_struct_expression(IR.Instantiate_struct_type.Explicit, undefined, [
                                                        {
                                                            member_name: "a",
                                                            value: create_statement(
                                                                IR.create_constant_expression(int32_type, "0")
                                                            )
                                                        },
                                                        {
                                                            member_name: "b",
                                                            value: create_statement(
                                                                IR.create_constant_expression(int32_type, "1")
                                                            )
                                                        }
                                                    ])
                                                )
                                            }
                                        ])
                                    )
                                )
                            ),
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "nested_b_a",
                                    false,
                                    IR.create_access_expression(
                                        IR.create_access_expression(
                                            IR.create_variable_expression("instance_3", IR.Access_type.Read),
                                            "b",
                                            IR.Access_type.Read
                                        ),
                                        "a",
                                        IR.Access_type.Read
                                    )
                                )
                            ),
                            create_statement(
                                IR.create_variable_declaration_with_type_expression(
                                    "instance_4",
                                    true,
                                    create_custom_type_reference("", "My_struct"),
                                    create_statement(
                                        IR.create_instantiate_struct_expression(IR.Instantiate_struct_type.Default, undefined, [])
                                    )
                                )
                            ),
                            create_statement(
                                IR.create_assignment_expression(
                                    IR.create_access_expression(
                                        IR.create_variable_expression("instance_4", IR.Access_type.Read),
                                        "a",
                                        IR.Access_type.Write
                                    ),
                                    IR.create_constant_expression(int32_type, "0"),
                                    undefined
                                )
                            ),
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "instance_5",
                                    false,
                                    IR.create_instantiate_struct_expression(
                                        IR.Instantiate_struct_type.Default,
                                        create_custom_type_reference("", "My_struct"),
                                        []
                                    )
                                )
                            ),
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_variable_expression("pass_struct", IR.Access_type.Read),
                                    [
                                        IR.create_instantiate_struct_expression(
                                            IR.Instantiate_struct_type.Default,
                                            undefined,
                                            []
                                        )
                                    ]
                                )
                            ),
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "instance_6",
                                    false,
                                    IR.create_call_expression(
                                        IR.create_variable_expression("return_struct", IR.Access_type.Read),
                                        [
                                        ]
                                    )
                                )
                            )
                        ]
                    }
                }
            },
            {
                name: "pass_struct",
                type: IR.Declaration_type.Function,
                is_export: false,
                value: {
                    declaration: {
                        name: "pass_struct",
                        type: {
                            input_parameter_types: [create_custom_type_reference("", "My_struct")],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["my_struct"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.Private
                    },
                    definition: {
                        name: "pass_struct",
                        statements: []
                    }
                }
            },
            {
                name: "return_struct",
                type: IR.Declaration_type.Function,
                is_export: false,
                value: {
                    declaration: {
                        name: "return_struct",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [create_custom_type_reference("", "My_struct")],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: ["my_struct"],
                        linkage: IR.Linkage.Private
                    },
                    definition: {
                        name: "return_struct",
                        statements: [
                            create_statement(
                                IR.create_return_expression(
                                    IR.create_instantiate_struct_expression(
                                        IR.Instantiate_struct_type.Default,
                                        undefined,
                                        []
                                    )
                                )
                            )
                        ]
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
