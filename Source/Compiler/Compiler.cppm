module;

#include <memory_resource>
#include <string_view>

#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Module.h>

export module h.compiler;

import h.core;

namespace h::compiler
{
    export llvm::Function& create_function_declaration(
        llvm::LLVMContext& llvm_context,
        Function_declaration const& function_declaration,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    export void create_function_definition(
        llvm::LLVMContext& llvm_context,
        llvm::Module const& llvm_module,
        llvm::Function& llvm_function,
        Function_declaration const& function_declaration,
        Function_definition const& function_definition,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    export void add_module_declarations(
        llvm::LLVMContext& llvm_context,
        llvm::Module& llvm_module,
        Module_declarations const& module_declarations,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    export void add_module_definitions(
        llvm::LLVMContext& llvm_context,
        llvm::Module& llvm_module,
        Module_declarations const& module_declarations,
        Module_definitions const& module_definitions,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    export void generate_code(
        std::string_view const output_filename,
        llvm::Module& llvm_module
    );
}
