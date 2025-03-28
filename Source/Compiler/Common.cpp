module;

#include <llvm/ADT/StringRef.h>
#include <llvm/IR/Function.h>
#include <llvm/IR/Module.h>

#include <filesystem>
#include <format>
#include <optional>
#include <string>
#include <string_view>
#include <span>

module h.compiler.common;

import h.core;

namespace h::compiler
{
    std::string_view to_string_view(llvm::StringRef const string)
    {
        return std::string_view{ string.data(), string.size() };
    }

    std::string mangle_name(
        std::string_view const module_name,
        std::string_view const declaration_name,
        std::optional<std::string_view> const unique_name
    )
    {
        if (unique_name.has_value())
            return std::string{ *unique_name };

        std::pmr::string module_name_prefix{module_name};
        std::replace(module_name_prefix.begin(), module_name_prefix.end(), '.', '_');

        return std::format("{}_{}", module_name_prefix, declaration_name);
    }

    std::string mangle_name(
        Module const& core_module,
        std::string_view const declaration_name,
        std::optional<std::string_view> const unique_name
    )
    {
        return mangle_name(core_module.name, declaration_name, unique_name);
    }

    std::string mangle_function_name(
        Module const& core_module,
        std::string_view const declaration_name
    )
    {
        std::optional<Function_declaration const*> function_declaration = find_function_declaration(core_module, declaration_name);
        if (!function_declaration.has_value())
            return mangle_name(core_module, declaration_name, std::nullopt);

        std::optional<std::pmr::string> const& unique_name = function_declaration.value()->unique_name;
        return mangle_name(core_module, declaration_name, unique_name);
    }

    std::string mangle_struct_name(
        Module const& core_module,
        std::string_view const declaration_name
    )
    {
        std::optional<Struct_declaration const*> struct_declaration = find_struct_declaration(core_module, declaration_name);
        if (!struct_declaration.has_value())
            return mangle_name(core_module, declaration_name, std::nullopt);

        std::optional<std::pmr::string> const& unique_name = struct_declaration.value()->unique_name;
        return mangle_name(core_module, declaration_name, unique_name);
    }

    std::string mangle_union_name(
        Module const& core_module,
        std::string_view const declaration_name
    )
    {
        std::optional<Union_declaration const*> union_declaration = find_union_declaration(core_module, declaration_name);
        if (!union_declaration.has_value())
            return mangle_name(core_module, declaration_name, std::nullopt);

        std::optional<std::pmr::string> const& unique_name = union_declaration.value()->unique_name;
        return mangle_name(core_module, declaration_name, unique_name);
    }

    llvm::Function* get_llvm_function(
        Module const& core_module,
        llvm::Module& llvm_module,
        std::string_view const name
    )
    {
        std::optional<Function_declaration const*> function_declaration = find_function_declaration(core_module, name);
        if (!function_declaration.has_value())
            return nullptr;

        std::optional<std::pmr::string> const& unique_name = function_declaration.value()->unique_name;

        std::string const mangled_name = mangle_name(core_module, name, unique_name);
        llvm::Function* const llvm_function = llvm_module.getFunction(mangled_name);
        return llvm_function;
    }
}
