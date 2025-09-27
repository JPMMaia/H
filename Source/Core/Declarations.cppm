module;

#include <functional>
#include <memory_resource>
#include <optional>
#include <string>
#include <span>
#include <unordered_map>
#include <variant>

export module h.core.declarations;

import h.core;
import h.core.hash;
import h.core.string_hash;

namespace h
{
    export struct Function
    {
        h::Function_declaration const* declaration;
        h::Function_definition const* definition;
    };

    export struct Declaration
    {
        using Data_type = std::variant<
            Alias_type_declaration const*,
            Enum_declaration const*,
            Function_constructor const*,
            Function_declaration const*,
            Global_variable_declaration const*,
            Struct_declaration const*,
            Type_constructor const*,
            Union_declaration const*
        >;

        Data_type data;
        std::pmr::string module_name;
    };

    export struct Declaration_instance_storage
    {
        using Data_type = std::variant<
            Alias_type_declaration,
            Enum_declaration,
            Function_declaration,
            Struct_declaration,
            Union_declaration
        >;

        Data_type data;
    };

    using Module_name = std::pmr::string;
    using Declaration_map = std::pmr::unordered_map<std::pmr::string, Declaration, String_hash, String_equal>;

    /*bool are_type_instances_equivalent(Type_instance const& lhs, Type_instance const& rhs);

    struct Are_type_instances_equivalent
    {
        bool operator()(Type_instance const& lhs, Type_instance const& rhs) const
        {
            return are_type_instances_equivalent(lhs, rhs);
        }
    };*/

    export struct Declaration_database
    {
        std::pmr::unordered_map<Module_name, Declaration_map, String_hash, String_equal> map;
        std::pmr::unordered_map<Type_instance, Declaration_instance_storage, Type_instance_hash> instances;
        std::pmr::unordered_map<Instance_call_key, Function_expression, Instance_call_key_hash> call_instances;
    };

    export Declaration_database create_declaration_database();

    export void add_declarations(
        Declaration_database& database,
        std::string_view const module_name,
        std::span<h::Alias_type_declaration const> alias_type_declarations,
        std::span<h::Enum_declaration const> enum_declarations,
        std::span<h::Global_variable_declaration const> global_variable_declarations,
        std::span<h::Struct_declaration const> struct_declarations,
        std::span<h::Union_declaration const> union_declarations,
        std::span<h::Function_declaration const> function_declarations,
        std::span<h::Function_constructor const> function_constructors,
        std::span<h::Type_constructor const> type_constructors
    );

    export void add_declarations(
        Declaration_database& database,
        Module const& core_module
    );

    export void add_instance_type_struct_declaration(
        Declaration_database& database,
        Type_instance const& type_instance,
        Struct_declaration const& struct_declaration
    );

    export std::optional<Declaration> find_declaration(
        Declaration_database const& database,
        std::string_view const module_name,
        std::string_view const declaration_name
    );

    export std::optional<Declaration> find_declaration(
        Declaration_database const& database,
        Type_reference const& type_reference
    );

    export std::optional<Declaration> find_underlying_declaration(
        Declaration_database const& database,
        std::string_view const module_name,
        std::string_view const declaration_name
    );

    export std::optional<Declaration> find_underlying_declaration(
        Declaration_database const& database,
        Type_reference const& type_reference
    );

    export std::optional<Declaration> find_declaration_using_import_alias(
        Declaration_database const& database,
        h::Module const& core_module,
        std::string_view const import_alias_name,
        std::string_view const declaration_name
    );

    export std::optional<Declaration> find_underlying_declaration_using_import_alias(
        Declaration_database const& database,
        h::Module const& core_module,
        std::string_view const import_alias_name,
        std::string_view const declaration_name
    );

    export std::optional<Type_reference> get_underlying_type(
        Declaration_database const& declaration_database,
        Type_reference const& type_reference
    );

    export std::optional<Type_reference> get_underlying_type(
        Declaration_database const& declaration_database,
        std::optional<Type_reference> const& type_reference
    );

    export std::optional<Type_reference> get_underlying_type(
        Declaration_database const& declaration_database,
        Alias_type_declaration const& declaration
    );

    export std::optional<Declaration> get_underlying_declaration(
        Declaration_database const& declaration_database,
        Declaration const& declaration
    );

    export std::optional<Declaration> get_underlying_declaration(
        Declaration_database const& declaration_database,
        Alias_type_declaration const& declaration
    );

    Declaration_instance_storage instantiate_type_instance(
        Declaration_database& declaration_database,
        Type_instance const& type_instance
    );

    export std::pmr::string mangle_type_instance_name(
        Type_instance const& type_instance
    );

    export void add_instantiated_type_instances(
        Declaration_database& declaration_database,
        h::Module const& core_module
    );

    export void add_instantiated_type_instances(
        Declaration_database& declaration_database,
        h::Function_expression const& function_expression
    );

    export std::optional<Custom_type_reference> get_function_constructor_type_reference(
        Declaration_database const& declaration_database,
        Expression const& expression,
        Statement const& statement,
        std::string_view const current_module_name
    );

    export Instance_call_key create_instance_call_key(
        Declaration_database const& declaration_database,
        Instance_call_expression const& expression,
        Statement const& statement,
        std::string_view const current_module_name
    );

    export Function_constructor const* get_function_constructor(
        Declaration_database const& declaration_database,
        Custom_type_reference const& custom_type_reference
    );

    export Function_constructor const* get_function_constructor(
        Declaration_database const& declaration_database,
        Expression const& expression,
        Statement const& statement,
        std::string_view const current_module_name
    );

    export Function_expression const* get_instance_call_function_expression(
        Declaration_database const& declaration_database,
        Instance_call_key const& key
    );

    export std::string mangle_instance_call_name(
        Instance_call_key const& key
    );

    export Function_expression create_instance_call_expression_value(
        Function_constructor const& function_constructor,
        std::span<Statement const> const arguments,
        Instance_call_key const& key
    );

    std::pair<Instance_call_key, Function_expression> create_instance_call_expression_value(
        Declaration_database& declaration_database,
        Instance_call_expression const& expression,
        Statement const& statement,
        std::string_view const current_module_name
    );

    export void add_instance_call_expression_values(
        Declaration_database& declaration_database,
        h::Module const& core_module
    );

    export std::string_view get_declaration_name(
        Declaration const& declaration
    );

    export std::optional<h::Source_range_location> get_declaration_source_location(
        Declaration const& declaration
    );

    export void visit_declarations(
        Declaration_database const& database,
        std::string_view const module_name,
        std::function<bool(Declaration const& declaration)> const& visitor
    );

    export bool is_enum_type(
        Declaration_database const& database,
        Type_reference const& type
    );
}
