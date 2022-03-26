module;

#include <nlohmann/json.hpp>

#include <format>
#include <memory_resource>
#include <string>
#include <type_traits>
#include <variant>
#include <vector>

module h.json_serializer;

import h.core;

namespace h
{
    namespace
    {
        template<typename To_type>
        auto to()
        {
            return [](Json const& json) -> To_type
            {
                return json.get<To_type>();
            };
        }

        auto to_string(std::pmr::polymorphic_allocator<> const& allocator)
        {
            return [&allocator](Json const& json) -> std::pmr::string
            {
                std::string const& value = json.get<std::string>();

                return std::pmr::string{ value.begin(), value.end(), allocator };
            };
        }

        template<typename Map_function>
        auto to_vector(
            Map_function&& map,
            std::pmr::polymorphic_allocator<> const& allocator
        )
        {
            using Value_type = std::invoke_result<Map_function, Json const&>::type;

            return[map, &allocator](Json const& json)->std::pmr::vector<Value_type>
            {
                std::pmr::vector<Value_type> values{ allocator };
                values.reserve(json.size());

                for (Json const& value_json : json)
                {
                    values.push_back(map(value_json));
                }

                return values;
            };
        }

        template<typename Map_function>
        auto bind_allocator(
            Map_function&& map,
            std::pmr::polymorphic_allocator<> const& allocator
        )
        {
            using Value_type = std::invoke_result<Map_function, Json const&, std::pmr::polymorphic_allocator<> const&>::type;

            return [map, &allocator](Json const& json) -> Value_type
            {
                return map(json, allocator);
            };
        }
    }

    Integer_type to_integer_type(Json const& json)
    {
        return
        {
            .precision = json.at("precision").get<std::uint8_t>(),
        };
    }

    Float_type to_float_type(Json const& json)
    {
        return
        {
            .precision = json.at("precision").get<std::uint8_t>(),
        };
    }

    Type to_type(Json const& json)
    {
        std::pmr::string const& data_type = json.at("type");
        Json const& data_json = json.at("data");

        if (data_type == "float_type")
        {
            return Type{ .data = to_float_type(data_json) };
        }
        else if (data_type == "integer_type")
        {
            return Type{ .data = to_integer_type(data_json) };
        }
        else
        {
            throw std::runtime_error{ "Data type not known!" };
        }
    }

    NLOHMANN_JSON_SERIALIZE_ENUM(
        Variable_expression::Type,
        {
            {Variable_expression::Type::Function_argument, "function_argument"},
            {Variable_expression::Type::Local_variable, "local_variable"},
            {Variable_expression::Type::Temporary, "temporary"},
        }
    );

    Variable_expression to_variable_expression(Json const& json)
    {
        return
        {
            .type = json.at("type").get<Variable_expression::Type>(),
            .id = json.at("id").get<std::uint64_t>()
        };
    }

    NLOHMANN_JSON_SERIALIZE_ENUM(
        Binary_expression::Operation,
        {
            {Binary_expression::Operation::Add, "add"},
            {Binary_expression::Operation::Subtract, "subtract"},
            {Binary_expression::Operation::Multiply, "multiply"},
            {Binary_expression::Operation::Signed_divide, "signed_divide"},
            {Binary_expression::Operation::Unsigned_divide, "unsigned_divide"},
            {Binary_expression::Operation::Less_than, "less_than"},
        }
    );

    Binary_expression to_binary_expression(Json const& json)
    {
        return
        {
            .left_hand_side = to_variable_expression(json.at("left_hand_side")),
            .right_hand_side = to_variable_expression(json.at("right_hand_side")),
            .operation = json.at("operation").get<Binary_expression::Operation>(),
        };
    }

    Call_expression to_call_expression(
        Json const& json,
        std::pmr::polymorphic_allocator<> const& allocator
    )
    {
        return
        {
            .function_name = to_string(allocator)(json.at("function_name")),
            .arguments = to_vector(to_variable_expression, allocator)(json.at("arguments")),
        };
    }

    Integer_constant to_integer_constant(Json const& json)
    {
        return
        {
            .number_of_bits = json.at("number_of_bits").get<unsigned int>(),
            .is_signed = json.at("is_signed").get<bool>(),
            .value = json.at("value").get<std::uint64_t>(),
        };
    }

    Half_constant to_half_constant(Json const& json)
    {
        return
        {
            .value = json.at("value").get<float>(),
        };
    }

    Float_constant to_float_constant(Json const& json)
    {
        return
        {
            .value = json.at("value").get<float>(),
        };
    }

    Double_constant to_double_constant(Json const& json)
    {
        return
        {
            .value = json.at("value").get<double>(),
        };
    }

    Constant_expression to_constant_expression(Json const& json)
    {
        Type const type = to_type(json.at("type"));

        if (std::holds_alternative<Float_type>(type.data))
        {
            Float_type const& type_data = std::get<Float_type>(type.data);

            if (type_data.precision == 16)
            {
                return
                {
                    .type = type,
                    .data = to_half_constant(json.at("data")),
                };
            }
            else if (type_data.precision == 32)
            {
                return
                {
                    .type = type,
                    .data = to_float_constant(json.at("data")),
                };
            }
            else if (type_data.precision == 64)
            {
                return
                {
                    .type = type,
                    .data = to_double_constant(json.at("data")),
                };
            }
            else
            {
                throw std::runtime_error{ "Data type is not known!" };
            }
        }
        else if (std::holds_alternative<Integer_type>(type.data))
        {
            return
            {
                .type = type,
                .data = to_integer_constant(json.at("data")),
            };
        }
        else
        {
            throw std::runtime_error{ "Data type is not known!" };
        }
    }

    Return_expression to_return_expression(Json const& json)
    {
        return
        {
            .variable = to_variable_expression(json.at("variable")),
        };
    }

    Expression to_expression(
        Json const& json,
        std::pmr::polymorphic_allocator<> const& allocator
    )
    {
        std::pmr::string const& data_type = json.at("type");
        Json const& data_json = json.at("data");

        if (data_type == "binary_expression")
        {
            return Expression{ .data = to_binary_expression(data_json) };
        }
        else if (data_type == "call_expression")
        {
            return Expression{ .data = to_call_expression(data_json, allocator) };
        }
        else if (data_type == "constant_expression")
        {
            return Expression{ .data = to_constant_expression(data_json) };
        }
        else if (data_type == "return_expression")
        {
            return Expression{ .data = to_return_expression(data_json) };
        }
        else if (data_type == "variable_expression")
        {
            return Expression{ .data = to_variable_expression(data_json) };
        }
        else
        {
            throw std::runtime_error{ "Data type not known!" };
        }
    }

    Statement to_statement(
        Json const& json,
        std::pmr::polymorphic_allocator<> const& allocator
    )
    {
        return
        {
            .id = json.at("id").get<std::uint64_t>(),
            .name = to_string(allocator)(json.at("name")),
            .expressions = to_vector(bind_allocator(to_expression, allocator), allocator)(json.at("expressions")),
        };
    }

    Function_type to_function_type(
        Json const& json,
        std::pmr::polymorphic_allocator<> const& allocator
    )
    {
        return
        {
            .return_type = to_type(json.at("return_type")),
            .parameter_types = to_vector(to_type, allocator)(json.at("parameter_types")),
        };
    }

    NLOHMANN_JSON_SERIALIZE_ENUM(
        Linkage,
        {
            {Linkage::External, "external"},
            {Linkage::Private, "private"},
        }
    );

    Function to_function(
        Json const& json,
        std::pmr::polymorphic_allocator<> const& allocator
    )
    {
        return
        {
            .type = to_function_type(json.at("type"), allocator),
            .name = to_string(allocator)(json.at("name")),
            .argument_ids = to_vector(to<std::uint64_t>(), allocator)(json.at("argument_ids")),
            .argument_names = to_vector(to_string(allocator), allocator)(json.at("argument_names")),
            .linkage = json.at("linkage").get<Linkage>(),
            .statements = to_vector(bind_allocator(to_statement, allocator), allocator)(json.at("statements")),
        };
    }
}
