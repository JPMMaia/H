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
        Module const& core_module,
        std::string_view const declaration_name,
        std::optional<std::string_view> const unique_name
    )
    {
        if (unique_name.has_value())
            return std::string{ *unique_name };

        std::pmr::string module_name = core_module.name;
        std::replace(module_name.begin(), module_name.end(), '.', '_');

        return std::format("{}_{}", module_name, declaration_name);
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

    template<typename T>
    concept Has_name = requires(T a)
    {
        { a.name } -> std::convertible_to<std::pmr::string>;
    };

    template<Has_name Type>
    Type const* get_value(
        std::string_view const name,
        std::span<Type const> const values
    )
    {
        auto const location = std::find_if(values.begin(), values.end(), [name](Type const& value) { return value.name == name; });
        return location != values.end() ? *location : nullptr;
    }

    template<Has_name Type>
    std::optional<Type const*> get_value(
        std::string_view const name,
        std::pmr::vector<Type> const& span_0,
        std::pmr::vector<Type> const& span_1
    )
    {
        auto const find_declaration = [name](Type const& declaration) -> bool { return declaration.name == name; };

        {
            auto const location = std::find_if(span_0.begin(), span_0.end(), find_declaration);
            if (location != span_0.end())
                return &(*location);
        }

        {
            auto const location = std::find_if(span_1.begin(), span_1.end(), find_declaration);
            if (location != span_1.end())
                return &(*location);
        }

        return std::nullopt;
    }

    std::optional<Alias_type_declaration const*> find_alias_type_declaration(Module const& module, std::string_view const name)
    {
        return get_value(name, module.export_declarations.alias_type_declarations, module.internal_declarations.alias_type_declarations);
    }

    std::optional<Enum_declaration const*> find_enum_declaration(Module const& module, std::string_view const name)
    {
        return get_value(name, module.export_declarations.enum_declarations, module.internal_declarations.enum_declarations);
    }

    std::optional<Global_variable_declaration const*> find_global_variable_declaration(Module const& module, std::string_view name)
    {
        return get_value(name, module.export_declarations.global_variable_declarations, module.internal_declarations.global_variable_declarations);
    }

    std::optional<Function_declaration const*> find_function_declaration(Module const& module, std::string_view const name)
    {
        return get_value(name, module.export_declarations.function_declarations, module.internal_declarations.function_declarations);
    }

    std::optional<Struct_declaration const*> find_struct_declaration(Module const& module, std::string_view const name)
    {
        return get_value(name, module.export_declarations.struct_declarations, module.internal_declarations.struct_declarations);
    }

    std::optional<Union_declaration const*> find_union_declaration(Module const& module, std::string_view const name)
    {
        return get_value(name, module.export_declarations.union_declarations, module.internal_declarations.union_declarations);
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
