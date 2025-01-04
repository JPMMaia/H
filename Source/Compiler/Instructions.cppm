module;

#include <llvm/IR/IRBuilder.h>

export module h.compiler.instructions;

import h.core;

namespace h::compiler
{
    export struct Value_and_type
    {
        std::pmr::string name;
        llvm::Value* value;
        std::optional<h::Type_reference> type;
    };

    export llvm::AllocaInst* create_alloca_instruction(
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Type* const llvm_type,
        std::string_view const name = ""
    );

    export llvm::LoadInst* create_load_instruction(
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Type* const llvm_type,
        llvm::Value* const pointer
    );

    export llvm::StoreInst* create_store_instruction(
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Value* const value,
        llvm::Value* const pointer
    );

    export llvm::Value* create_memcpy_call(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Module& llvm_module,
        llvm::Value* const destination_pointer,
        llvm::Value* const source_pointer,
        unsigned const size_in_bits,
        llvm::Align const alignment = {}
    );

    export llvm::Value* create_memset_to_0_call(
        llvm::IRBuilder<>& llvm_builder,
        llvm::Value* const destination_pointer,
        std::uint64_t const type_alloc_size_in_bytes,
        llvm::MaybeAlign const alignment
    );
}
