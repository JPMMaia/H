module;

#include <llvm/ADT/StringRef.h>
#include <llvm/IR/Function.h>
#include <llvm/IR/Module.h>

#include <format>
#include <optional>
#include <string>
#include <string_view>

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
        Mangle_name_strategy const strategy
    )
    {
        switch (strategy)
        {
        case Mangle_name_strategy::Only_declaration_name:
            return std::string{ declaration_name.begin(), declaration_name.end() };
        case Mangle_name_strategy::Module_and_declaration_name:
        default:
            return std::format("{}_{}", module_name, declaration_name);
        }
    }

    std::string mangle_name(
        Module const& core_module,
        std::string_view const declaration_name
    )
    {
        // TODO decide which strategy to use per module?
        Mangle_name_strategy const mangle_strategy = Mangle_name_strategy::Only_declaration_name;
        std::string mangled_name = mangle_name(core_module.name, declaration_name, mangle_strategy);
        return mangled_name;
    }

    std::optional<Function_declaration const*> find_function_declaration(Module const& module, std::string_view const name)
    {
        auto const find_declaration = [name](Function_declaration const& declaration) { return declaration.name == name; };

        {
            auto const location = std::find_if(module.export_declarations.function_declarations.begin(), module.export_declarations.function_declarations.end(), find_declaration);
            if (location != module.export_declarations.function_declarations.end())
                return &(*location);
        }

        {
            auto const location = std::find_if(module.internal_declarations.function_declarations.begin(), module.internal_declarations.function_declarations.end(), find_declaration);
            if (location != module.internal_declarations.function_declarations.end())
                return &(*location);
        }

        return {};
    }

    llvm::Function* get_llvm_function(
        Module const& core_module,
        llvm::Module& llvm_module,
        std::string_view const name
    )
    {
        std::string const mangled_name = mangle_name(core_module, name);
        llvm::Function* const llvm_function = llvm_module.getFunction(mangled_name);
        return llvm_function;
    }
}
