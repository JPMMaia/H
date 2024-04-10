module;

#include <memory_resource>
#include <optional>
#include <string>
#include <unordered_map>
#include <variant>

export module h.compiler.declarations;

import h.core;

namespace h::compiler
{
    export struct Declaration
    {
        using Data_type = std::variant<
            Alias_type_declaration const*,
            Enum_declaration const*,
            Function_declaration const*,
            Struct_declaration const*,
            Union_declaration const*
        >;

        Data_type data;
    };

    using Module_name = std::pmr::string;
    using Declaration_map = std::pmr::unordered_map<std::pmr::string, Declaration>;

    export struct Declaration_database
    {
        std::pmr::unordered_map<Module_name, Declaration_map> map;
    };

    export Declaration_database create_declaration_database();

    export void add_declarations(
        Declaration_database& database,
        Module const& module
    );

    export std::optional<Declaration> find_declaration(
        Declaration_database const& database,
        std::string_view const module_name,
        std::string_view const declaration_name
    );

    export std::optional<Type_reference> get_underlying_type(
        Declaration_database const& declaration_database,
        std::string_view current_module_name,
        Type_reference const& type_reference
    );

    export std::optional<Type_reference> get_underlying_type(
        Declaration_database const& declaration_database,
        std::string_view current_module_name,
        Alias_type_declaration const& declaration
    );

    export std::optional<Declaration> get_underlying_declaration(
        Declaration_database const& declaration_database,
        std::string_view current_module_name,
        Alias_type_declaration const& declaration
    );
}
