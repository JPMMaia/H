module;

#include <llvm/IR/IRBuilder.h>

module h.compiler.instructions;

namespace h::compiler
{
    llvm::AllocaInst* create_alloca_instruction(
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Type* const llvm_type,
        std::string_view const name
    )
    {
        llvm::AllocaInst* const instruction = llvm_builder.CreateAlloca(llvm_type, nullptr, name.data());
        
        llvm::Align const type_alignment = llvm_data_layout.getABITypeAlign(llvm_type);
        instruction->setAlignment(type_alignment);

        return instruction;
    }

    llvm::LoadInst* create_load_instruction(
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Type* const llvm_type,
        llvm::Value* const pointer
    )
    {
        llvm::Align const type_alignment = llvm_data_layout.getABITypeAlign(llvm_type);
        llvm::LoadInst* const instruction = llvm_builder.CreateAlignedLoad(llvm_type, pointer, type_alignment);
        return instruction;
    }

    llvm::StoreInst* create_store_instruction(
        llvm::IRBuilder<>& llvm_builder,
        llvm::DataLayout const& llvm_data_layout,
        llvm::Value* const value,
        llvm::Value* const pointer
    )
    {
        llvm::Align const type_alignment = llvm_data_layout.getABITypeAlign(value->getType());
        llvm::StoreInst* const instruction = llvm_builder.CreateAlignedStore(value, pointer, type_alignment);
        return instruction;
    }
}
