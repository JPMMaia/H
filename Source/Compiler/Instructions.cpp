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
        // If the value is not sized, we cannot create alloca for it.
        if (!llvm_type->isSized())
            return nullptr;

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
        // If the value is not sized, we cannot load it.
        if (!llvm_type->isSized())
            return nullptr;

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
        // If the value is not sized, we cannot store it.
        if (!value->getType()->isSized())
            return nullptr;

        llvm::Align const type_alignment = llvm_data_layout.getABITypeAlign(value->getType());
        llvm::StoreInst* const instruction = llvm_builder.CreateAlignedStore(value, pointer, type_alignment);
        return instruction;
    }

    llvm::Value* create_memcpy_call(
        llvm::LLVMContext& llvm_context,
        llvm::IRBuilder<>& llvm_builder,
        llvm::Module& llvm_module,
        llvm::Value* const destination_pointer,
        llvm::Value* const source_pointer,
        unsigned const size_in_bits,
        llvm::Align const alignment
    )
    {
        if (size_in_bits == 0)
            return nullptr;

        llvm::Type* const int64_type = llvm::Type::getInt64Ty(llvm_context);
        llvm::Type* const int1_type = llvm::Type::getInt1Ty(llvm_context);
        llvm::Type* const pointer_type = llvm::PointerType::get(llvm::Type::getInt8Ty(llvm_context), 0);
        llvm::Function* const memcpy_function = llvm::Intrinsic::getDeclaration(&llvm_module, llvm::Intrinsic::memcpy, {pointer_type, pointer_type, int64_type});

        llvm::Value* const size = llvm::ConstantInt::get(int64_type, size_in_bits);
        llvm::Value* const is_volatile = llvm::ConstantInt::get(int1_type, 0);

        llvm::CallInst* const call = llvm_builder.CreateCall(memcpy_function, {destination_pointer, source_pointer, size, is_volatile});    
        if (alignment != llvm::Align{})
        {
            call->addParamAttr(0, llvm::Attribute::getWithAlignment(llvm_context, alignment));
            call->addParamAttr(1, llvm::Attribute::getWithAlignment(llvm_context, alignment));
        }
        
        return call;
    }

    llvm::Value* create_memset_to_0_call(
        llvm::IRBuilder<>& llvm_builder,
        llvm::Value* const destination_pointer,
        std::uint64_t const type_alloc_size_in_bytes,
        llvm::MaybeAlign const alignment
    )
    {
        llvm::Value* const zero_value = llvm_builder.getInt8(0);
        bool const is_volatile = false;

        return llvm_builder.CreateMemSet(destination_pointer, zero_value, type_alloc_size_in_bytes, alignment, is_volatile);
    }
}
