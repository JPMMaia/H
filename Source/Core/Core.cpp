module;

#include <cstdint>
#include <compare>
#include <exception>
#include <filesystem>
#include <memory_resource>
#include <optional>
#include <ostream>
#include <span>
#include <string>
#include <unordered_map>
#include <variant>
#include <vector>

module h.core;

import h.common;

namespace h
{
    Module const& find_module(
        Module const& core_module,
        std::span<Module const> const core_module_dependencies,
        std::string_view const name
    )
    {
        if (core_module.name == name)
            return core_module;

        auto const location = std::find_if(
            core_module_dependencies.begin(),
            core_module_dependencies.end(),
            [name](Module const& core_module_dependency) { return core_module_dependency.name == name; }
        );

        if (location != core_module_dependencies.end())
            return *location;

        h::common::print_message_and_exit(std::format("Could not find module '{}'", name));
    }

    std::string_view find_module_name(
        Module const& core_module,
        Module_reference const& module_reference
    )
    {
        if (module_reference.name == "" || module_reference.name == core_module.name)
            return core_module.name;

        auto const location = std::find_if(
            core_module.dependencies.alias_imports.begin(),
            core_module.dependencies.alias_imports.end(),
            [&module_reference](Import_module_with_alias const& alias_import) { return alias_import.alias == module_reference.name; }
        );

        if (location == core_module.dependencies.alias_imports.end())
            h::common::print_message_and_exit(std::format("Could not find import alias '{}' in module '{}'", module_reference.name, core_module.name));

        return location->module_name;
    }
}