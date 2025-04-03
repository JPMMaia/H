module;

#include <llvm/ADT/StringRef.h>
#include <llvm/IR/Function.h>
#include <llvm/IR/Module.h>

#include <filesystem>
#include <optional>
#include <string>
#include <string_view>

export module h.compiler.common;

import h.core;

namespace h::compiler
{
    export std::string_view to_string_view(llvm::StringRef const string);

    export std::string mangle_name(
        std::string_view const module_name,
        std::string_view const declaration_name,
        std::optional<std::string_view> const unique_name
    );

    export std::string mangle_name(
        Module const& core_module,
        std::string_view declaration_name,
        std::optional<std::string_view> unique_name
    );

    export std::string mangle_function_name(
        Module const& core_module,
        std::string_view declaration_name
    );

    export std::string mangle_struct_name(
        Module const& core_module,
        std::string_view declaration_name
    );

    export std::string mangle_union_name(
        Module const& core_module,
        std::string_view declaration_name
    );

    export std::optional<Alias_type_declaration const*> find_alias_type_declaration(Module const& module, std::string_view name);
    export std::optional<Enum_declaration const*> find_enum_declaration(Module const& module, std::string_view name);
    export std::optional<Function_declaration const*> find_function_declaration(Module const& module, std::string_view name);
    export std::optional<Global_variable_declaration const*> find_global_variable_declaration(Module const& module, std::string_view name);
    export std::optional<Struct_declaration const*> find_struct_declaration(Module const& module, std::string_view name);
    export std::optional<Union_declaration const*> find_union_declaration(Module const& module, std::string_view name);

    export llvm::Function* get_llvm_function(
        Module const& core_module,
        llvm::Module& llvm_module,
        std::string_view name
    );
}
