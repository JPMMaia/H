module;

#include <memory_resource>
#include <optional>
#include <span>
#include <string>
#include <unordered_map>
#include <vector>
#include <variant>

export module h.core.types;

import h.core;

namespace h
{
    export Type_reference create_bool_type_reference();
    export bool is_bool(Type_reference const& type);

    export Type_reference create_constant_array_type_reference(std::pmr::vector<Type_reference> value_type, std::uint64_t size);

    export Type_reference create_custom_type_reference(std::string_view module_name, std::string_view name);
    export bool is_custom_type_reference(Type_reference const& type);
    export void set_custom_type_reference_module_name_if_empty(Type_reference& type, std::string_view module_name);
    export Type_reference fix_custom_type_reference(Type_reference type, std::string_view module_name);

    export Type_reference create_function_type_type_reference(Function_type const& function_type);
    export std::optional<Type_reference> get_function_output_type_reference(Function_type const& function_type);
    export std::optional<Type_reference> get_function_output_type_reference(Type_reference const& type);

    export Type_reference create_fundamental_type_type_reference(Fundamental_type const value);
    export bool is_c_string(Type_reference const& type_reference);
    export bool is_floating_point(Type_reference const& type);

    export Type_reference create_integer_type_type_reference(std::uint32_t number_of_bits, bool is_signed);
    export bool is_integer(Type_reference const& type);
    export bool is_signed_integer(Type_reference const& type);
    export bool is_unsigned_integer(Type_reference const& type);

    export Type_reference create_pointer_type_type_reference(std::pmr::vector<Type_reference> element_type, bool const is_mutable);
    export std::optional<Type_reference> remove_pointer(Type_reference const& type);
    export bool is_pointer(Type_reference const& type);
    export bool is_non_void_pointer(Type_reference const& type);

    export template <typename Function_t>
        void visit_type_references(
            Type_reference const& type_reference,
            Function_t predicate
        )
    {
        predicate(type_reference);

        if (std::holds_alternative<Constant_array_type>(type_reference.data))
        {
            Constant_array_type const& data = std::get<Constant_array_type>(type_reference.data);
            for (Type_reference const& nested_type_reference : data.value_type)
                visit_type_references(nested_type_reference, predicate);
        }
        else if (std::holds_alternative<Function_type>(type_reference.data))
        {
            Function_type const& data = std::get<Function_type>(type_reference.data);
            for (Type_reference const& nested_type_reference : data.input_parameter_types)
                visit_type_references(nested_type_reference, predicate);
            for (Type_reference const& nested_type_reference : data.output_parameter_types)
                visit_type_references(nested_type_reference, predicate);
        }
        else if (std::holds_alternative<Pointer_type>(type_reference.data))
        {
            Pointer_type const& data = std::get<Pointer_type>(type_reference.data);
            for (Type_reference const& nested_type_reference : data.element_type)
                visit_type_references(nested_type_reference, predicate);
        }
    }
}
