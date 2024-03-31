module;

#include <llvm/ADT/StringRef.h>
#include <llvm/IR/Function.h>
#include <llvm/IR/Module.h>

#include <optional>
#include <string>
#include <string_view>

export module h.compiler.common;

import h.core;

namespace h::compiler
{
    export std::string_view to_string_view(llvm::StringRef const string);

    export enum class Mangle_name_strategy
    {
        Only_declaration_name,
        Module_and_declaration_name
    };

    export std::string mangle_name(
        std::string_view module_name,
        std::string_view declaration_name,
        Mangle_name_strategy strategy
    );

    export std::string mangle_name(
        Module const& core_module,
        std::string_view declaration_name
    );

    export std::optional<Alias_type_declaration const*> find_alias_type_declaration(Module const& module, std::string_view name);
    export std::optional<Enum_declaration const*> find_enum_declaration(Module const& module, std::string_view name);
    export std::optional<Function_declaration const*> find_function_declaration(Module const& module, std::string_view name);
    export std::optional<Struct_declaration const*> find_struct_declaration(Module const& module, std::string_view name);

    export llvm::Function* get_llvm_function(
        Module const& core_module,
        llvm::Module& llvm_module,
        std::string_view name
    );
}
