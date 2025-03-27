import * as IR from "./Core_intermediate_representation";
import * as Type_utilities from "./Type_utilities";

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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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
                    is_literal: false,
                    member_comments: []
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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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
                    is_literal: false,
                    member_comments: []
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

export function create_global_variables_example(): IR.Module {
    return {
        name: "global_variables_example",
        imports: [],
        declarations: [
            {
                name: "My_global_variable_0",
                type: IR.Declaration_type.Global_variable,
                is_export: true,
                value: {
                    name: "My_global_variable_0",
                    initial_value: create_statement(
                        IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Float32), "1.0")
                    ),
                    is_mutable: false,
                } as IR.Global_variable_declaration
            },
            {
                name: "My_global_variable_1",
                type: IR.Declaration_type.Global_variable,
                is_export: true,
                value: {
                    name: "My_global_variable_1",
                    initial_value: create_statement(
                        IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Float32), "1.0")
                    ),
                    is_mutable: true,
                } as IR.Global_variable_declaration
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
                    is_literal: false,
                    member_comments: []
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
                    ],
                    member_comments: []
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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "My_function",
                        statements: [
                            {
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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "main",
                        statements: [
                            {
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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "main",
                        statements: [
                            {
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
        ["my_c_char", IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.C_char), "1")],
        ["my_c_short", IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.C_short), "1")],
        ["my_c_int", IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.C_int), "1")],
        ["my_c_long", IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.C_long), "1")],
        ["my_c_longlong", IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.C_longlong), "1")],
        ["my_c_uchar", IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.C_uchar), "1")],
        ["my_c_ushort", IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.C_ushort), "1")],
        ["my_c_uint", IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.C_uint), "1")],
        ["my_c_ulong", IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.C_ulong), "1")],
        ["my_c_ulonglong", IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.C_ulonglong), "1")],
        ["my_c_bool", IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.C_bool), "1")],
    ];

    const statements: IR.Statement[] = [];

    for (const constant_expression of constant_expressions) {
        const statement: IR.Statement = {
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

    // add_source_locations(statements, { line: 5, column: 5 }, [3, 7, 10]);

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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "main",
                        statements: [
                            ...statements,
                            {
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

        ["i32_to_flags", IR.create_cast_expression(IR.create_constant_expression(create_integer_type(32, true), "1"), create_custom_type_reference("Module_a", "Flags"), IR.Cast_type.Numeric)],
        ["flags_to_i32", IR.create_cast_expression(IR.create_access_expression(IR.create_variable_expression("module_a", IR.Access_type.Read), "Flags", IR.Access_type.Read), create_integer_type(32, true), IR.Cast_type.Numeric)],
    ];

    const statements: IR.Statement[] = [];

    for (const constant_expression of constant_expressions) {
        const statement: IR.Statement = {
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

    // add_newlines(statements, [2, 5, 7, 9, 12, 15]);

    return {
        name: "Numeric_casts",
        imports: [
            {
                module_name: "Module_a",
                alias: "module_a",
                usages: [
                    "Flags"
                ]
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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "main",
                        statements: [
                            ...statements,
                            {
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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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

    // add_newlines(statements, [4, 6, 10, 12]);

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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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

    // add_newlines(statements, [3, 5, 7, 11]);

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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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

export function create_defer_expressions(): IR.Module {

    const int32_type = create_integer_type(32, true);

    const statements: IR.Statement[] = [
        create_statement(
            IR.create_variable_declaration_expression("instance_0", false, IR.create_call_expression(IR.create_variable_expression("create_object", IR.Access_type.Read), []))
        ),
        create_statement(
            IR.create_defer_expression(IR.create_call_expression(IR.create_variable_expression("destroy", IR.Access_type.Read), [
                IR.create_variable_expression("instance_0", IR.Access_type.Read)
            ]))
        ),
    ];

    return {
        name: "Defer_expressions",
        imports: [],
        declarations: [
            {
                name: "create_object",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "create_object",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [int32_type],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: ["id"],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "create_object",
                        statements: [
                            create_statement(
                                IR.create_return_expression(
                                    IR.create_constant_expression(int32_type, "0")
                                )
                            ),
                        ]
                    }
                }
            },
            {
                name: "destroy_object",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "destroy_object",
                        type: {
                            input_parameter_types: [int32_type],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["id"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "destroy_object",
                        statements: [
                        ]
                    }
                }
            },
            {
                name: "run",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "run",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "run",
                        statements: [
                            ...statements
                        ]
                    }
                }
            },
        ]
    };
}

export function create_dereference_and_access_expressions(): IR.Module {

    const int32_type = create_integer_type(32, true);

    const struct_declaration: IR.Declaration = {
        name: "My_struct",
        type: IR.Declaration_type.Struct,
        is_export: false,
        value: {
            name: "My_struct",
            member_names: ["a"],
            member_types: [int32_type],
            member_default_values: [
                create_statement(
                    IR.create_constant_expression(int32_type, "0")
                ),
            ],
            is_packed: false,
            is_literal: false,
            member_comments: []
        }
    };

    const function_declaration: IR.Declaration = {
        name: "run",
        type: IR.Declaration_type.Function,
        is_export: true,
        value: {
            declaration: {
                name: "run",
                type: {
                    input_parameter_types: [],
                    output_parameter_types: [],
                    is_variadic: false,
                },
                input_parameter_names: [],
                output_parameter_names: [],
                linkage: IR.Linkage.External,
                preconditions: [],
                postconditions: [],
            },
            definition: {
                name: "run",
                statements: [
                    create_statement(
                        IR.create_variable_declaration_with_type_expression(
                            "instance",
                            false,
                            create_custom_type_reference("Dereference_and_access", "My_struct"),
                            create_statement(
                                IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, [])
                            )
                        )
                    ),
                    create_statement(
                        IR.create_variable_declaration_expression(
                            "pointer",
                            false,
                            IR.create_unary_expression(IR.create_variable_expression("instance", IR.Access_type.Read), IR.Unary_operation.Address_of)
                        )
                    ),
                    create_statement(
                        IR.create_variable_declaration_expression(
                            "a",
                            false,
                            IR.create_dereference_and_access_expression(
                                IR.create_variable_expression("pointer", IR.Access_type.Read),
                                "a"
                            )
                        )
                    ),
                ]
            }
        }
    };

    return {
        name: "Dereference_and_access",
        imports: [],
        declarations: [
            struct_declaration,
            function_declaration
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
            expression: binary_expression
        };
        statements.push(statement);
    }

    // add_newlines(statements, [0, 1, 6]);

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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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

export function create_constant_array_expressions(): IR.Module {

    const int32_type = create_integer_type(32, true);

    const constant_array_0_type = create_constant_array_type([int32_type], 0);
    const constant_array_1_type = create_constant_array_type([int32_type], 4);

    const expressions: IR.Expression[] = [
        IR.create_variable_declaration_with_type_expression("a", false, constant_array_0_type, create_statement(IR.create_constant_array_expression([]))),
        IR.create_variable_declaration_with_type_expression("b", false, constant_array_1_type, create_statement(
            IR.create_constant_array_expression([
                create_statement(IR.create_constant_expression(int32_type, "0")),
                create_statement(IR.create_constant_expression(int32_type, "1")),
                create_statement(IR.create_constant_expression(int32_type, "2")),
                create_statement(IR.create_constant_expression(int32_type, "3")),
            ]))
        ),
        IR.create_assignment_expression(
            IR.create_access_array_expression(IR.create_variable_expression("a", IR.Access_type.Read), IR.create_constant_expression(int32_type, "0")),
            IR.create_constant_expression(int32_type, "0"),
            undefined
        ),
        IR.create_assignment_expression(
            IR.create_access_array_expression(IR.create_variable_expression("a", IR.Access_type.Read), IR.create_constant_expression(int32_type, "1")),
            IR.create_constant_expression(int32_type, "1"),
            undefined
        ),
        IR.create_variable_declaration_expression("c", false,
            IR.create_access_array_expression(IR.create_variable_expression("b", IR.Access_type.Read), IR.create_constant_expression(int32_type, "3")),
        ),
    ];

    const statements: IR.Statement[] = [];

    for (const binary_expression of expressions) {
        const statement: IR.Statement = {
            expression: binary_expression
        };
        statements.push(statement);
    }

    return {
        name: "Constant_array_expressions",
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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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

export function create_function_pointer_types(): IR.Module {

    const int32_type = create_integer_type(32, true);

    const struct_declaration: IR.Declaration = {
        name: "My_struct",
        type: IR.Declaration_type.Struct,
        is_export: false,
        value: {
            name: "My_struct",
            member_names: [
                "a", "b"
            ],
            member_types: [
                create_function_pointer_type(
                    create_function_type(
                        [int32_type, int32_type],
                        [int32_type],
                        false
                    ),
                    ["lhs", "rhs"],
                    ["result"],
                ),
                create_function_pointer_type(
                    create_function_type(
                        [int32_type],
                        [],
                        true
                    ),
                    ["first"],
                    [],
                ),
            ],
            member_default_values: [
                create_statement(
                    IR.create_null_pointer_expression()
                ),
                create_statement(
                    IR.create_null_pointer_expression()
                ),
            ],
            is_packed: false,
            is_literal: false,
            member_comments: []
        }
    };

    const add_function: IR.Declaration = {
        name: "add",
        type: IR.Declaration_type.Function,
        is_export: false,
        value: {
            declaration: {
                name: "add",
                type: {
                    input_parameter_types: [int32_type, int32_type],
                    output_parameter_types: [int32_type],
                    is_variadic: false,
                },
                input_parameter_names: ["lhs", "rhs"],
                output_parameter_names: ["result"],
                linkage: IR.Linkage.Private,
                preconditions: [],
                postconditions: [],
            },
            definition: {
                name: "add",
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
    };

    const run_function: IR.Declaration = {
        name: "run",
        type: IR.Declaration_type.Function,
        is_export: true,
        value: {
            declaration: {
                name: "run",
                type: {
                    input_parameter_types: [],
                    output_parameter_types: [],
                    is_variadic: false,
                },
                input_parameter_names: [],
                output_parameter_names: [],
                linkage: IR.Linkage.External,
                preconditions: [],
                postconditions: [],
            },
            definition: {
                name: "run",
                statements: [
                    create_statement(
                        IR.create_variable_declaration_expression(
                            "a", false, IR.create_variable_expression("add", IR.Access_type.Read)
                        )
                    ),
                    create_statement(
                        IR.create_variable_declaration_with_type_expression(
                            "b", false, create_custom_type_reference("Function_pointer_types", "My_struct"),
                            create_statement(
                                IR.create_instantiate_expression(
                                    IR.Instantiate_expression_type.Default,
                                    [
                                        {
                                            member_name: "a",
                                            value: create_statement(
                                                IR.create_variable_expression("add", IR.Access_type.Read)
                                            )
                                        }
                                    ]
                                ),
                            )
                        )
                    )
                ]
            }
        }
    };

    return {
        name: "Function_pointer_types",
        imports: [],
        declarations: [
            struct_declaration,
            add_function,
            run_function
        ]
    };
}

export function create_unary_expressions(): IR.Module {

    const unary_expressions: [string, IR.Expression][] = [
        ["not_variable", IR.create_unary_expression(IR.create_variable_expression("my_boolean", IR.Access_type.Read), IR.Unary_operation.Not)],
        ["bitwise_not_variable", IR.create_unary_expression(IR.create_variable_expression("my_integer", IR.Access_type.Read), IR.Unary_operation.Bitwise_not)],
        ["minus_variable", IR.create_unary_expression(IR.create_variable_expression("my_integer", IR.Access_type.Read), IR.Unary_operation.Minus)],
        ["address_of_variable", IR.create_unary_expression(IR.create_variable_expression("my_integer", IR.Access_type.Read), IR.Unary_operation.Address_of)],
        ["indirection_variable", IR.create_unary_expression(IR.create_variable_expression("address_of_variable", IR.Access_type.Read), IR.Unary_operation.Indirection)]
    ];

    const statements: IR.Statement[] = [];

    for (const unary_expression of unary_expressions) {
        const statement: IR.Statement = {
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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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
        type: [create_pointer_type([create_custom_type_reference("C.stdio", "FILE")], true)]
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
            create_pointer_type([create_custom_type_reference("C.stdio", "FILE")], true)
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
        is_literal: false,
        member_comments: []
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
        ["file_stream", create_pointer_type([create_custom_type_reference("C.stdio", "FILE")], true)]
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
                linkage: IR.Linkage.External,
                preconditions: [],
                postconditions: [],
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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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
                [
                    create_statement(
                        IR.create_call_expression(
                            IR.create_variable_expression("print_integer", IR.Access_type.Read),
                            [IR.create_variable_expression("index", IR.Access_type.Read)]
                        )
                    )
                ]
            ),
            //2
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
                [
                    create_statement(
                        IR.create_call_expression(
                            IR.create_variable_expression("print_integer", IR.Access_type.Read),
                            [IR.create_variable_expression("index", IR.Access_type.Read)]
                        )
                    )
                ]
            ),
            //2
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
                [
                    create_statement(
                        IR.create_call_expression(
                            IR.create_variable_expression("print_integer", IR.Access_type.Read),
                            [IR.create_variable_expression("index", IR.Access_type.Read)]
                        )
                    )
                ]
            ),
            //2
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
                [
                    create_statement(
                        IR.create_call_expression(
                            IR.create_variable_expression("print_integer", IR.Access_type.Read),
                            [IR.create_variable_expression("index", IR.Access_type.Read)]
                        )
                    )
                ]
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
                        linkage: IR.Linkage.Private,
                        preconditions: [],
                        postconditions: [],
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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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

export function create_if_expressions(add_source_locations: boolean): IR.Module {

    const c_string_type = create_pointer_type([create_fundamental_type(IR.Fundamental_type.C_char)], false);
    const int32_type = create_integer_type(32, true);

    const statements: IR.Statement[] = [
        create_statement(
            IR.create_if_expression(
                [
                    {
                        condition: create_statement(
                            IR.create_binary_expression(
                                IR.create_variable_expression("value", IR.Access_type.Read),
                                IR.create_constant_expression(int32_type, "0"),
                                IR.Binary_operation.Equal
                            ),
                            add_source_locations ? { line: 12, column: 8 } : undefined
                        ),
                        then_statements: [
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_variable_expression("print_message", IR.Access_type.Read),
                                    [
                                        IR.create_constant_expression(c_string_type, "zero")
                                    ]
                                ),
                                add_source_locations ? { line: 14, column: 9 } : undefined
                            )
                        ]
                    }
                ]
            ),
            add_source_locations ? { line: 12, column: 5 } : undefined
        ),
        create_statement(
            IR.create_if_expression(
                [
                    {
                        condition: create_statement(
                            IR.create_binary_expression(
                                IR.create_variable_expression("value", IR.Access_type.Read),
                                IR.create_constant_expression(int32_type, "0"),
                                IR.Binary_operation.Equal
                            ),
                            add_source_locations ? { line: 17, column: 8 } : undefined
                        ),
                        then_statements: [
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_variable_expression("print_message", IR.Access_type.Read),
                                    [
                                        IR.create_constant_expression(c_string_type, "zero")
                                    ]
                                ),
                                add_source_locations ? { line: 19, column: 9 } : undefined
                            ),
                        ]
                    },
                    {
                        condition: create_statement(
                            IR.create_binary_expression(
                                IR.create_variable_expression("value", IR.Access_type.Read),
                                IR.create_constant_expression(int32_type, "1"),
                                IR.Binary_operation.Equal
                            ),
                            add_source_locations ? { line: 21, column: 13 } : undefined
                        ),
                        then_statements: [
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_variable_expression("print_message", IR.Access_type.Read),
                                    [
                                        IR.create_constant_expression(c_string_type, "one")
                                    ]
                                ),
                                add_source_locations ? { line: 23, column: 9 } : undefined
                            )
                        ]
                    }
                ]
            ),
            add_source_locations ? { line: 17, column: 5 } : undefined
        ),
        create_statement(
            IR.create_if_expression(
                [
                    {
                        condition: create_statement(
                            IR.create_binary_expression(
                                IR.create_variable_expression("value", IR.Access_type.Read),
                                IR.create_constant_expression(int32_type, "0"),
                                IR.Binary_operation.Less_than
                            ),
                            add_source_locations ? { line: 26, column: 8 } : undefined
                        ),
                        then_statements: [
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_variable_expression("print_message", IR.Access_type.Read),
                                    [
                                        IR.create_constant_expression(c_string_type, "negative")
                                    ]
                                ),
                                add_source_locations ? { line: 28, column: 9 } : undefined
                            )
                        ]
                    },
                    {
                        condition: undefined,
                        then_statements: [
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_variable_expression("print_message", IR.Access_type.Read),
                                    [
                                        IR.create_constant_expression(c_string_type, "non-negative")
                                    ]
                                ),
                                add_source_locations ? { line: 32, column: 9 } : undefined
                            )
                        ]
                    }
                ]
            ),
            add_source_locations ? { line: 26, column: 5 } : undefined
        ),
        create_statement(
            IR.create_if_expression(
                [
                    {
                        condition: create_statement(
                            IR.create_binary_expression(
                                IR.create_variable_expression("value", IR.Access_type.Read),
                                IR.create_constant_expression(int32_type, "0"),
                                IR.Binary_operation.Less_than
                            ),
                            add_source_locations ? { line: 35, column: 8 } : undefined
                        ),
                        then_statements: [
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_variable_expression("print_message", IR.Access_type.Read),
                                    [
                                        IR.create_constant_expression(c_string_type, "negative")
                                    ]
                                ),
                                add_source_locations ? { line: 37, column: 9 } : undefined
                            )
                        ]
                    },
                    {
                        condition: create_statement(
                            IR.create_binary_expression(
                                IR.create_variable_expression("value", IR.Access_type.Read),
                                IR.create_constant_expression(int32_type, "0"),
                                IR.Binary_operation.Greater_than
                            ),
                            add_source_locations ? { line: 39, column: 13 } : undefined
                        ),
                        then_statements: [
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_variable_expression("print_message", IR.Access_type.Read),
                                    [
                                        IR.create_constant_expression(c_string_type, "positive")
                                    ]
                                ),
                                add_source_locations ? { line: 41, column: 9 } : undefined
                            )
                        ]
                    },
                    {
                        condition: undefined,
                        then_statements: [
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_variable_expression("print_message", IR.Access_type.Read),
                                    [
                                        IR.create_constant_expression(c_string_type, "zero")
                                    ]
                                ),
                                add_source_locations ? { line: 45, column: 9 } : undefined
                            )
                        ]
                    }
                ]
            ),
            add_source_locations ? { line: 35, column: 5 } : undefined
        ),
        create_statement(
            IR.create_if_expression(
                [
                    {
                        condition: create_statement(
                            IR.create_binary_expression(
                                IR.create_variable_expression("value", IR.Access_type.Read),
                                IR.create_constant_expression(int32_type, "0"),
                                IR.Binary_operation.Less_than
                            ),
                            add_source_locations ? { line: 48, column: 8 } : undefined
                        ),
                        then_statements: [
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_variable_expression("print_message", IR.Access_type.Read),
                                    [
                                        IR.create_constant_expression(c_string_type, "message_0")
                                    ]
                                ),
                                add_source_locations ? { line: 50, column: 9 } : undefined
                            ),
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_variable_expression("print_message", IR.Access_type.Read),
                                    [
                                        IR.create_constant_expression(c_string_type, "message_1")
                                    ]
                                ),
                                add_source_locations ? { line: 51, column: 9 } : undefined
                            )
                        ]
                    }
                ]
            ),
            add_source_locations ? { line: 48, column: 5 } : undefined
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
                        linkage: IR.Linkage.Private,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "print_message",
                        statements: [
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_access_expression(IR.create_variable_expression("stdio", IR.Access_type.Read), "printf", IR.Access_type.Read),
                                    [
                                        IR.create_constant_expression(c_string_type, "%s\\n"),
                                        IR.create_variable_expression("message", IR.Access_type.Read)
                                    ]
                                ),
                                add_source_locations ? { line: 7, column: 5 } : undefined
                            ),
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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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
            ),
            //2
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
            ),
            //2
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
            ),
            //2
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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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
                ]
            ),
            //2
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
                            [
                                create_statement(
                                    IR.create_if_expression(
                                        [
                                            {
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
                                                ),
                                                then_statements: [
                                                    create_statement(
                                                        IR.create_continue_expression()
                                                    )
                                                ],
                                            }
                                        ]
                                    ),
                                    //2
                                ),
                                create_statement(
                                    IR.create_if_expression(
                                        [
                                            {
                                                condition: create_statement(
                                                    IR.create_binary_expression(
                                                        IR.create_variable_expression("index", IR.Access_type.Read),
                                                        IR.create_constant_expression(int32_type, "5"),
                                                        IR.Binary_operation.Greater_than
                                                    )
                                                ),
                                                then_statements: [
                                                    create_statement(
                                                        IR.create_break_expression(0)
                                                    )
                                                ]
                                            }
                                        ]
                                    ),
                                    //2
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
                        linkage: IR.Linkage.Private,
                        preconditions: [],
                        postconditions: [],
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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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

export function create_function_contracts(): IR.Module {

    const int32_type = create_integer_type(32, true);

    const statements: IR.Statement[] = [
        create_statement(
            IR.create_return_expression(
                IR.create_binary_expression(
                    IR.create_variable_expression("x", IR.Access_type.Read),
                    IR.create_variable_expression("x", IR.Access_type.Read),
                    IR.Binary_operation.Multiply
                )
            )
        )
    ];

    return {
        name: "Contracts",
        imports: [],
        declarations: [
            {
                name: "run",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "run",
                        type: {
                            input_parameter_types: [int32_type],
                            output_parameter_types: [int32_type],
                            is_variadic: false,
                        },
                        input_parameter_names: ["x"],
                        output_parameter_names: ["result"],
                        linkage: IR.Linkage.External,
                        preconditions: [
                            {
                                description: "x >= 0",
                                condition: create_statement(
                                    IR.create_binary_expression(
                                        IR.create_variable_expression("x", IR.Access_type.Read),
                                        IR.create_constant_expression(int32_type, "0"),
                                        IR.Binary_operation.Greater_than_or_equal_to
                                    )
                                )
                            },
                            {
                                description: "x <= 8",
                                condition: create_statement(
                                    IR.create_binary_expression(
                                        IR.create_variable_expression("x", IR.Access_type.Read),
                                        IR.create_constant_expression(int32_type, "8"),
                                        IR.Binary_operation.Less_than_or_equal_to
                                    )
                                )
                            }
                        ],
                        postconditions: [
                            {
                                description: "result >= 0",
                                condition: create_statement(
                                    IR.create_binary_expression(
                                        IR.create_variable_expression("result", IR.Access_type.Read),
                                        IR.create_constant_expression(int32_type, "0"),
                                        IR.Binary_operation.Greater_than_or_equal_to
                                    )
                                )
                            },
                            {
                                description: "result <= 64",
                                condition: create_statement(
                                    IR.create_binary_expression(
                                        IR.create_variable_expression("result", IR.Access_type.Read),
                                        IR.create_constant_expression(int32_type, "64"),
                                        IR.Binary_operation.Less_than_or_equal_to
                                    )
                                )
                            }
                        ],
                    },
                    definition: {
                        name: "run",
                        statements: statements
                    }
                }
            }
        ]
    };
}

export function create_function_with_empty_return_expression(): IR.Module {

    const statements: IR.Statement[] = [
        create_statement(
            IR.create_return_expression(undefined)
        )
    ];

    return {
        name: "Empty_return_expression",
        imports: [],
        declarations: [
            {
                name: "run",
                type: IR.Declaration_type.Function,
                is_export: false,
                value: {
                    declaration: {
                        name: "run",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: [],
                        linkage: IR.Linkage.Private,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "run",
                        statements: statements
                    }
                }
            }
        ]
    };
}

export function create_import_module(): IR.Module {

    return {
        name: "Complete_import",
        imports: [
            {
                module_name: "some_module",
                alias: "some_module_alias",
                usages: []
            }
        ],
        declarations: []
    };
}

export function create_import_module_with_empty_function(): IR.Module {

    return {
        name: "Complete_import_with_function",
        imports: [
            {
                module_name: "some_module",
                alias: "some_module_alias",
                usages: []
            }
        ],
        declarations: [
            {
                name: "run",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "run",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "run",
                        statements: []
                    }
                }
            }
        ]
    };
}

export function create_function_with_int32_return_expression(): IR.Module {

    const int32_type = create_integer_type(32, true);

    const statements: IR.Statement[] = [
        create_statement(
            IR.create_return_expression(
                IR.create_constant_expression(int32_type, "0")
            )
        )
    ];

    return {
        name: "Empty_return_expression",
        imports: [],
        declarations: [
            {
                name: "run",
                type: IR.Declaration_type.Function,
                is_export: false,
                value: {
                    declaration: {
                        name: "run",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [int32_type],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: ["result"],
                        linkage: IR.Linkage.Private,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "run",
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
                [
                    create_statement(
                        IR.create_if_expression(
                            [
                                {
                                    condition: create_statement(
                                        IR.create_binary_expression(
                                            IR.create_variable_expression("index", IR.Access_type.Read),
                                            IR.create_constant_expression(int32_type, "4"),
                                            IR.Binary_operation.Greater_than
                                        )
                                    ),
                                    then_statements: [
                                        create_statement(
                                            IR.create_break_expression(0)
                                        )
                                    ]
                                }
                            ]
                        ),
                        //2
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
            ),
            //2
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
                [
                    create_statement(
                        IR.create_variable_declaration_expression(
                            "index_2",
                            true,
                            IR.create_constant_expression(int32_type, "0")
                        ),
                        //2
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
                            [
                                create_statement(
                                    IR.create_if_expression(
                                        [
                                            {
                                                condition: create_statement(
                                                    IR.create_binary_expression(
                                                        IR.create_variable_expression("index", IR.Access_type.Read),
                                                        IR.create_constant_expression(int32_type, "3"),
                                                        IR.Binary_operation.Greater_than
                                                    )
                                                ),
                                                then_statements: [
                                                    create_statement(
                                                        IR.create_break_expression(0)
                                                    )
                                                ]
                                            }
                                        ]
                                    ),
                                    //2
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
                        ),
                        //2
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
            ),
            //2
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
                [
                    create_statement(
                        IR.create_variable_declaration_expression(
                            "index_2",
                            true,
                            IR.create_constant_expression(int32_type, "0")
                        ),
                        //2
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
                            [
                                create_statement(
                                    IR.create_if_expression(
                                        [
                                            {
                                                condition: create_statement(
                                                    IR.create_binary_expression(
                                                        IR.create_variable_expression("index", IR.Access_type.Read),
                                                        IR.create_constant_expression(int32_type, "3"),
                                                        IR.Binary_operation.Greater_than
                                                    )
                                                ),
                                                then_statements: [
                                                    create_statement(
                                                        IR.create_break_expression(2)
                                                    )
                                                ]
                                            }
                                        ]
                                    ),
                                    //2
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
                        ),
                        //2
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
                        linkage: IR.Linkage.Private,
                        preconditions: [],
                        postconditions: [],
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
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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
                            input_parameter_types: [create_custom_type_reference("Alias", "My_int")],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["size"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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
                            input_parameter_types: [create_custom_type_reference("Enums", "My_enum")],
                            output_parameter_types: [int32_type],
                            is_variadic: false,
                        },
                        input_parameter_names: ["enum_argument"],
                        output_parameter_names: ["result"],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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
                                ),
                                //2
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
                                                    ),
                                                    //2
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
                                ),
                                //2
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
                            input_parameter_types: [create_custom_type_reference("Enum_flags", "My_enum_flag")],
                            output_parameter_types: [int32_type],
                            is_variadic: false,
                        },
                        input_parameter_names: ["enum_argument"],
                        output_parameter_names: ["result"],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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
                                ),
                                //2
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
                                            then_statements: [
                                                create_statement(
                                                    IR.create_return_expression(
                                                        IR.create_constant_expression(int32_type, "0")
                                                    )
                                                )
                                            ]
                                        }
                                    ]
                                ),
                                //2
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
                                            then_statements: [
                                                create_statement(
                                                    IR.create_return_expression(
                                                        IR.create_constant_expression(int32_type, "1")
                                                    )
                                                )
                                            ]
                                        }
                                    ]
                                ),
                                //2
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
                                            then_statements: [
                                                create_statement(
                                                    IR.create_return_expression(
                                                        IR.create_constant_expression(int32_type, "2")
                                                    )
                                                )
                                            ]
                                        }
                                    ]
                                ),
                                //2
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
                                            then_statements: [
                                                create_statement(
                                                    IR.create_return_expression(
                                                        IR.create_constant_expression(int32_type, "3")
                                                    )
                                                )
                                            ]
                                        }
                                    ]
                                ),
                                //2
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

export function create_using_global_variables(): IR.Module {
    const float32_type = create_fundamental_type(IR.Fundamental_type.Float32);
    return {
        name: "Global_variables",
        imports: [],
        declarations: [
            {
                name: "my_global_variable_0",
                type: IR.Declaration_type.Global_variable,
                is_export: false,
                value: {
                    name: "my_global_variable_0",
                    initial_value: create_statement(
                        IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Float32), "1.0")
                    ),
                    is_mutable: false
                } as IR.Global_variable_declaration
            },
            {
                name: "my_global_variable_1",
                type: IR.Declaration_type.Global_variable,
                is_export: false,
                value: {
                    name: "my_global_variable_1",
                    initial_value: create_statement(
                        IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Float32), "1.0")
                    ),
                    is_mutable: true
                } as IR.Global_variable_declaration
            },
            {
                name: "use_global_variables",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "use_global_variables",
                        type: {
                            input_parameter_types: [float32_type],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["parameter"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "use_global_variables",
                        statements: [
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "a",
                                    false,
                                    IR.create_binary_expression(
                                        IR.create_variable_expression("my_global_variable_0", IR.Access_type.Read),
                                        IR.create_variable_expression("parameter", IR.Access_type.Read),
                                        IR.Binary_operation.Add
                                    )
                                ),
                            ),
                        ]
                    }
                }
            },
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
                    is_literal: false,
                    member_comments: []
                }
            },
            {
                name: "My_struct_2",
                type: IR.Declaration_type.Struct,
                is_export: true,
                value: {
                    name: "My_struct_2",
                    member_types: [
                        create_custom_type_reference("Structs", "My_struct"),
                        create_custom_type_reference("Structs", "My_struct"),
                        create_custom_type_reference("Structs", "My_struct"),
                    ],
                    member_names: [
                        "a",
                        "b",
                        "c"
                    ],
                    member_default_values: [
                        create_statement(
                            IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, [])
                        ),
                        create_statement(
                            IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, [
                                {
                                    member_name: "a",
                                    value: create_statement(
                                        IR.create_constant_expression(int32_type, "2")
                                    )
                                }
                            ])
                        ),
                        create_statement(
                            IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, [
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
                    is_literal: false,
                    member_comments: []
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
                            input_parameter_types: [create_custom_type_reference("Structs", "My_struct")],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["my_struct"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
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
                                ),
                                //2
                            ),
                            create_statement(
                                IR.create_variable_declaration_with_type_expression(
                                    "instance_0",
                                    false,
                                    create_custom_type_reference("Structs", "My_struct"),
                                    create_statement(
                                        IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, [])
                                    )
                                ),
                                //2
                            ),
                            create_statement(
                                IR.create_variable_declaration_with_type_expression(
                                    "instance_1",
                                    false,
                                    create_custom_type_reference("Structs", "My_struct"),
                                    create_statement(
                                        IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, [
                                            {
                                                member_name: "b",
                                                value: create_statement(
                                                    IR.create_constant_expression(int32_type, "3")
                                                )
                                            }
                                        ])
                                    )
                                ),
                                //2
                            ),
                            create_statement(
                                IR.create_variable_declaration_with_type_expression(
                                    "instance_2",
                                    false,
                                    create_custom_type_reference("Structs", "My_struct_2"),
                                    create_statement(
                                        IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, [])
                                    )
                                ),
                                //2
                            ),
                            create_statement(
                                IR.create_variable_declaration_with_type_expression(
                                    "instance_3",
                                    false,
                                    create_custom_type_reference("Structs", "My_struct_2"),
                                    create_statement(
                                        IR.create_instantiate_expression(IR.Instantiate_expression_type.Explicit, [
                                            {
                                                member_name: "a",
                                                value: create_statement(
                                                    IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, [])
                                                )
                                            },
                                            {
                                                member_name: "b",
                                                value: create_statement(
                                                    IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, [])
                                                )
                                            },
                                            {
                                                member_name: "c",
                                                value: create_statement(
                                                    IR.create_instantiate_expression(IR.Instantiate_expression_type.Explicit, [
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
                                ),
                                //2
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
                                ),
                                //2
                            ),
                            create_statement(
                                IR.create_variable_declaration_with_type_expression(
                                    "instance_4",
                                    true,
                                    create_custom_type_reference("Structs", "My_struct"),
                                    create_statement(
                                        IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, [])
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
                                ),
                                //2
                            ),
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_variable_expression("pass_struct", IR.Access_type.Read),
                                    [
                                        IR.create_instantiate_expression(
                                            IR.Instantiate_expression_type.Default,
                                            []
                                        )
                                    ]
                                )
                            ),
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "instance_5",
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
                            input_parameter_types: [create_custom_type_reference("Structs", "My_struct")],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["my_struct"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.Private,
                        preconditions: [],
                        postconditions: [],
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
                            output_parameter_types: [create_custom_type_reference("Structs", "My_struct")],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: ["my_struct"],
                        linkage: IR.Linkage.Private,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "return_struct",
                        statements: [
                            create_statement(
                                IR.create_return_expression(
                                    IR.create_instantiate_expression(
                                        IR.Instantiate_expression_type.Default,
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

export function create_using_unions(): IR.Module {
    const int32_type = create_integer_type(32, true);
    const int64_type = create_integer_type(64, true);
    const float32_type = create_fundamental_type(IR.Fundamental_type.Float32);
    return {
        name: "Unions",
        imports: [],
        declarations: [
            {
                name: "My_union_tag",
                type: IR.Declaration_type.Enum,
                is_export: true,
                value: {
                    name: "My_union_tag",
                    values: [
                        {
                            name: "a",
                            value: create_statement(
                                IR.create_constant_expression(int32_type, "0")
                            )
                        },
                        {
                            name: "b",
                            value: create_statement(
                                IR.create_constant_expression(int32_type, "1")
                            )
                        }
                    ]
                }
            },
            {
                name: "My_union",
                type: IR.Declaration_type.Union,
                is_export: true,
                value: {
                    name: "My_union",
                    member_types: [
                        int32_type,
                        float32_type
                    ],
                    member_names: [
                        "a",
                        "b"
                    ],
                    member_comments: []
                }
            },
            {
                name: "My_union_2",
                type: IR.Declaration_type.Union,
                is_export: true,
                value: {
                    name: "My_union_2",
                    member_types: [
                        int32_type,
                        int64_type
                    ],
                    member_names: [
                        "a",
                        "b"
                    ],
                    member_comments: []
                }
            },
            {
                name: "My_struct",
                type: IR.Declaration_type.Struct,
                is_export: true,
                value: {
                    name: "My_struct",
                    member_types: [
                        int32_type
                    ],
                    member_names: [
                        "a"
                    ],
                    member_default_values: [
                        create_statement(
                            IR.create_constant_expression(int32_type, "1")
                        )
                    ],
                    is_packed: false,
                    is_literal: false,
                    member_comments: []
                }
            },
            {
                name: "My_union_3",
                type: IR.Declaration_type.Union,
                is_export: true,
                value: {
                    name: "My_union_3",
                    member_types: [
                        int64_type,
                        create_custom_type_reference("Unions", "My_struct")
                    ],
                    member_names: [
                        "a",
                        "b"
                    ],
                    member_comments: []
                }
            },
            {
                name: "use_unions",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "use_unions",
                        type: {
                            input_parameter_types: [create_custom_type_reference("Unions", "My_union"), create_custom_type_reference("Unions", "My_union_tag")],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["my_union", "my_union_tag"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "use_unions",
                        statements: [
                            create_statement(
                                IR.create_if_expression(
                                    [
                                        {
                                            condition: create_statement(
                                                IR.create_binary_expression(
                                                    IR.create_variable_expression("my_union_tag", IR.Access_type.Read),
                                                    IR.create_access_expression(
                                                        IR.create_variable_expression("My_union_tag", IR.Access_type.Read),
                                                        "a",
                                                        IR.Access_type.Read
                                                    ),
                                                    IR.Binary_operation.Equal
                                                )
                                            ),
                                            then_statements: [
                                                create_statement(
                                                    IR.create_variable_declaration_expression(
                                                        "a",
                                                        false,
                                                        IR.create_access_expression(
                                                            IR.create_variable_expression("my_union", IR.Access_type.Read),
                                                            "a",
                                                            IR.Access_type.Read
                                                        )
                                                    )
                                                )
                                            ]
                                        },
                                        {
                                            condition: create_statement(
                                                IR.create_binary_expression(
                                                    IR.create_variable_expression("my_union_tag", IR.Access_type.Read),
                                                    IR.create_access_expression(
                                                        IR.create_variable_expression("My_union_tag", IR.Access_type.Read),
                                                        "b",
                                                        IR.Access_type.Read
                                                    ),
                                                    IR.Binary_operation.Equal
                                                )
                                            ),
                                            then_statements: [
                                                create_statement(
                                                    IR.create_variable_declaration_expression(
                                                        "b",
                                                        false,
                                                        IR.create_access_expression(
                                                            IR.create_variable_expression("my_union", IR.Access_type.Read),
                                                            "b",
                                                            IR.Access_type.Read
                                                        )
                                                    )
                                                )
                                            ]
                                        }
                                    ]
                                ),
                                //2
                            ),
                            create_statement(
                                IR.create_variable_declaration_with_type_expression(
                                    "instance_0",
                                    false,
                                    create_custom_type_reference("Unions", "My_union"),
                                    create_statement(
                                        IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, [
                                            {
                                                member_name: "a",
                                                value: create_statement(
                                                    IR.create_constant_expression(int32_type, "2")
                                                )
                                            }
                                        ])
                                    )
                                )
                            ),
                            create_statement(
                                IR.create_variable_declaration_with_type_expression(
                                    "instance_1",
                                    false,
                                    create_custom_type_reference("Unions", "My_union"),
                                    create_statement(
                                        IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, [
                                            {
                                                member_name: "b",
                                                value: create_statement(
                                                    IR.create_constant_expression(float32_type, "3.0")
                                                )
                                            }
                                        ])
                                    )
                                ),
                                //2
                            ),
                            create_statement(
                                IR.create_variable_declaration_with_type_expression(
                                    "instance_2",
                                    false,
                                    create_custom_type_reference("Unions", "My_union_2"),
                                    create_statement(
                                        IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, [
                                            {
                                                member_name: "a",
                                                value: create_statement(
                                                    IR.create_constant_expression(int32_type, "2")
                                                )
                                            }
                                        ])
                                    )
                                )
                            ),
                            create_statement(
                                IR.create_variable_declaration_with_type_expression(
                                    "instance_3",
                                    false,
                                    create_custom_type_reference("Unions", "My_union_2"),
                                    create_statement(
                                        IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, [
                                            {
                                                member_name: "b",
                                                value: create_statement(
                                                    IR.create_constant_expression(int64_type, "3")
                                                )
                                            }
                                        ])
                                    )
                                ),
                                //2
                            ),
                            create_statement(
                                IR.create_variable_declaration_with_type_expression(
                                    "instance_4",
                                    false,
                                    create_custom_type_reference("Unions", "My_union_3"),
                                    create_statement(
                                        IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, [
                                            {
                                                member_name: "a",
                                                value: create_statement(
                                                    IR.create_constant_expression(int64_type, "3")
                                                )
                                            }
                                        ])
                                    )
                                )
                            ),
                            create_statement(
                                IR.create_variable_declaration_with_type_expression(
                                    "instance_5",
                                    false,
                                    create_custom_type_reference("Unions", "My_union_3"),
                                    create_statement(
                                        IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, [
                                            {
                                                member_name: "b",
                                                value: create_statement(
                                                    IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, [])
                                                )
                                            }
                                        ])
                                    )
                                )
                            ),
                            create_statement(
                                IR.create_variable_declaration_with_type_expression(
                                    "instance_6",
                                    false,
                                    create_custom_type_reference("Unions", "My_union_3"),
                                    create_statement(
                                        IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, [
                                            {
                                                member_name: "b",
                                                value: create_statement(
                                                    IR.create_instantiate_expression(IR.Instantiate_expression_type.Explicit, [
                                                        {
                                                            member_name: "a",
                                                            value: create_statement(
                                                                IR.create_constant_expression(int32_type, "2")
                                                            )
                                                        }
                                                    ])
                                                )
                                            }
                                        ])
                                    )
                                ),
                                //2
                            ),
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "nested_b_a",
                                    false,
                                    IR.create_access_expression(
                                        IR.create_access_expression(
                                            IR.create_variable_expression("instance_6", IR.Access_type.Read),
                                            "b",
                                            IR.Access_type.Read
                                        ),
                                        "a",
                                        IR.Access_type.Read
                                    )
                                ),
                                //2
                            ),
                            create_statement(
                                IR.create_variable_declaration_with_type_expression(
                                    "instance_7",
                                    true,
                                    create_custom_type_reference("Unions", "My_union"),
                                    create_statement(
                                        IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, [
                                            {
                                                member_name: "a",
                                                value: create_statement(
                                                    IR.create_constant_expression(int32_type, "1")
                                                )
                                            }
                                        ])
                                    )
                                )
                            ),
                            create_statement(
                                IR.create_assignment_expression(
                                    IR.create_variable_expression("instance_7", IR.Access_type.Write),
                                    IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, [
                                        {
                                            member_name: "a",
                                            value: create_statement(
                                                IR.create_constant_expression(int32_type, "2")
                                            )
                                        }
                                    ]),
                                    undefined
                                ),
                                //2
                            ),
                            create_statement(
                                IR.create_call_expression(
                                    IR.create_variable_expression("pass_union", IR.Access_type.Read),
                                    [
                                        IR.create_instantiate_expression(
                                            IR.Instantiate_expression_type.Default,
                                            [
                                                {
                                                    member_name: "a",
                                                    value: create_statement(
                                                        IR.create_constant_expression(int32_type, "4")
                                                    )
                                                }
                                            ]
                                        )
                                    ]
                                )
                            ),
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "instance_8",
                                    false,
                                    IR.create_call_expression(
                                        IR.create_variable_expression("return_union", IR.Access_type.Read),
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
                name: "pass_union",
                type: IR.Declaration_type.Function,
                is_export: false,
                value: {
                    declaration: {
                        name: "pass_union",
                        type: {
                            input_parameter_types: [create_custom_type_reference("Unions", "My_union")],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: ["my_union"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.Private,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "pass_union",
                        statements: []
                    }
                }
            },
            {
                name: "return_union",
                type: IR.Declaration_type.Function,
                is_export: false,
                value: {
                    declaration: {
                        name: "return_union",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [create_custom_type_reference("Unions", "My_union")],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: ["my_union"],
                        linkage: IR.Linkage.Private,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "return_union",
                        statements: [
                            create_statement(
                                IR.create_return_expression(
                                    IR.create_instantiate_expression(
                                        IR.Instantiate_expression_type.Default,
                                        [
                                            {
                                                member_name: "b",
                                                value: create_statement(
                                                    IR.create_constant_expression(float32_type, "10.0")
                                                )
                                            }
                                        ]
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

export function create_variadic_function_declarations(): IR.Module {
    const int32_type = create_integer_type(32, true);
    return {
        name: "Variadic",
        imports: [],
        declarations: [
            {
                name: "my_function",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "my_function",
                        type: {
                            input_parameter_types: [int32_type],
                            output_parameter_types: [],
                            is_variadic: true,
                        },
                        input_parameter_names: ["first"],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "my_function",
                        statements: []
                    }
                },
            },
        ]
    };
}

export function create_type_constructor(): IR.Module {
    const int32_type = create_integer_type(32, true);
    const uint64_type = create_integer_type(64, false);
    return {
        name: "Type_constructor",
        imports: [],
        declarations: [
            {
                name: "Dynamic_array",
                type: IR.Declaration_type.Type_constructor,
                is_export: true,
                value: {
                    name: "Dynamic_array",
                    parameters: [
                        {
                            name: "element_type",
                            type: Type_utilities.create_builtin_type_reference("Type"),
                        }
                    ],
                    statements: [
                        create_statement(
                            IR.create_return_expression(
                                IR.create_struct_expression(
                                    {
                                        name: "",
                                        member_types: [
                                            Type_utilities.create_pointer_type(
                                                [Type_utilities.create_parameter_type("element_type")],
                                                false
                                            ),
                                            uint64_type,
                                        ],
                                        member_names: [
                                            "data",
                                            "length",
                                        ],
                                        member_default_values: [
                                            create_statement(
                                                IR.create_null_pointer_expression()
                                            ),
                                            create_statement(
                                                IR.create_constant_expression(uint64_type, "0")
                                            ),
                                        ],
                                        is_packed: false,
                                        is_literal: false,
                                        member_comments: [],
                                    }
                                )
                            )
                        )
                    ],
                },
            },
            {
                name: "run",
                type: IR.Declaration_type.Function,
                is_export: false,
                value: {
                    declaration: {
                        name: "run",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: [],
                        linkage: IR.Linkage.Private,
                        preconditions: [],
                        postconditions: []
                    },
                    definition: {
                        name: "run",
                        statements: [
                            create_statement(
                                IR.create_variable_declaration_with_type_expression(
                                    "instance",
                                    false,
                                    Type_utilities.create_type_instance("Type_constructor", "Dynamic_array", [
                                        create_statement(IR.create_type_expression(int32_type))
                                    ]),
                                    create_statement(
                                        IR.create_instantiate_expression(
                                            IR.Instantiate_expression_type.Default,
                                            []
                                        )
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

export function create_function_constructor_0(): IR.Module {
    return {
        name: "Function_constructor",
        imports: [],
        declarations: [
            {
                name: "to_string",
                type: IR.Declaration_type.Function_constructor,
                is_export: true,
                value: {
                    name: "to_string",
                    parameters: [
                        {
                            name: "value_type",
                            type: Type_utilities.create_builtin_type_reference("Type"),
                        }
                    ],
                    statements: [
                        create_statement(
                            IR.create_return_expression(
                                IR.create_function_expression(
                                    {
                                        name: "",
                                        type: {
                                            input_parameter_types: [
                                                Type_utilities.create_parameter_type("value_type"),
                                            ],
                                            output_parameter_types: [
                                                Type_utilities.create_string_type(),
                                            ],
                                            is_variadic: false,
                                        },
                                        input_parameter_names: [
                                            "value"
                                        ],
                                        output_parameter_names: [
                                            "result"
                                        ],
                                        linkage: IR.Linkage.External,
                                        preconditions: [],
                                        postconditions: [],
                                    },
                                    {
                                        name: "",
                                        statements: [
                                            create_statement(
                                                IR.create_compile_time_expression(
                                                    IR.create_if_expression(
                                                        [
                                                            {
                                                                condition: create_statement(
                                                                    IR.create_call_expression(
                                                                        IR.create_variable_expression("@is_enum", IR.Access_type.Read),
                                                                        [
                                                                            IR.create_variable_expression("value_type", IR.Access_type.Read),
                                                                        ]
                                                                    )
                                                                ),
                                                                then_statements: [
                                                                    create_statement(
                                                                        IR.create_variable_declaration_expression(
                                                                            "enum_value_name",
                                                                            false,
                                                                            IR.create_call_expression(
                                                                                IR.create_variable_expression("@get_enum_value_name", IR.Access_type.Read),
                                                                                [
                                                                                    IR.create_variable_expression("value", IR.Access_type.Read)
                                                                                ]
                                                                            )
                                                                        )
                                                                    ),
                                                                    create_statement(
                                                                        IR.create_return_expression(
                                                                            IR.create_variable_expression("enum_value_name", IR.Access_type.Read)
                                                                        )
                                                                    )
                                                                ],
                                                            },
                                                            {
                                                                condition: create_statement(
                                                                    IR.create_call_expression(
                                                                        IR.create_variable_expression("@is_integer", IR.Access_type.Read),
                                                                        [
                                                                            IR.create_variable_expression("value_type", IR.Access_type.Read),
                                                                        ]
                                                                    )
                                                                ),
                                                                then_statements: [
                                                                    create_statement(
                                                                        IR.create_return_expression(
                                                                            IR.create_constant_expression(
                                                                                Type_utilities.create_string_type(),
                                                                                "0"
                                                                            )
                                                                        )
                                                                    )
                                                                ],
                                                            }
                                                        ]
                                                    )
                                                )
                                            )
                                        ]
                                    }
                                )
                            )
                        )
                    ],
                },
            },
        ]
    };
}

export function create_function_constructor_1(): IR.Module {
    const int32_type = create_integer_type(32, true);
    const float32_type = create_fundamental_type(IR.Fundamental_type.Float32);
    return {
        name: "Function_constructor",
        imports: [],
        declarations: [
            {
                name: "add",
                type: IR.Declaration_type.Function_constructor,
                is_export: true,
                value: {
                    name: "add",
                    parameters: [
                        {
                            name: "value_type",
                            type: Type_utilities.create_builtin_type_reference("Type"),
                        }
                    ],
                    statements: [
                        create_statement(
                            IR.create_return_expression(
                                IR.create_function_expression(
                                    {
                                        name: "",
                                        type: {
                                            input_parameter_types: [
                                                Type_utilities.create_parameter_type("value_type"),
                                                Type_utilities.create_parameter_type("value_type")
                                            ],
                                            output_parameter_types: [
                                                Type_utilities.create_parameter_type("value_type")
                                            ],
                                            is_variadic: false,
                                        },
                                        input_parameter_names: [
                                            "first",
                                            "second"
                                        ],
                                        output_parameter_names: [
                                            "result"
                                        ],
                                        linkage: IR.Linkage.Private,
                                        preconditions: [],
                                        postconditions: [],
                                    },
                                    {
                                        name: "",
                                        statements: [
                                            create_statement(
                                                IR.create_return_expression(
                                                    IR.create_binary_expression(
                                                        IR.create_variable_expression("first", IR.Access_type.Read),
                                                        IR.create_variable_expression("second", IR.Access_type.Read),
                                                        IR.Binary_operation.Add
                                                    )
                                                )
                                            )
                                        ]
                                    }
                                )
                            )
                        )
                    ],
                },
            },
            {
                name: "run",
                type: IR.Declaration_type.Function,
                is_export: false,
                value: {
                    declaration: {
                        name: "run",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: [],
                        linkage: IR.Linkage.Private,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "run",
                        statements: [
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "a",
                                    false,
                                    IR.create_call_expression(
                                        IR.create_instance_call_expression(
                                            IR.create_variable_expression("add", IR.Access_type.Read),
                                            [
                                                IR.create_type_expression(int32_type)
                                            ]
                                        ),
                                        [
                                            IR.create_constant_expression(int32_type, "1"),
                                            IR.create_constant_expression(int32_type, "2"),
                                        ]
                                    )
                                )
                            ),
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "b",
                                    false,
                                    IR.create_call_expression(
                                        IR.create_instance_call_expression(
                                            IR.create_variable_expression("add", IR.Access_type.Read),
                                            [
                                                IR.create_type_expression(float32_type)
                                            ]
                                        ),
                                        [
                                            IR.create_constant_expression(float32_type, "3.0"),
                                            IR.create_constant_expression(float32_type, "4.0"),
                                        ]
                                    )
                                )
                            ),
                        ]
                    }
                },
            },
        ]
    };
}

export function create_comments_in_module_declaration(): IR.Module {
    return {
        name: "Comments_in_module_declaration",
        imports: [],
        declarations: [],
        comment: "This is a very long\nmodule decription"
    };
}


export function create_comments_in_alias(): IR.Module {
    const int32_type = create_integer_type(32, true);
    return {
        name: "Comments_in_alias",
        imports: [],
        declarations: [
            {
                name: "My_int",
                type: IR.Declaration_type.Alias,
                is_export: false,
                value: {
                    name: "My_int",
                    type: [int32_type],
                    comment: "Alias comment\nAnother line"
                }
            }
        ]
    };
}

export function create_comments_in_enums(): IR.Module {
    const int32_type = create_integer_type(32, true);
    return {
        name: "Comments_in_enums",
        imports: [],
        declarations: [
            {
                name: "My_enum",
                type: IR.Declaration_type.Enum,
                is_export: false,
                value: {
                    name: "My_enum",
                    values: [
                        {
                            name: "A",
                            value: create_statement(
                                IR.create_constant_expression(int32_type, "1")
                            ),
                            comment: "This is A"
                        },
                        {
                            name: "B",
                            value: create_statement(
                                IR.create_constant_expression(int32_type, "2")
                            )
                        },
                        {
                            name: "C",
                            value: create_statement(
                                IR.create_constant_expression(int32_type, "3")
                            ),
                            comment: "This is C"
                        }
                    ],
                    comment: "Enum comment\nAnother line"
                }
            },
        ]
    };
}

export function create_comments_in_functions(add_source_locations: boolean): IR.Module {
    const int32_type = create_integer_type(32, true);
    const module: IR.Module = {
        name: "Comments_in_functions",
        imports: [],
        declarations: [
            {
                name: "use_comments",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "use_comments",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                        comment: "Function comment\nNo arguments"
                    },
                    definition: {
                        name: "use_comments",
                        statements: [
                            create_statement(
                                IR.create_comment_expression("This is a comment"),
                                add_source_locations ? { line: 7, column: 5 } : undefined
                            ),
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "i",
                                    false,
                                    IR.create_constant_expression(int32_type, "0")
                                ),
                                add_source_locations ? { line: 8, column: 5 } : undefined
                            ),
                            create_statement(
                                IR.create_comment_expression("This is another comment"),
                                add_source_locations ? { line: 10, column: 5 } : undefined
                            ),
                            create_statement(
                                IR.create_comment_expression("And yet another"),
                                add_source_locations ? { line: 11, column: 5 } : undefined
                            ),
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "x",
                                    false,
                                    IR.create_constant_expression(int32_type, "0")
                                ),
                                add_source_locations ? { line: 12, column: 5 } : undefined
                            ),
                        ]
                    }
                }
            }
        ]
    };

    if (add_source_locations) {
        (module.declarations[0].value as IR.Function).declaration.source_location = { line: 5, column: 17 };
    }

    return module;
}

export function create_comments_in_global_variables(): IR.Module {
    return {
        name: "Comments_in_global_variables",
        imports: [],
        declarations: [
            {
                name: "My_global_variable",
                type: IR.Declaration_type.Global_variable,
                is_export: true,
                value: {
                    name: "My_global_variable",
                    initial_value: create_statement(
                        IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Float32), "1.0")
                    ),
                    is_mutable: false,
                    comment: "A global variable comment\nAnother line"
                } as IR.Global_variable_declaration
            }
        ]
    };
}

export function create_comments_in_structs(): IR.Module {
    const int32_type = create_integer_type(32, true);
    return {
        name: "Comments_in_structs",
        imports: [],
        declarations: [
            {
                name: "My_struct",
                type: IR.Declaration_type.Struct,
                is_export: false,
                value: {
                    name: "My_struct",
                    member_types: [
                        int32_type,
                        int32_type,
                        int32_type
                    ],
                    member_names: [
                        "a",
                        "b",
                        "c"
                    ],
                    member_default_values: [
                        create_statement(
                            IR.create_constant_expression(int32_type, "0")
                        ),
                        create_statement(
                            IR.create_constant_expression(int32_type, "0")
                        ),
                        create_statement(
                            IR.create_constant_expression(int32_type, "0")
                        ),
                    ],
                    is_packed: false,
                    is_literal: false,
                    member_comments: [
                        {
                            index: 0,
                            comment: "This is a int"
                        },
                        {
                            index: 2,
                            comment: "Another int\nAnother line"
                        }
                    ],
                    comment: "Struct comment\nAnother line"
                },
            },
        ]
    };
}

export function create_comments_in_unions(): IR.Module {
    const int32_type = create_integer_type(32, true);
    return {
        name: "Comments_in_unions",
        imports: [],
        declarations: [
            {
                name: "My_union",
                type: IR.Declaration_type.Union,
                is_export: false,
                value: {
                    name: "My_union",
                    member_types: [
                        int32_type,
                        int32_type,
                        int32_type
                    ],
                    member_names: [
                        "a",
                        "b",
                        "c"
                    ],
                    member_comments: [
                        {
                            index: 0,
                            comment: "This is a int"
                        },
                        {
                            index: 2,
                            comment: "Another int\nAnother line"
                        }
                    ],
                    comment: "Union comment\nAnother line"
                }
            },
        ]
    };
}

export function create_newlines_after_statements(add_source_locations: boolean): IR.Module {
    const int32_type = create_integer_type(32, true);
    const output: IR.Module = {
        name: "Newlines_after_statements",
        imports: [],
        declarations: [
            {
                name: "use_newlines",
                type: IR.Declaration_type.Function,
                is_export: false,
                value: {
                    declaration: {
                        name: "use_newlines",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: [],
                        linkage: IR.Linkage.Private,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "use_newlines",
                        statements: [
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "i",
                                    false,
                                    IR.create_constant_expression(int32_type, "0")
                                ),
                                add_source_locations ? { line: 5, column: 5 } : undefined
                            ),
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "j",
                                    false,
                                    IR.create_constant_expression(int32_type, "1")
                                ),
                                add_source_locations ? { line: 6, column: 5 } : undefined
                            ),
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "k",
                                    false,
                                    IR.create_constant_expression(int32_type, "2")
                                ),
                                add_source_locations ? { line: 8, column: 5 } : undefined
                            ),
                            create_statement(
                                IR.create_comment_expression("A comment"),
                                add_source_locations ? { line: 10, column: 5 } : undefined
                            ),
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "l",
                                    false,
                                    IR.create_constant_expression(int32_type, "3")
                                ),
                                add_source_locations ? { line: 11, column: 5 } : undefined
                            ),
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "m",
                                    false,
                                    IR.create_constant_expression(int32_type, "4")
                                ),
                                add_source_locations ? { line: 14, column: 5 } : undefined
                            ),
                        ]
                    }
                }
            }
        ]
    };

    if (add_source_locations) {
        (output.declarations[0].value as IR.Function).declaration.source_location = { line: 3, column: 10 };
    }

    return output;
}

export function create_add_function(): IR.Module {

    const int32_type = create_integer_type(32, true);

    return {
        name: "Add",
        imports: [],
        declarations: [
            {
                name: "add",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "add",
                        type: {
                            input_parameter_types: [int32_type, int32_type],
                            output_parameter_types: [int32_type],
                            is_variadic: false,
                        },
                        input_parameter_names: ["lhs", "rhs"],
                        output_parameter_names: ["result"],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "add",
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
            }
        ]
    };
}

export function create_invalid_assignment_to_itself_function(): IR.Module {

    return {
        name: "Test",
        imports: [],
        declarations: [
            {
                name: "run",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "run",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "run",
                        statements: [
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "value", false, IR.create_variable_expression("value", IR.Access_type.Read)
                                )
                            ),
                        ]
                    }
                }
            }
        ]
    };
}

export function create_function_with_variable_declaration(): IR.Module {

    const int32_type = create_integer_type(32, true);

    return {
        name: "Variable_declaration",
        imports: [],
        declarations: [
            {
                name: "run",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "run",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "run",
                        statements: [
                            create_statement(
                                IR.create_variable_declaration_expression(
                                    "a", true, IR.create_constant_expression(int32_type, "0")
                                )
                            ),
                            create_statement(
                                IR.create_assignment_expression(
                                    IR.create_variable_expression("a", IR.Access_type.Write),
                                    IR.create_constant_expression(int32_type, "1"),
                                    undefined
                                )
                            )
                        ]
                    }
                }
            }
        ]
    };
}

export function create_function_with_variable_declaration_with_type(): IR.Module {

    const int32_type = create_integer_type(32, true);

    return {
        name: "Variable_declaration_with_type",
        imports: [],
        declarations: [
            {
                name: "run",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "run",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "run",
                        statements: [
                            create_statement(
                                IR.create_variable_declaration_with_type_expression(
                                    "a", true, int32_type, create_statement(IR.create_constant_expression(int32_type, "0"))
                                )
                            ),
                            create_statement(
                                IR.create_assignment_expression(
                                    IR.create_variable_expression("a", IR.Access_type.Write),
                                    IR.create_constant_expression(int32_type, "1"),
                                    undefined
                                )
                            )
                        ]
                    }
                }
            }
        ]
    };
}

export function create_variable_declaration_inside_while_loop(): IR.Module {

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
                            [
                                create_statement(
                                    IR.create_variable_declaration_with_type_expression("a", true, int32_type, create_statement(IR.create_constant_expression(int32_type, "1")))
                                ),
                                create_statement(
                                    IR.create_assignment_expression(
                                        IR.create_variable_expression("a", IR.Access_type.Read_write),
                                        IR.create_constant_expression(int32_type, "1"),
                                        IR.Binary_operation.Add
                                    )
                                ),
                            ]
                        )
                    )
                ]
            )
        ),
    ];

    return {
        name: "While_loop_expressions_with_variable",
        imports: [],
        declarations: [
            {
                name: "run",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "run",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "run",
                        statements: statements
                    }
                }
            }
        ]
    };
}

export function create_variable_declaration_inside_if_expression(): IR.Module {

    const int32_type = create_integer_type(32, true);
    const uint32_type = create_integer_type(32, false);

    const statements: IR.Statement[] = [
        create_statement(
            IR.create_if_expression([
                {
                    condition: create_statement(
                        IR.create_constant_expression(create_fundamental_type(IR.Fundamental_type.Bool), "false")
                    ),
                    then_statements: [
                        create_statement(
                            IR.create_variable_declaration_with_type_expression("a", true, int32_type, create_statement(IR.create_constant_expression(int32_type, "0")))
                        ),
                        create_statement(
                            IR.create_assignment_expression(IR.create_variable_expression("a", IR.Access_type.Read), IR.create_constant_expression(int32_type, "1"), undefined)
                        )
                    ]
                },
                {
                    condition: undefined,
                    then_statements: [
                        create_statement(
                            IR.create_variable_declaration_with_type_expression("b", true, uint32_type, create_statement(IR.create_constant_expression(uint32_type, "0")))
                        ),
                        create_statement(
                            IR.create_assignment_expression(IR.create_variable_expression("b", IR.Access_type.Read), IR.create_constant_expression(uint32_type, "1"), undefined)
                        )
                    ]
                }
            ])
        )
    ];

    return {
        name: "Variable_declaration_inside_if_expression",
        imports: [],
        declarations: [
            {
                name: "run",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "run",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "run",
                        statements: statements
                    }
                }
            }
        ]
    };
}

export function create_variable_declaration_inside_switch_case(): IR.Module {

    const int32_type = create_integer_type(32, true);
    const uint32_type = create_integer_type(32, false);

    const statements: IR.Statement[] = [
        create_statement(
            IR.create_switch_expression(
                IR.create_variable_expression("a", IR.Access_type.Read),
                [
                    {
                        case_value: IR.create_constant_expression(int32_type, "0"),
                        statements: [
                            create_statement(
                                IR.create_variable_declaration_with_type_expression("a", true, int32_type, create_statement(IR.create_constant_expression(int32_type, "0")))
                            ),
                            create_statement(
                                IR.create_assignment_expression(IR.create_variable_expression("a", IR.Access_type.Read), IR.create_constant_expression(int32_type, "1"), undefined)
                            )
                        ]
                    },
                    {
                        case_value: IR.create_constant_expression(int32_type, "1"),
                        statements: [
                            create_statement(
                                IR.create_variable_declaration_with_type_expression("b", true, uint32_type, create_statement(IR.create_constant_expression(uint32_type, "0")))
                            ),
                            create_statement(
                                IR.create_assignment_expression(IR.create_variable_expression("b", IR.Access_type.Read), IR.create_constant_expression(uint32_type, "1"), undefined)
                            )
                        ]
                    }
                ]
            )
        )
    ];

    return {
        name: "Variable_declaration_inside_switch_case",
        imports: [],
        declarations: [
            {
                name: "run",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "run",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "run",
                        statements: statements
                    }
                }
            }
        ]
    };
}

export function create_access_struct_of_imported_module(): IR.Module {

    const statements: IR.Statement[] = [
        create_statement(
            IR.create_variable_declaration_with_type_expression(
                "instance",
                false,
                create_custom_type_reference("Structs", "My_struct"),
                create_statement(IR.create_instantiate_expression(IR.Instantiate_expression_type.Default, []))
            )
        ),
        create_statement(
            IR.create_variable_declaration_expression(
                "a",
                false,
                IR.create_access_expression(
                    IR.create_variable_expression("instance", IR.Access_type.Read),
                    "a",
                    IR.Access_type.Read
                )
            )
        )
    ];

    return {
        name: "Variable_declaration_inside_switch_case",
        imports: [
            {
                module_name: "Structs",
                alias: "my_external_module",
                usages: []
            }
        ],
        declarations: [
            {
                name: "run",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "run",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "run",
                        statements: statements
                    }
                }
            }
        ]
    };
}

export function create_call_of_function_of_imported_module(): IR.Module {

    const int32_type = create_integer_type(32, true);

    const statements: IR.Statement[] = [
        create_statement(
            IR.create_variable_declaration_expression(
                "result",
                false,
                IR.create_call_expression(
                    IR.create_access_expression(
                        IR.create_variable_expression("my_external_module", IR.Access_type.Read),
                        "add",
                        IR.Access_type.Read
                    ),
                    [
                        IR.create_constant_expression(int32_type, "1"),
                        IR.create_constant_expression(int32_type, "2"),
                    ]
                )
            )
        )
    ];

    return {
        name: "Call_of_imported_module_function",
        imports: [
            {
                module_name: "Add",
                alias: "my_external_module",
                usages: []
            }
        ],
        declarations: [
            {
                name: "run",
                type: IR.Declaration_type.Function,
                is_export: true,
                value: {
                    declaration: {
                        name: "run",
                        type: {
                            input_parameter_types: [],
                            output_parameter_types: [],
                            is_variadic: false,
                        },
                        input_parameter_names: [],
                        output_parameter_names: [],
                        linkage: IR.Linkage.External,
                        preconditions: [],
                        postconditions: [],
                    },
                    definition: {
                        name: "run",
                        statements: statements
                    }
                }
            }
        ]
    };
}

function create_constant_array_type(value_type: IR.Type_reference[], size: number): IR.Type_reference {
    return {
        data: {
            type: IR.Type_reference_enum.Constant_array_type,
            value: {
                value_type: value_type,
                size: size
            }
        }
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

function create_function_type(
    input_parameter_types: IR.Type_reference[],
    output_parameter_types: IR.Type_reference[],
    is_variadic: boolean,
): IR.Function_type {
    return {
        input_parameter_types: input_parameter_types,
        output_parameter_types: output_parameter_types,
        is_variadic: is_variadic,
    };
}

function create_function_pointer_type(type: IR.Function_type, input_parameter_names: string[], output_parameter_names: string[]): IR.Type_reference {
    return {
        data: {
            type: IR.Type_reference_enum.Function_pointer_type,
            value: {
                type: type,
                input_parameter_names: input_parameter_names,
                output_parameter_names: output_parameter_names,
            }
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

function create_statement(expression: IR.Expression, source_position?: IR.Source_position): IR.Statement {

    const statement: IR.Statement = {
        expression: expression
    };

    if (source_position !== undefined) {
        statement.expression.source_position = { line: source_position.line, column: source_position.column };
    }

    return statement;
}

function add_source_positions(
    statements: IR.Statement[],
    start_source_position: IR.Source_position,
    additional_new_lines: number[]
) {

    const current_source_location: IR.Source_position = {
        line: start_source_position.line,
        column: start_source_position.column
    };

    for (let index = 0; index < statements.length; index++) {
        statements[index].expression.source_position = {
            line: current_source_location.line,
            column: current_source_location.column
        };

        current_source_location.line += 1;

        if (additional_new_lines.includes(index)) {
            current_source_location.line += 1;
        }
    }
}
