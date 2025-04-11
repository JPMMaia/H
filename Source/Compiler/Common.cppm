module;

#include <llvm/ADT/StringRef.h>
#include <llvm/IR/Function.h>
#include <llvm/IR/Module.h>

#include <filesystem>
#include <optional>
#include <string>
#include <string_view>
#include <unordered_map>

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

    export std::string mangle_instance_call_name(
        Instance_call_key const& key
    );

    export llvm::Function* get_llvm_function(
        std::string_view const module_name,
        llvm::Module& llvm_module,
        std::string_view const name,
        std::optional<std::string_view> const unique_name
    );

    export llvm::Function* get_llvm_function(
        Module const& core_module,
        llvm::Module& llvm_module,
        std::string_view name
    );

    export h::Module const* get_module(
        std::string_view const module_name,
        h::Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, h::Module> const& core_module_dependencies
    );
}
