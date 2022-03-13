module;

#include <memory_resource>

#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Module.h>

export module h.compiler;

import h.core;

namespace h::compiler
{
    export llvm::Function& create_function(
        llvm::LLVMContext& llvm_context,
        llvm::Module& llvm_module,
        Function const& function,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );
}
