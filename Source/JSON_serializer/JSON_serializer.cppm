module;

#include <cstddef>
#include <map>
#include <memory_resource>
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

export module h.json_serializer;

import h.core;

namespace h
{
    export using Json = nlohmann::basic_json<
        std::map,
        std::vector,
        std::string,
        bool,
        std::int64_t,
        std::uint64_t,
        double,
        std::allocator,
        nlohmann::adl_serializer,
        std::vector<std::byte>
    >;

    export Integer_type to_integer_type(Json const& json);

    export Float_type to_float_type(Json const& json);

    export Type to_type(Json const& json);

    export Variable_expression to_variable_expression(Json const& json);

    export Binary_expression to_binary_expression(Json const& json);

    export Call_expression to_call_expression(Json const& json, std::pmr::polymorphic_allocator<> const& allocator);

    export Integer_constant to_integer_constant(Json const& json);

    export Half_constant to_half_constant(Json const& json);

    export Float_constant to_float_constant(Json const& json);

    export Double_constant to_double_constant(Json const& json);

    export Constant_expression to_constant_expression(Json const& json);

    export Return_expression to_return_expression(Json const& json);

    export Expression to_expression(Json const& json, std::pmr::polymorphic_allocator<> const& allocator);

    export Statement to_statement(Json const& json, std::pmr::polymorphic_allocator<> const& allocator);

    export Function_type to_function_type(Json const& json, std::pmr::polymorphic_allocator<> const& allocator);

    export Function to_function(Json const& json, std::pmr::polymorphic_allocator<> const& allocator);
}
