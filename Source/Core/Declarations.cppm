module;

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

    export struct Declaration_database
    {
        std::pmr::unordered_map<Module_name, Declaration_map, String_hash, String_equal> map;
        std::pmr::unordered_map<Type_instance, Declaration_instance_storage, Type_instance_hash> instances;
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
        Module const& module
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

    export std::optional<Type_reference> get_underlying_type(
        Declaration_database const& declaration_database,
        Type_reference const& type_reference,
        Module const& current_core_module,
        std::pmr::unordered_map<std::pmr::string, Module> const& core_module_dependencies
    );

    export std::optional<Type_reference> get_underlying_type(
        Declaration_database const& declaration_database,
        Alias_type_declaration const& declaration,
        Module const& current_core_module,
        std::pmr::unordered_map<std::pmr::string, Module> const& core_module_dependencies
    );

    export std::optional<Declaration> get_underlying_declaration(
        Declaration_database const& declaration_database,
        Declaration const& declaration,
        Module const& current_core_module,
        std::pmr::unordered_map<std::pmr::string, Module> const& core_module_dependencies
    );

    export std::optional<Declaration> get_underlying_declaration(
        Declaration_database const& declaration_database,
        Alias_type_declaration const& declaration,
        Module const& current_core_module,
        std::pmr::unordered_map<std::pmr::string, Module> const& core_module_dependencies
    );
}
